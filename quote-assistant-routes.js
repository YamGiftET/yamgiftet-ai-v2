const express = require("express");
const { db } = require("./firebase");

const router = express.Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const QUOTE_COLLECTION = "quoteAssistant";

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

መልስህ JSON ብቻ ይሁን፦
{
  "quote": "ጥቅሱ",
  "score": 0,
  "emoji": "❤️"
}

score ከ0-100 ይሁን።
90 በታች ከሆነ ጥቅሱ እንደ ምርጥ አይቆጠርም።

emoji የጥቅሱን ዋና ስሜትና ይዘት የሚወክል አንድ ብቻ emoji ይሁን።
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

async function isDuplicate(quote) {
    const snap = await db
        .collection(QUOTE_COLLECTION)
        .where("quote", "==", quote)
        .limit(1)
        .get();

    return !snap.empty;
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

        const category = allowedCategories.includes(req.body?.category)
            ? req.body.category
            : "Love";

        const requestedCount = Number(req.body?.count || 1);
        const count = Number.isInteger(requestedCount)
            ? Math.min(Math.max(requestedCount, 10), 20)
            : 10;

        const approvedQuotes = [];

        for (let attempt = 1; attempt <= 50; attempt++) {
            const result = await generateQuote(category);

            if (!result) continue;

            if (approvedQuotes.some(item => item.quote === result.quote)) {
                continue;
            }

            if (await isDuplicate(result.quote)) {
                continue;
            }

            approvedQuotes.push(result);

            if (approvedQuotes.length >= count) {
                break;
            }
        }

        if (approvedQuotes.length === 0) {
            return res.status(503).json({
                success: false,
                error: "ምርጥ ጥቅስ ማግኘት አልተቻለም።"
            });
        }

        const now = new Date().toISOString();

        const savedQuotes = [];

        for (const approved of approvedQuotes) {
            const doc = {
                quote: approved.quote,
                score: approved.score,
                emoji: approved.emoji,
                category,
                quoteType: "AI-Generated",
                status: "approved",
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
