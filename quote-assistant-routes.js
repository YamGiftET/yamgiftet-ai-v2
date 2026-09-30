const express = require("express");
const { db } = require("./firebase");
const bibleSource = require("./bible-source-engine");

const router = express.Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const QUOTE_COLLECTION = "quoteAssistant";

const QUOTE_FREE_MODELS = [
    "google/gemma-4-31b-it:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
];


const QUOTE_SYSTEM_PROMPT = `
አንተ YamGiftET Quote Assistant ነህ።
ስራህ ምርጥ፣ ልዩ፣ ተፈጥሯዊ እና ስሜት የሚነካ የአማርኛ ጥቅስ ብቻ ማመንጨት ነው።

ዋና መስፈርቶች፦
- ጥቅሱ አዲስና ልዩ መሆን አለበት።
- ተፈጥሯዊ እና ግልጽ አማርኛ ተጠቀም።
- ስሜት፣ ትዝታ፣ ፍቅር፣ ምስጋና ወይም የግንኙነት ጥልቀት ይኑረው።
- ለስጦታ እና ለEpoxy Frame ላይ ለመጠቀም የሚመች ይሁን።
- የተለመዱ እና ባዶ አባባሎችን አትድገም።
- ከሌሎች ጥቅሶች ጋር ተመሳሳይ ሐሳብ እንኳን በተቻለ መጠን አትድገም።
- ማንኛውም ዝቅተኛ ጥራት ያለው ጥቅስ አታቅርብ።

መልስህ JSON ብቻ ይሁን።

እጅግ አስፈላጊ፦ በuser message ውስጥ የተሰጠህ የተወሰነ ምድብ ካለ፣ ጥቅሱ ያንኑ ምድብ በጥብቅ መወከል አለበት። ወደ ሌላ ምድብ አትለውጠው።
- Love → የፍቅር ስሜት
- Birthday → ልደት
- Gift → ስጦታ
- Thanks → ምስጋና
- Family → ቤተሰብ
- Friendship → ወዳጅነት
- Memories → ትዝታ
- Happiness → ደስታ
- Spiritual → መንፈሳዊ ይዘት

ጥቅሱን ከመመለስህ በፊት በአእምሮህ እነዚህን ፈትሽ፦ ምድብ ተገቢነት፣ ተፈጥሯዊ አማርኛ፣ ሰዋሰው፣ ግልጽ ትርጉም፣ ስሜታዊ ጥልቀት፣ አዲስነት፣ ለEpoxy Frame ተስማሚነት። ከእነዚህ በአንዱ ከባድ ችግር ካለ ጥቅሱን እንደገና አስተካክል።

score ከ0-100 ይሁን።
90 በታች የሆነ ጥቅስ እንደ ምርጥ አትቆጥር።
ፍቅር → ❤️
ልደት → 🎂
ስጦታ → 🎁
ምስጋና → 🙏
ቤተሰብ → 👨‍👩‍👧‍👦
ወዳጅነት → 🤝
ትዝታ → 🌹
ደስታ → 😊
ከጥቅሱ ይዘት ጋር የሚስማማውን ምረጥ።
`;

async function generateQuote(category = "Love") {
    if (!OPENROUTER_API_KEY) {
        throw new Error("OpenRouter API key is missing");
    }

    const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "YamGiftET Quote Assistant"
            },
            body: JSON.stringify({
                models: ["google/gemma-4-31b-it:free", "nvidia/nemotron-3-ultra-550b-a55b:free", "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"],
                messages: [
                    {
                        role: "system",
                        content: QUOTE_SYSTEM_PROMPT
                    },
                    {
                        role: "user",
                        content: `አሁን በ"${category}" ምድብ ላይ የተመሠረተ፣ ለYam Gift epoxy frame ተስማሚ የሆነ እጅግ ምርጥ እና ልዩ ጥቅስ አመንጭ።`
                    }
                ]
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        const error = new Error(
            data?.error?.message || "Quote AI request failed"
        );
        error.status = response.status;
        error.code = data?.error?.code || null;
        error.rateLimit = data?.error?.metadata?.limit_source || null;
        error.rateLimitReset = data?.error?.metadata?.headers?.["X-RateLimit-Reset"] || null;
        throw error;
    }

    const content = data?.choices?.[0]?.message?.content || "";

    let parsed;

    try {
        const cleaned = content
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

        parsed = JSON.parse(cleaned);
    } catch {
        throw new Error("Quote AI returned invalid JSON");
    }

    const quote = String(parsed.quote || "").trim();
    const score = Number(parsed.score || 0);
    const emoji = String(parsed.emoji || "💬").trim();

    if (!quote || score < 90) {
        return null;
    }

    return {
        quote,
        score,
        emoji,
        model: data?.model || null
    };
}



async function requestQuoteBatchWithFallback(category, count, source = "user", topic = "") {
    let lastError = null;

    for (const model of QUOTE_FREE_MODELS) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 12000);

            let response;
            try {
                response = await fetch(
                    "https://openrouter.ai/api/v1/chat/completions",
                    {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost:3000",
                        "X-Title": "YamGiftET Quote Assistant"
                    },
                    signal: controller.signal,
                    body: JSON.stringify({
                        model,
                                                    max_tokens: 2000,
                        messages: [
                            {
                                role: "system",
                                content: `አንተ YamGiftET Quote Assistant ነህ።
ለYam Gift epoxy frame የሚመቹ ከፍተኛ ጥራት ያላቸው የአማርኛ ጥቅሶችን አመንጭ።
ተፈጥሯዊ፣ ግልጽ፣ ልዩ፣ ስሜት የሚነካ እና ለframe የሚመች አማርኛ ተጠቀም።
ከተጠየቀው ቁጥር በታች አትመልስ።
እያንዳንዱን ጥቅስ 90 ወይም ከዚያ በላይ አድርግ።
መልስህ JSON array ብቻ ይሁን፦
[
  {
    "quote": "ጥቅሱ",
    "score": 95,
    "emoji": "❤️",
    "category": "AI የመረጠው ምድብ"
  }
]
emoji አንድ ብቻ ይሁን።`
                            },
                            {
                                role: "user",
                                content: source === "ai"
    ? `በ"${category}" ምድብ ላይ ብቻ የተመሠረቱ ${count} ልዩ፣ ተፈጥሯዊ፣ ግልጽ እና ለYam Gift epoxy frame ተስማሚ የአማርኛ ጥቅሶችን አመንጭ። ሌላ ምድብ አትጠቀም። እያንዳንዱ ጥቅስ በ"${category}" ምድብ ላይ በግልጽ ይመስረት። የ"category" መስኩ ዋጋ "${category}" ብቻ ይሁን።`
    : `በ"${topic || category}" ላይ የተመሠረቱ ${count} ልዩ የአማርኛ ጥቅሶች አመንጭ።`
                            }
                        ]
                    })
                }
            );
            } finally {
                clearTimeout(timeout);
            }

            if (!response) {
                throw new Error("Quote AI request returned no response");
            }

            const data = await response.json();

            if (response.ok) {
                const content =
                    data?.choices?.[0]?.message?.content;

                if (!content || typeof content !== "string" || !content.trim()) {
                    throw new Error("Quote AI returned empty content");
                }

                const cleaned = content
                    .replace(/```json/gi, "")
                    .replace(/```/g, "")
                    .trim();

                let validationParsed;

                try {
                    validationParsed = JSON.parse(cleaned);
                } catch {
                    throw new Error("Quote AI returned invalid JSON");
                }

                if (
                    !Array.isArray(validationParsed) ||
                    validationParsed.length < count
                ) {
                    throw new Error(
                        `Quote AI returned fewer than ${count} quotes`
                    );
                }
            }

            if (!response.ok) {
                const error = new Error(
                    data?.error?.message || "Quote AI request failed"
                );

                error.status = response.status;
                error.code = data?.error?.code || null;
                error.rateLimit =
                    data?.error?.metadata?.limit_source || null;
                error.rateLimitReset =
                    data?.error?.metadata?.headers?.["X-RateLimit-Reset"] || null;

                throw error;
            }

            return {
                data,
                model
            };
        } catch (error) {
            if (error?.name === "AbortError") {
                error.status = 504;
                error.code = "QUOTE_AI_TIMEOUT";
                error.message = "Quote AI model request timed out";
            }

            console.warn(
                `Quote AI FREE model failed: ${model}`,
                {
                    status: error?.status || null,
                    code: error?.code || null,
                    message: error?.message || "Unknown error"
                }
            );

            lastError = error;
        }
    }

    throw lastError || new Error("All FREE Quote AI models failed");
}

async function generateQuotesBatch(
    category = "Love",
    count = 10,
    source = "user",
    topic = ""
) {
    if (!OPENROUTER_API_KEY) {
        throw new Error("OpenRouter API key is missing");
    }

    const { data, model } =
        await requestQuoteBatchWithFallback(
            category,
            count,
            source,
            topic
        );

    const content = data?.choices?.[0]?.message?.content || "";

    let parsed;
    try {
        const cleaned = content
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

        parsed = JSON.parse(cleaned);
    } catch {
        throw new Error("Quote AI returned invalid JSON");
    }

    if (!Array.isArray(parsed)) {
        throw new Error("Quote AI returned invalid quote array");
    }

    return {
        quotes: parsed
            .map(item => ({
                quote: String(item?.quote || "").trim(),
                score: Number(item?.score || 0),
                emoji: String(item?.emoji || "💬").trim(),
                category: String(item?.category || "").trim()
            }))
            .filter(item => item.quote),
        model
    };
}


async function generateBibleQuotes(count = 10) {
    const requestedCount = Number.isInteger(count)
        ? Math.min(Math.max(count, 10), 20)
        : 10;

    const verses = bibleSource
        .loadBibleVerses()
        .filter(verse =>
            verse &&
            verse.book &&
            verse.bookId &&
            Number.isInteger(verse.chapter) &&
            Number.isInteger(verse.verseStart) &&
            Number.isInteger(verse.verseEnd) &&
            verse.text &&
            verse.sourceVersion === "Amharic ULB v7.2" &&
            verse.sourceLicense === "CC BY-SA 4.0"
        );

    if (verses.length < requestedCount) {
        throw new Error("Verified Bible source does not contain enough verses");
    }

    const selected = [];
    const used = new Set();

    while (selected.length < requestedCount) {
        const index = Math.floor(Math.random() * verses.length);
        const verse = verses[index];

        const key =
            `${verse.bookId}:${verse.chapter}:${verse.verseStart}-${verse.verseEnd}`;

        if (used.has(key)) {
            continue;
        }

        used.add(key);

        selected.push({
            quote: verse.text,
            score: 100,
            emoji: "📖",
            quoteType: "Source Quote",
            book: verse.book,
            bookId: verse.bookId,
            chapter: verse.chapter,
            verseStart: verse.verseStart,
            verseEnd: verse.verseEnd,
            scriptureReference: bibleSource.formatScriptureReference(
                verse.book,
                verse.chapter,
                verse.verseStart,
                verse.verseEnd
            ),
            sourceVersion: verse.sourceVersion,
            sourceLicense: verse.sourceLicense,
            sourcePath: verse.sourcePath
        });
    }

    return {
        quotes: selected,
        model: null
    };
}

function isAmharicQuoteQuality(quote) {
    const text = String(quote || "").trim();
    if (!text || text.length < 12 || text.length > 500) return false;
    const amharicChars = (text.match(/[\u1200-\u137F]/g) || []).length;
    const latinChars = (text.match(/[A-Za-z]/g) || []).length;
    const letters = (text.match(/[\p{L}]/gu) || []).length;
    if (letters < 8 || amharicChars < 8 || amharicChars / Math.max(letters, 1) < 0.55) return false;
    if (latinChars > 12 || latinChars / Math.max(letters, 1) > 0.20) return false;
    const suspiciousPatterns = [/የአማርኛ.*የ.*ተባለ/, /በዓለም.*ላይ.*የተባለ/, /[፣።]\s*[፣።]/, /(.)\1{4,}/u];
    if (suspiciousPatterns.some(pattern => pattern.test(text))) return false;
    const words = text.split(/\s+/).filter(Boolean);
    const normalizedWords = words.map(word => word.replace(/[፣።!?፤፦]/g, "").trim()).filter(Boolean);
    for (let i = 0; i < normalizedWords.length - 2; i++) {
        const phrase = normalizedWords.slice(i, i + 3).join(" ");
        let repeats = 0;
        for (let j = i + 3; j <= normalizedWords.length - 3; j++) {
            if (normalizedWords.slice(j, j + 3).join(" ") === phrase) repeats++;
        }
        if (repeats >= 2) return false;
    }
    return true;
}
function normalizeQuote(quote) {
    return String(quote || "")
        .normalize("NFC")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

async function isDuplicate(quote) {
    const normalized = normalizeQuote(quote);

    if (!normalized) {
        return true;
    }

    const exactSnap = await db
        .collection(QUOTE_COLLECTION)
        .where("quote", "==", quote)
        .limit(1)
        .get();

    if (!exactSnap.empty) {
        return true;
    }

    const snap = await db
        .collection(QUOTE_COLLECTION)
        .get();

    return snap.docs.some(doc => {
        const data = doc.data() || {};
        const storedNormalized =
            data.normalizedQuote || normalizeQuote(data.quote);

        return storedNormalized === normalized;
    });
}

/* Generate ONE approved quote */
router.post("/quote-assistant/generate", async (req, res) => {
    try {
        const allowedCategories = [
            "Love",
            "Birthday",
            "Gift",
            "Thanks",
            "Family",
            "Friendship",
            "Memories",
            "Happiness",
            "Bible",
            "Spiritual"
        ];

        const requestedSource = String(req.body?.source || "user").trim();

        if (!["user", "ai"].includes(requestedSource)) {
            return res.status(400).json({
                success: false,
                error: "የጥቅስ ምንጭ ትክክል አይደለም።"
            });
        }

        const requestedCategory = String(req.body?.category || "").trim();

        if (requestedSource === "user" && !requestedCategory) {
            return res.status(400).json({
                success: false,
                error: "የጥቅስ ርዕስ ወይም ሀሳብ ያስገቡ።"
            });
        }

        const category = requestedSource === "ai" && requestedCategory === "Bible"
            ? "Bible"
            : requestedSource === "ai"
            ? "AI"
            : requestedCategory;

        const requestedCount = Number(req.body?.count || 1);
        const count = Number.isInteger(requestedCount)
            ? Math.min(Math.max(requestedCount, 10), 20)
            : 10;

        const batchResult =
            category === "Bible"
                ? await generateBibleQuotes(count)
                : await generateQuotesBatch(
                    category,
                    count,
                    requestedSource,
                    requestedCategory
                );
        const approvedQuotes = [];
        const batchSeen = new Set();

        for (const result of batchResult.quotes) {
            const normalized = normalizeQuote(result.quote);

            if (!normalized || batchSeen.has(normalized)) {
                continue;
            }

            if (
                requestedSource === "ai" &&
                Number(result.score || 0) < 90 || !isAmharicQuoteQuality(result.quote)
            ) {
                continue;
            }

            if (await isDuplicate(result.quote)) {
                continue;
            }

            batchSeen.add(normalized);
            approvedQuotes.push(result);

            if (approvedQuotes.length >= count) {
                break;
            }
        }

        if (approvedQuotes.length < count) {
            return res.status(503).json({
                success: false,
                error: "በቂ ልዩ እና ጥራት ያላቸው ጥቅሶች ማግኘት አልተቻለም።",
                requestedCount: count,
                approvedCount: approvedQuotes.length
            });
        }

        const now = new Date().toISOString();

        const savedQuotes = [];

        for (const approved of approvedQuotes) {
            const doc = {
                quote: approved.quote,
                normalizedQuote: normalizeQuote(approved.quote),
                score: approved.score,
                emoji: approved.emoji,
                category: requestedSource === "ai"
                    ? (approved.category || "AI")
                    : requestedCategory,
                quoteSource: requestedSource,
                model: batchResult.model || null,
                quoteType: approved.quoteType || "AI-Generated",
                status: "approved",
                ...(approved.quoteType === "Source Quote"
                    ? {
                        book: approved.book,
                        bookId: approved.bookId,
                        chapter: approved.chapter,
                        verseStart: approved.verseStart,
                        verseEnd: approved.verseEnd,
                        scriptureReference: approved.scriptureReference,
                        sourceVersion: approved.sourceVersion,
                        sourceLicense: approved.sourceLicense,
                        sourcePath: approved.sourcePath
                    }
                    : {}),
                isFavorite: false,
                approved: true,
                createdAt: now,
                updatedAt: now
            };

            const ref = await db
                .collection(QUOTE_COLLECTION)
                .add(doc);

            savedQuotes.push({
                id: ref.id,
                ...doc
            });
        }

        res.json({
            success: true,
            count: savedQuotes.length,
            quotes: savedQuotes
        });

    } catch (error) {
        console.error("Quote Assistant Error:", error);

        const status = Number(error?.status) || 500;

        res.status(status).json({
            success: false,
            error: status === 429
                ? "Quote AI FREE daily limit ላይ ደርሷል።"
                : "Quote Assistant ስራውን ማከናወን አልቻለም።",
            details: error?.message || "Unknown error",
            code: error?.code || null,
            rateLimit: error?.rateLimit || null,
            rateLimitReset: error?.rateLimitReset || null
        });
    }
});

/* Get approved quotes */
router.get("/quote-assistant/quotes", async (req, res) => {
    try {
        const snap = await db
            .collection(QUOTE_COLLECTION)
            .get();

        const quotes = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({
            success: true,
            quotes
        });

    } catch (error) {
        console.error("Quote List Error:", error);

        res.status(500).json({
            success: false,
            error: "ጥቅሶችን ማምጣት አልተቻለም።"
        });
    }
});



/* Favorite / Trash management */

/* Toggle favorite */
router.patch("/quote-assistant/quotes/:id/favorite", async (req, res) => {
    try {
        const ref = db.collection(QUOTE_COLLECTION).doc(req.params.id);
        const snap = await ref.get();

        if (!snap.exists) {
            return res.status(404).json({
                success: false,
                error: "ጥቅሱ አልተገኘም።"
            });
        }

        const current = snap.data();
        const favorite = current.favorite === true;

        await ref.update({
            favorite: !favorite,
            updatedAt: new Date().toISOString()
        });

        res.json({
            success: true,
            favorite: !favorite
        });
    } catch (error) {
        console.error("Quote Favorite Error:", error);
        res.status(500).json({
            success: false,
            error: "Favorite ማድረግ አልተቻለም።"
        });
    }
});

/* Mark quote as used on a gift/frame */
router.patch("/quote-assistant/quotes/:id/used", async (req, res) => {
    try {
        const ref = db.collection(QUOTE_COLLECTION).doc(req.params.id);
        const snap = await ref.get();

        if (!snap.exists) {
            return res.status(404).json({
                success: false,
                error: "ጥቅሱ አልተገኘም።"
            });
        }

        const current = snap.data();
        const usedCount = Number(current.usedCount || 0) + 1;

        await ref.update({
            usedCount,
            updatedAt: new Date().toISOString()
        });

        res.json({
            success: true,
            usedCount
        });
    } catch (error) {
        console.error("Quote Used Error:", error);

        res.status(500).json({
            success: false,
            error: "ጥቅሱን እንደተጠቀምኩበት ማስመዝገብ አልተቻለም።"
        });
    }
});

/* Move quote to Trash */
router.patch("/quote-assistant/quotes/:id/trash", async (req, res) => {
    try {
        const ref = db.collection(QUOTE_COLLECTION).doc(req.params.id);
        const snap = await ref.get();

        if (!snap.exists) {
            return res.status(404).json({
                success: false,
                error: "ጥቅሱ አልተገኘም።"
            });
        }

        await ref.update({
            trashed: true,
            updatedAt: new Date().toISOString()
        });

        res.json({
            success: true,
            trashed: true
        });
    } catch (error) {
        console.error("Quote Trash Error:", error);
        res.status(500).json({
            success: false,
            error: "ጥቅሱን Trash ማድረግ አልተቻለም።"
        });
    }
});

/* Restore quote from Trash */
router.patch("/quote-assistant/quotes/:id/restore", async (req, res) => {
    try {
        const ref = db.collection(QUOTE_COLLECTION).doc(req.params.id);
        const snap = await ref.get();

        if (!snap.exists) {
            return res.status(404).json({
                success: false,
                error: "ጥቅሱ አልተገኘም።"
            });
        }

        await ref.update({
            trashed: false,
            updatedAt: new Date().toISOString()
        });

        res.json({
            success: true,
            trashed: false
        });
    } catch (error) {
        console.error("Quote Restore Error:", error);
        res.status(500).json({
            success: false,
            error: "ጥቅሱን መመለስ አልተቻለም።"
        });
    }
});

/* Delete permanently */
router.delete("/quote-assistant/quotes/:id", async (req, res) => {
    try {
        const ref = db.collection(QUOTE_COLLECTION).doc(req.params.id);
        const snap = await ref.get();

        if (!snap.exists) {
            return res.status(404).json({
                success: false,
                error: "ጥቅሱ አልተገኘም።"
            });
        }

        await ref.delete();

        res.json({
            success: true,
            deleted: true
        });
    } catch (error) {
        console.error("Quote Permanent Delete Error:", error);
        res.status(500).json({
            success: false,
            error: "ጥቅሱን በቋሚነት መሰረዝ አልተቻለም።"
        });
    }
});

module.exports = router;
module.exports.generateBibleQuotes = generateBibleQuotes;
