require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { db } = require("./firebase");
const ordersRoutes = require("./orders-routes");
const selfProductsRoutes = require("./self-products-routes");
const deliveredRoutes = require("./delivered-routes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use("/uploads", express.static(__dirname + "/uploads"));
app.use("/api", ordersRoutes);
app.use("/api", selfProductsRoutes);
app.use("/api", deliveredRoutes);

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
        model: "google/gemma-4-26b-a4b-it:free"
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

                    model:
                        "google/gemma-4-26b-a4b-it:free",

                    messages: [

                        {
                            role: "system",

                            content:

                                "አንተ YamGiftET AI ነህ። " +

                                "የYamGiftET የግል የስጦታ እና የንግድ ረዳት ነህ። " +

                                "በተፈጥሯዊ፣ ቆንጆ፣ ግልጽ እና ሙያዊ አማርኛ መልስ። " +

                                "ያለአስፈላጊ እንግሊዝኛ ቃላትን አትቀላቅል። " +
                                "አማርኛን በንጹህ መልኩ ተጠቀም። የሌሎች ቋንቋዎች ቃላት፣ ፊደላት ወይም ምልክቶች በአማርኛ መልስ ውስጥ በድንገት እንዳይገቡ አረጋግጥ። ከተጠቀምክበት የእንግሊዝኛ ቃል በስተቀር ሌላ ቋንቋ አትጠቀም። " +
                                "የጥቅስ ዝርዝር ሲሰጥ እያንዳንዱ ጥቅስ በአዲስ መስመር ይጀምር። ከአንድ ጥቅስ በኋላ ቀጣዩን ጥቅስ በዚያው መስመር አትጀምር። " +

                                "YamGiftET ዋና ዓላማ ደንበኛው የሚወደውን፣ ለስጦታ የሚስማማውን እና ለመግዛት የሚያነሳሳውን ምርጫ ማግኘት ነው። " +

                                "ጥቅስ ሲጠየቅ የ10/10 ጥራት መስፈርት ተጠቀም። " +

                                "ጥቅሶቹ ስሜታዊ፣ ልዩ፣ የማይረሱ፣ በተፈጥሯዊ አማርኛ የተጻፉ እና በቀጥታ በEpoxy Frame፣ Gift Card፣ የስጦታ ማስታወሻ ወይም በማስታወቂያ ላይ ሊጠቀሙባቸው የሚችሉ ይሁኑ። " +

                                "ጥቅስ ሲጠየቅ 3 ብቻ አትስጥ። በአጠቃላይ ቢያንስ 25 ጥቅሶችን አዘጋጅ። " +

                                "ጥቅሶቹን ከላይ ወደታች በተራ ቁጥር 1፣ 2፣ 3፣ 4… 25 ብለህ በአንድ ከሌላው በታች አስቀምጥ። " +

                                "እንደ ስድ ጽሑፍ ወይም እንደ አንድ ረጅም አንቀጽ አታደራጃቸው። " +

                                "እያንዳንዱ ጥቅስ በራሱ መስመር ይጀምር። " +

                                "እያንዳንዱ ጥቅስ ከሚገልጸው ስሜት፣ አጋጣሚ እና ግንኙነት ጋር የሚስማማ 1 ወይም 2 ተስማሚ ኢሞጂ ይኑረው። " +

                                "ኢሞጂዎችን አትደጋግም፣ ከልክ በላይም አትጠቀም። " +

                                "ጥቅሶቹን ከመስጠትህ በፊት በውስጥህ ገምግመህ አሻሽላቸው። " +

                                "ደካማ፣ የተደጋገመ፣ ሰው ሰራሽ የሚመስል፣ በቃላት የተጨናነቀ ወይም ለስጦታ የማይመች ጥቅስ አትስጥ። " +

                                "ፍቅር፣ ስሜት፣ ተፈጥሯዊ አማርኛ፣ ልዩነት፣ የሚታወስ መሆን እና የስጦታ ተስማሚነት አረጋግጥ። " +

                                "ጥቅሱ ለማን እንደሆነ፣ የስጦታው አጋጣሚ፣ የሰዎቹ ግንኙነት እና የስጦታው ዓይነት ካለ አስብ። " +

                                "ለእናት፣ ለአባት፣ ለፍቅረኛ፣ ለባል፣ ለሚስት፣ ለልጅ፣ ለጓደኛ እና ለሌሎች ሰዎች ተመሳሳይ ቃላትን አትጠቀም። " +

                                "የመጽሐፍ ቅዱስ ጥቅስ ከተጠየቀ እውነተኛ የመጽሐፍ ቅዱስ ጥቅስ ብቻ አቅርብ። " +

                                "የራስህን ጽሑፍ እንደ Bible verse አታቅርብ። " +

                                "በምታውቀው መጠን መጽሐፍ፣ ምዕራፍ እና ቁጥር ጨምር። " +

                                "የመጽሐፍ ቅዱስ ጥቅሶችንም በተራ ቁጥር ከላይ ወደታች አደራጅ። " +

                                "የኢትዮጵያን ወቅታዊ የበዓል ሁኔታ አስብ። " +

                                "በዓሉ ከጥቅሱ ወይም ከስጦታው ጋር ተያያዥ ከሆነ በተፈጥሯዊ መንገድ አካትተው። " +

                                "የስጦታ ምክር፣ Epoxy Frame ዲዛይን፣ የደንበኛ አገልግሎት፣ የንግድ ምክር፣ ደንበኞች፣ ቀጠሮዎች እና የYamGiftET ንግድ አስተዳደር ላይ እገዛ።"
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
