require("dotenv").config();
const cron = require("node-cron");

const express = require("express");
const cors = require("cors");
const { db } = require("./firebase");
const ordersRoutes = require("./orders-routes");
const selfProductsRoutes = require("./self-products-routes");
const deliveredRoutes = require("./delivered-routes");
const rawMaterialExpenseRoutes = require("./raw-material-expense-routes");
const financeRoutes = require("./finance-routes");
const trashRoutes = require("./trash-routes");
const notesRoutes = require("./notes-routes");
const quoteAssistantRoutes = require("./quote-assistant-routes");
const appointmentsRoutes = require("./appointments-routes");
const contactsRoutes = require("./contacts-routes");
const recipesRoutes = require("./recipes-routes");
const productionsRoutes = require("./productions-routes");
const managementAIRoutesV2 = require("./management-ai-v2-routes");
const planningEvaluationRoutes = require("./planning-evaluation-routes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use("/uploads", express.static(__dirname + "/uploads"));
app.use("/api", ordersRoutes);
app.use("/api", selfProductsRoutes);
app.use("/api", deliveredRoutes);
app.use("/api", notesRoutes);
app.use("/api", quoteAssistantRoutes);
app.use("/api", appointmentsRoutes);
app.use("/api", contactsRoutes.router);
app.use("/api", financeRoutes);
app.use("/api", rawMaterialExpenseRoutes);
app.use("/api", trashRoutes);
app.use("/api", recipesRoutes);
app.use("/api", productionsRoutes);
app.use("/api", managementAIRoutesV2);
app.use("/api", planningEvaluationRoutes);

const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// =====================================
// Home
// =====================================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "YamGiftET AI Backend is running 🚀"
    });
});

// =====================================
// Health Check
// =====================================

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        openrouterKey: !!OPENROUTER_API_KEY
    });
});

// =====================================
// Status
// =====================================

app.get("/api/status", (req, res) => {
    res.json({
        success: true,
        openrouterKey: !!OPENROUTER_API_KEY,
        model: "openrouter/free"
    });
});

// =====================================
// AI Chat — OpenRouter
// =====================================

app.post("/api/chat", async (req, res) => {

    try {

        const message = req.body.message;

        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                error: "Message is required"
            });
        }

        if (!OPENROUTER_API_KEY) {
            return res.status(500).json({
                success: false,
                error: "OpenRouter API key is missing"
            });
        }

        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",

                headers: {
                    "Authorization":
                        `Bearer ${OPENROUTER_API_KEY}`,

                    "Content-Type":
                        "application/json",

                    "HTTP-Referer":
                        "http://localhost:3000",

                    "X-Title":
                        "YamGiftET AI"
                },

                body: JSON.stringify({

          models: ["nvidia/nemotron-3-ultra-550b-a55b:free", "google/gemma-4-31b-it:free", "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"],

                    messages: [

                        {
                            role: "system",

                            content:

                                
                                                      "አንተ YamGiftET AI ነህ። " +
                                                      "ሁለገብ የAI ረዳት ነህ፤ በንግድ ብቻ አትገደብ። " +
                                                      "ስለ እውቀት፣ ትምህርት፣ ሳይንስ፣ ቴክኖሎጂ፣ ፕሮግራሚንግ፣ ሂሳብ፣ ትርጉም፣ ጽሁፍ ማሻሻያ፣ ፈጠራ፣ ንግድ፣ የስጦታ ሀሳብ እና አጠቃላይ ጥያቄዎች ላይ እገዛ አድርግ። " +
                                                      "ተጠቃሚው በሚጠይቀው ቋንቋ ግልጽ፣ ተፈጥሯዊ እና ትክክለኛ መልስ ስጥ። " +
                                                      "አማርኛ ከሆነ በጥሩ እና በተፈጥሯዊ አማርኛ መልስ። " +
                                                      "ጥያቄው ሂሳብ ከሆነ ስሌቱን በትክክል አድርግ። " +
                                                      "የማታውቀውን ነገር እንደምታውቀው አትናገር።" + "አማርኛ መልስ ስትሰጥ ከሌላ ቋንቋ ቃላትን በዘፈቀደ አትቀላቅል። የአማርኛ ፊደል፣ ሰዋሰው እና ቃላት በትክክል ተጠቀም። የውጭ ቃል በእርግጥ ካስፈለገ ብቻ በቅንፍ ውስጥ አስገባ። ጥያቄውን ከመልሱ ጋር አትቀላቅል። መልሱ ከጥያቄው ጋር በቀጥታ የሚዛመድ፣ ግልጽ እና ትክክለኛ ይሁን። " + "ቀላል እና ግልጽ ጥያቄን አትተርጉም፣ አትገምት እና አትቀይር፤ ተጠይቀውን በቀጥታ መልስ። " + "ተጠቃሚው ቃላትን ወይም ዝርዝርን ብቻ እንዲሰጥ ከጠየቀ ማብራሪያ፣ ጥያቄ ወይም ተጨማሪ ጽሑፍ አትጨምር።"

                        },

                        {
                            role: "user",
                            content: "የYamGiftET Management AI ትንታኔ እንደገና አዘጋጅ።\n\n" + JSON.stringify(body, null, 2)
                        }

                    ]

                })

            }
        );

        const data = await response.json();

        console.log(
            "OpenRouter status:",
            response.status
        );

        if (!response.ok) {

            console.error(
                "OpenRouter Error:",
                JSON.stringify(data, null, 2)
            );

            if (response.status === 429) {
                return res.status(429).json({
                    success: false,
                    error: "የነፃ AI ሞዴሎች የዕለት ጥያቄ ገደብ ላይ ደርሰዋል። እባክዎ ቆይተው እንደገና ይሞክሩ።"
                });
            }

            return res.status(response.status).json({
                success: false,
                error:
                    data?.error?.message ||
                    "OpenRouter request failed"
            });
        }

        console.log(
            "OpenRouter selected model:",
            data?.model || "unknown"
        );

        const reply =
            data?.choices?.[0]?.message?.content;

        if (!reply) console.error("OpenRouter response shape:", JSON.stringify({model: data?.model, choices: data?.choices?.map(c => ({index: c?.index, finish_reason: c?.finish_reason, message_keys: c?.message ? Object.keys(c.message) : []}))}, null, 2));
        if (!reply) {
            console.warn("OpenRouter returned no usable content. Retrying General Chat once...");
            const retryResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json", "HTTP-Referer": "http://localhost:3000", "X-Title": "YamGiftET AI" },
                body: JSON.stringify({ models: ["nvidia/nemotron-3-ultra-550b-a55b:free", "google/gemma-4-31b-it:free", "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"], messages: [{ role: "system", content: "አንተ YamGiftET AI ነህ። ተጠቃሚው በሚጠይቀው ቋንቋ ግልጽ፣ ተፈጥሯዊ እና ትክክለኛ መልስ ስጥ። አማርኛ ከሆነ በጥሩ እና በተፈጥሯዊ አማርኛ መልስ።" }, { role: "user", content: "የYamGiftET Management AI ትንታኔ እንደገና አዘጋጅ።\n\n" + JSON.stringify(body, null, 2) }] })
            });
            const retryData = await retryResponse.json();
            console.log("OpenRouter General Chat retry status:", retryResponse.status);
            console.log("OpenRouter General Chat retry selected model:", retryData?.model || "unknown");
            const retryReply = retryData?.choices?.[0]?.message?.content;
            if (retryReply) return res.json({ success: true, reply: retryReply });
            return res.status(500).json({ success: false, error: "AI returned no response" });
        }

        res.json({
            success: true,
            reply: reply
        });

    } catch (error) {

        console.error(
            "Server Error:",
            error
        );

        res.status(500).json({
            success: false,
            error: "AI request failed"
        });

    }

});

// =====================================
 // Notes AI — Free OpenRouter AI
 // =====================================

app.post("/api/notes-ai", async (req, res) => {
  try {
    const question = String(req.body?.question || "").trim();

    if (!question) {
      return res.status(400).json({
        success: false,
        error: "የሚጠይቁትን ጥያቄ ያስገቡ።"
      });
    }

    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "OpenRouter API key is missing"
      });
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "YamGiftET Notes AI"
        },
        body: JSON.stringify({
          model: "nvidia/nemotron-3-super-120b-a12b:free",
          messages: [
            {
              role: "system",
              content:
                "አንተ YamGiftET AI ነህ። " +
                "በNotes & Records ክፍል ውስጥ ለተጠቃሚው የግል እውቀት፣ የንግድ ምክር፣ የስጦታ ሀሳብ፣ የጽሑፍ ማሻሻያ፣ ትርጉም፣ ሂሳብ እና አጠቃላይ ጥያቄዎች ላይ እገዛ ታደርጋለህ። " +
                "በተፈጥሯዊ እና ግልጽ አማርኛ መልስ። " +
                "ጥያቄው ሂሳብ ከሆነ ስሌቱን በትክክል አድርገህ መልስ። " +
                "የማታውቀውን ነገር እንደምታውቀው አትናገር።"
            },
            {
              role: "user",
              content: question
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Notes AI OpenRouter Error:",
        JSON.stringify(data, null, 2)
      );

      return res.status(response.status).json({
        success: false,
        error: data?.error?.message || "Notes AI request failed"
      });
    }

    const reply = data?.choices?.[0]?.message?.content;

        if (!reply) console.error("OpenRouter response shape:", JSON.stringify({model: data?.model, choices: data?.choices?.map(c => ({index: c?.index, finish_reason: c?.finish_reason, message_keys: c?.message ? Object.keys(c.message) : []}))}, null, 2));
    if (!reply) {
      return res.status(500).json({
        success: false,
        error: "AI returned no response"
      });
    }

    res.json({
      success: true,
      reply
    });

  } catch (error) {
    console.error("Notes AI Error:", error);

    res.status(500).json({
      success: false,
      error: "Notes AI request failed"
    });
  }
});

// =====================================
// Management AI — YamGiftET Business Analysis
// =====================================

app.post("/api/management-ai", async (req, res) => {
    try {
        if (!OPENROUTER_API_KEY) {
            return res.status(500).json({
                success: false,
                error: "OpenRouter API key is missing"
            });
        }

        const body = req.body || {};

        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:3000",
                    "X-Title": "YamGiftET Management AI"
                },
                body: JSON.stringify({
                    model: "nvidia/nemotron-3-super-120b-a12b:free",
                    stream: true,
                    max_tokens: 3000,
                    messages: [
                        {
                            role: "system",
                            content:
                                "አንተ YamGiftET AI የንግድ አስተዳደር ረዳት ነህ። " +
                                "የUSER መልዕክቱ ውስጥ የተላከው DATA ብቻ የእውነታ ምንጭ ነው። " +
                                "በDATA ውስጥ ያለውን ቁጥር ወይም መረጃ ወደ 0 አትቀይር፤ በትክክል ተጠቀም። " +
                                "DATA ውስጥ የሌለ ወይም ያልተረጋገጠ መረጃ አትፍጠር፣ አትገምት፣ እንደ እውነታም አትጻፍ። " +
                                "ከDATA ውስጥ በቀጥታ የሚሰላ ውጤት ብቻ አስላ። " +
                                "መረጃ ካልበቃ 'በተሰጠው DATA ውስጥ ይህን ለመወሰን በቂ መረጃ የለም' ብለህ ግልጽ አድርግ። " +
                                "የፋይናንስ፣ የትዕዛዝ፣ የምርት፣ የጥሬ እቃ፣ የወጪ እና የCustomers መረጃን አገናኝ። " +
                                "በተፈጥሯዊ፣ ግልጽ እና ትክክለኛ አማርኛ መልስ። " +
                                "ችግሮችን፣ የሚታዩ እድሎችን እና ቀጣይ እርምጃዎችን ከDATA ማስረጃ ጋር ለይ። " +
                                "የሪፖርቱን ቀንና ሰዓት በኢትዮጵያ ሰዓት (Africa/Addis_Ababa) አሳይ።"
                        },
                        {
                            role: "user",
                            content:
                                "የYamGiftET የንግድ መረጃ እነሆ፣ ተንትነው የአስተዳደር ምክር ስጠኝ።\n\n" +
                                JSON.stringify(body.snapshot || {}, null, 2)
                        }
                    ],
                    temperature: 0,
                    top_p: 1,
                    reasoning: { effort: "none" }
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Management AI OpenRouter Error:", errorText);
            return res.status(response.status).json({
                success: false,
                error: "Management AI request failed"
            });
        }

        if (!response.body) {
            return res.status(502).json({
                success: false,
                error: "Management AI stream unavailable"
            });
        }

        res.status(200);
        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders?.();

        const reader = response.body.getReader();

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                res.write(Buffer.from(value));
            }
        } finally {
            reader.releaseLock();
            res.end();
        }
    } catch (error) {
        console.error("Management AI Error:", error);

        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                error: "Management AI request failed"
            });
        }

        res.end();
    }
});

// =====================================
// Products — YamGiftET
// =====================================

const products = [
    {
        id: 1,
        name: "Epoxy Frame",
        nameAm: "ኢፖክሲ ፍሬም",
        category: "ፍሬም",
        description: "የግል ፎቶን በሚያምር መልኩ የሚያስቀምጥ የኢፖክሲ ፍሬም።",
        price: 0,
        currency: "ETB",
        available: true
    }
];

app.get("/api/products", (req, res) => {
    res.json({
        success: true,
        count: products.length,
        products: products
    });
});

app.get("/api/products/:id", (req, res) => {
    const id = Number(req.params.id);

    const product = products.find(
        (item) => item.id === id
    );

    if (!product) {
        return res.status(404).json({
            success: false,
            error: "Product not found"
        });
    }

    res.json({
        success: true,
        product: product
    });
});

// =====================================
// Start Server
// =====================================

app.listen(PORT, () => {

    console.log(
        "🚀 YamGiftET AI Backend running"
    );

    console.log(
        "📡 Port:",
        PORT
    );

    console.log(
        "🔐 OpenRouter API Key:",
        OPENROUTER_API_KEY
            ? "Loaded ✅"
            : "Missing ❌"
    );

});
