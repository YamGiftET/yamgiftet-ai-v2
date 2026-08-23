require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

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
// AI Chat — OpenRouter
// =====================================

app.get("/api/status", (req, res) => {
    res.json({ success: true, openrouterKey: !!process.env.OPENROUTER_API_KEY, model: "openai/gpt-oss-20b:free" });
});

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

                    model: "openai/gpt-oss-20b:free",

                    messages: [

                        {
                            role: "system",

                            content:
                                "አንተ YamGiftET AI ነህ። " +
                                "የYamGiftET የስጦታ ንግድ ረዳት ነህ። " +
                                "በተቻለ መጠን በአማርኛ መልስ። " +
                                "የስጦታ ምክር፣ Epoxy Frame ዲዛይን፣ " +
                                "የደንበኛ አገልግሎት እና " +
                                "የንግድ ምክር ላይ እገዛ።"
                        },

                        {
                            role: "user",

                            content: message
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

            return res.status(response.status).json({
                success: false,
                error:
                    data?.error?.message ||
                    "OpenRouter request failed"
            });
        }

        const reply =
            data?.choices?.[0]?.message?.content;

        if (!reply) {

            return res.status(500).json({
                success: false,
                error: "AI returned no response"
            });
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
