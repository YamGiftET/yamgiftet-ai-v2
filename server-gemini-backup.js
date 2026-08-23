require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");

const app = express();

app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

// =====================================
// Home
// =====================================

app.get("/", function (req, res) {
    res.json({
        success: true,
        message: "YamGiftET AI Backend is running 🚀"
    });
});

// =====================================
// Health Check
// =====================================

app.get("/api/health", function (req, res) {
    res.json({
        success: true,
        geminiKey: !!process.env.GEMINI_API_KEY
    });
});

// =====================================
// AI Chat
// =====================================

app.post("/api/chat", async function (req, res) {

    try {

        const message = req.body.message;

        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                error: "Message is required"
            });
        }

        const response = await ai.models.generateContent({

            model: "gemini-2.5-flash",

            contents: message,

            config: {
                systemInstruction:
                    "አንተ YamGiftET AI ነህ። " +
                    "የYamGiftET የስጦታ ንግድ ረዳት ነህ። " +
                    "በተቻለ መጠን በአማርኛ መልስ። " +
                    "የስጦታ ምክር፣ የፍሬም ዲዛይን፣ " +
                    "የደንበኛ አገልግሎት እና የንግድ ምክር ላይ እገዛ።"
            }

        });

        res.json({
            success: true,
            reply: response.text
        });

    } catch (error) {

        console.error("❌ Gemini Error:", error);

        res.status(500).json({
            success: false,
            error: "AI request failed"
        });

    }

});

// =====================================
// Server
// =====================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, function () {

    console.log("🚀 YamGiftET AI Backend running");
    console.log("📡 Port:", PORT);

    console.log(
        "🔐 Gemini API Key:",
        process.env.GEMINI_API_KEY
            ? "Loaded ✅"
            : "Missing ❌"
    );

});
