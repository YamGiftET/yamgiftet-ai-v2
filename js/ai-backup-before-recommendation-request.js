// =====================================
// YamGiftET AI v2
// Smart AI Assistant
// =====================================

console.log("✅ YamGiftET AI v2 loaded successfully");

// =====================================
// HTML Elements
// =====================================

const chatBox = document.getElementById("chatBox");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

// =====================================
// YamGiftET AI Memory
// =====================================

const yamGiftMemory = {
    recipient: "",
    occasion: "",
    budget: null,
    product: "",
    customerName: ""
};

// =====================================
// Add Message
// =====================================

function addMessage(sender, message) {

    if (!chatBox) return;

    const messageElement = document.createElement("p");

    const senderElement = document.createElement("strong");

    senderElement.textContent = sender + ": ";

    messageElement.appendChild(senderElement);

    messageElement.appendChild(
        document.createTextNode(message)
    );

    chatBox.appendChild(messageElement);

    chatBox.scrollTop = chatBox.scrollHeight;
}

// =====================================
// Remember Customer Information
// =====================================

function rememberCustomerInfo(text) {

    const message = text.trim().toLowerCase();

    // ---------------------------------
    // Recipient
    // ---------------------------------

    if (
        message.includes("እናቴ") ||
        message.includes("እናት") ||
        message.includes("እናቱ")
    ) {

        yamGiftMemory.recipient = "እናት";

    }

    else if (
        message.includes("አባቴ") ||
        message.includes("አባት") ||
        message.includes("አባቱ")
    ) {

        yamGiftMemory.recipient = "አባት";

    }

    else if (
        message.includes("ፍቅረኛ") ||
        message.includes("ፍቅር")
    ) {

        yamGiftMemory.recipient = "ፍቅረኛ";

    }

    else if (
        message.includes("ልጄ") ||
        message.includes("ልጅ")
    ) {

        yamGiftMemory.recipient = "ልጅ";

    }

    else if (
        message.includes("ጓደኛ")
    ) {

        yamGiftMemory.recipient = "ጓደኛ";

    }

    // ---------------------------------
    // Occasion
    // ---------------------------------

    if (
        message.includes("ልደት") ||
        message.includes("birthday")
    ) {

        yamGiftMemory.occasion = "ልደት";

    }

    else if (
        message.includes("ሰርግ") ||
        message.includes("wedding")
    ) {

        yamGiftMemory.occasion = "ሰርግ";

    }

    else if (
        message.includes("እናቶች ቀን") ||
        message.includes("የእናቶች ቀን")
    ) {

        yamGiftMemory.occasion = "የእናቶች ቀን";

    }

    else if (
        message.includes("ፍቅር") ||
        message.includes("anniversary")
    ) {

        yamGiftMemory.occasion = "ፍቅር";

    }

    // ---------------------------------
    // Budget
    // ---------------------------------

    const budgetMatch = message.match(
        /(\d[\d,]*)\s*(ብር|birr|ብር)?/
    );

    if (budgetMatch) {

        const amount = budgetMatch[1]
            .replace(/,/g, "");

        const number = parseInt(amount);

        if (!isNaN(number)) {

            yamGiftMemory.budget = number;

        }
    }
}

// =====================================
// Generate Gift Recommendation
// =====================================

function buildGiftRecommendation() {

    const recipient = yamGiftMemory.recipient;
    const occasion = yamGiftMemory.occasion;
    const budget = yamGiftMemory.budget;

    if (!recipient || !occasion || !budget) {
        return null;
    }

    if (typeof yamGiftProducts === "undefined") {
        return "⚠️ የYamGiftET የምርት መረጃ ገና አልተጫነም።";
    }

    const suitableProducts = yamGiftProducts.filter(function(product) {

        const personMatch =
            product.suitableFor &&
            product.suitableFor.some(function(person) {
                return person === recipient;
            });

        const occasionMatch =
            product.occasions &&
            product.occasions.some(function(item) {
                return item === occasion;
            });

        const budgetMatch =
            typeof product.priceFrom === "number" &&
            product.priceFrom <= budget;

        return personMatch && occasionMatch && budgetMatch;
    });

    if (suitableProducts.length === 0) {

        return (
            "🎁 ለ" + recipient +
            " የ" + occasion +
            " ስጦታ በ " + budget +
            " ብር በጀት ላይ ልዩ ዲዛይን ማዘጋጀት ይቻላል።\\n\\n" +

            "📸 ፎቶዎን ይላኩልን፤ በጀትዎን በመከተል " +
            "ተስማሚ ዲዛይን እንመክራለን።"
        );
    }

    const product = suitableProducts[0];

    let reply =
        "🎁 ለ" + recipient +
        " የ" + occasion +
        " ስጦታ ይህን እመክራለሁ፦\\n\\n" +

        "⭐ " + product.name + "\\n";

    if (product.size) {
        reply += "📐 መጠን፦ " + product.size + "\\n";
    }

    reply +=
        "💰 ዋጋ፦ ከ" + product.priceFrom +
        " ብር ጀምሮ\\n\\n" +

        "📝 " + product.description + "\\n\\n" +

        "💡 በ " + budget +
        " ብር በጀት መሰረት ዲዛይኑን " +
        "ማስተካከል እንችላለን።";

    return reply;
}

// =====================================
// Quote Generator
// =====================================

function generateQuote() {

    const recipient = yamGiftMemory.recipient;

    const occasion = yamGiftMemory.occasion;

    if (
        recipient === "እናት"
    ) {

        return (
            "❤️ እናቴ፣ ለሰጠሽኝ ፍቅር፣ " +
            "ለአሳደግሽኝ ጥንካሬ እና " +
            "ለሁሉም መልካም ነገር " +
            "ልቤ ሁሌም አመሰግናለሁ።"
        );
    }

    if (
        recipient === "አባት"
    ) {

        return (
            "💙 አባቴ፣ ከአንተ የተማርኩት " +
            "ጥንካሬ እና ፍቅር ለሕይወቴ " +
            "ትልቅ ስጦታ ነው።"
        );
    }

    if (
        recipient === "ፍቅረኛ"
    ) {

        return (
            "❤️ ከአንተ/ከአንቺ ጋር የማሳልፈው " +
            "እያንዳንዱ ቀን የሕይወቴ " +
            "ውብ ትዝታ ነው።"
        );
    }

    if (
        occasion === "ልደት"
    ) {

        return (
            "🎂 ይህ አዲስ ዓመት የሕይወትዎን " +
            "ደስታ፣ ሰላም እና ስኬት ያብዛ።"
        );
    }

    return (
        "❤️ እውነተኛ ስጦታ ዋጋው ሳይሆን " +
        "ከልብ መሰጠቱ ነው።"
    );
}

// =====================================
// Design Recommendation
// =====================================

function generateDesignIdea() {

    const recipient = yamGiftMemory.recipient;

    const occasion = yamGiftMemory.occasion;

    if (
        recipient === "እናት" &&
        occasion === "ልደት"
    ) {

        return (
            "🖼️ የእናት የልደት Frame ዲዛይን፦\n\n" +

            "📸 የሚወዱት ፎቶ በመሀል\n" +
            "🌸 በጎኖቹ ለስላሳ የአበባ ዲዛይን\n" +
            "✨ የEpoxy ብርሃን ዝርዝር\n" +
            "✍️ ከታች ልዩ ጥቅስ\n" +
            "🎁 YamGiftET Logo በትንሽ መጠን\n" +
            "🇪🇹 Made with Love in Ethiopia"
        );
    }

    if (recipient === "ፍቅረኛ") {

        return (
            "❤️ Couple Frame Design፦\n\n" +

            "📸 የሁለቱ ፎቶ\n" +
            "❤️ Heart Elements\n" +
            "✨ Premium Epoxy Finish\n" +
            "✍️ Love Quote\n" +
            "🎁 Elegant Gift Packaging"
        );
    }

    return (
        "🖼️ Custom Frame Design፦\n\n" +

        "📸 ዋና ፎቶ\n" +
        "✨ Epoxy Decoration\n" +
        "✍️ Personalized Quote\n" +
        "🎁 YamGiftET Branding"
    );
}

// =====================================
// Business Advice
// =====================================

function businessAdvice() {

    return (
        "💼 የYamGiftET የቢዝነስ ምክር፦\n\n" +

        "1️⃣ የደንበኛዎችን ምርጫ ይመዝግቡ።\n" +
        "2️⃣ የምርቶችዎን ፎቶ በጥራት ያስቀምጡ።\n" +
        "3️⃣ የዋጋ ዝርዝር ያዘጋጁ።\n" +
        "4️⃣ የደንበኛ ቀጠሮዎችን ይመዝግቡ።\n" +
        "5️⃣ በSocial Media በየቀኑ ይለጥፉ።\n\n" +
"🎯 ዋና ግብ፦ ደንበኛ → ጥያቄ → ምክር → ትዕዛዝ → ክፍያ → ማድረስ።"
    );
}
// =====================================

function aiReply(text) {

    const message = text.trim().toLowerCase();
    // Remember information first
    rememberCustomerInfo(message);
    // =================================
    // Greeting
    // =================================

    if (
        message.includes("ሰላም") ||
        message.includes("hello") ||
        message.includes("hi")
    ) {

        return (
            "👋 ሰላም! ወደ YamGiftET AI " +
            "እንኳን በደህና መጡ።\n\n" +

            "ዛሬ በምን ልርዳዎ? 🎁\n\n" +

            "🎁 ስጦታ\n" +
            "🖼️ Frame Design\n" +
            "✍️ ጥቅስ\n" +
            "💰 ዋጋ\n" +
            "💼 ቢዝነስ ምክር"
        );
    }
    // Business
    // =================================

    if (
        message.includes("ቢዝነስ") ||
        message.includes("business") ||
        message.includes("ንግድ")
    ) {

        return businessAdvice();
    }

    // =================================
    // Quote
    // =================================

    if (
        message.includes("ጥቅስ") ||
        message.includes("quote")
    ) {

        return (
            "✍️ እሺ! ለFrameዎ ይህን ጥቅስ መጠቀም ይችላሉ፦\n\n" +
            generateQuote()
        );
    }

    // =================================
    // Design
    // =================================

    if (
        message.includes("ዲዛይን") ||
        message.includes("design")
    ) {

        return generateDesignIdea();
    }

    // =================================
    // Gift
    // =================================

    if (
        message.includes("ስጦታ") ||
        message.includes("gift")
    ) {

        if (!yamGiftMemory.recipient) {

            return (
                "🎁 በደስታ! ስጦታው ለማን ነው?\n\n" +

                "ለምሳሌ፦\n" +
                "👩 እናት\n" +
                "👨 አባት\n" +
                "❤️ ፍቅረኛ\n" +
                "👶 ልጅ\n" +
                "👫 ጓደኛ"
            );
        }

        if (!yamGiftMemory.occasion) {

            return (
                "❤️ ለ" +
                yamGiftMemory.recipient +
                " በጣም የሚያምር ስጦታ እንዘጋጃለን።\n\n" +

                "ለምን አጋጣሚ ነው?\n" +
                "🎂 ልደት\n" +
                "💍 ሰርግ\n" +
                "❤️ ፍቅር\n" +
                "🎉 ሌላ"
            );
        }

        if (!yamGiftMemory.budget) {

            return (
                "🎁 በጣም ጥሩ!\n\n" +

                "ለ" +
                yamGiftMemory.recipient +
                " የ" +
                yamGiftMemory.occasion +
                " ስጦታ እንዘጋጅልዎታለን።\n\n" +

                "💰 በጀትዎ በግምት ስንት ብር ነው?"
            );
        }

        return buildGiftRecommendation();
    }

    // =================================
    // Frame
    // =================================

    if (
        message.includes("ፍሬም") ||
        message.includes("frame")
    ) {

        return (
            "🖼️ የተለያዩ Custom Epoxy Frame " +
            "ዲዛይኖች አሉን።\n\n" +

            "ፎቶዎን፣ መጠኑን እና " +
            "የሚፈልጉትን ቀለም ከነገሩኝ " +
            "የዲዛይን ሀሳብ እሰጣለሁ።"
        );
    }

    // =================================
    // Price
    // =================================

    if (
        message.includes("ዋጋ") ||
        message.includes("price")
    ) {

        return (
            "💰 የEpoxy Frame ዋጋ እንደ መጠን፣ " +
            "ዲዛይን እና የሚጠቀሙት ቁሳቁስ " +
            "ይለያያል።\n\n" +

            "የሚፈልጉትን መጠን ንገሩኝ። " +
            "ለምሳሌ፦ 30×40 cm"
        );
    }

    // =================================
    // Appointment
    // =================================

    if (
        message.includes("ቀጠሮ") ||
        message.includes("appointment")
    ) {

        return (
            "📅 ቀጠሮ ለመያዝ የሚፈልጉትን " +
            "ቀን እና ሰዓት ይንገሩኝ።"
        );
    }

    // =================================
    // Thanks
    // =================================

    if (
        message.includes("አመሰግናለሁ") ||
        message.includes("thanks") ||
        message.includes("thank you")
    ) {

        return (
            "😊 እናመሰግናለን! " +
            "YamGiftET ሁልጊዜ ለማገልገልዎ ዝግጁ ነው። ❤️"
        );
    }

    // =================================
    // Budget after previous conversation
    // =================================

if (
    yamGiftMemory.budget &&
    !message.includes("ሰላም") &&
    !message.includes("ስጠኝ") &&
    !message.includes("ምክር ስጠኝ") &&
    !message.includes("recommend") &&
    !message.includes("recommendation")
) {
        return (
            "💡 የተረዳሁት፦\n\n" +

            "👤 ለ: " +
            (yamGiftMemory.recipient || "አልተገለጸም") +
            "\n" +

            "🎉 አጋጣሚ: " +
            (yamGiftMemory.occasion || "አልተገለጸም") +
            "\n" +

            "💰 በጀት: " +
            yamGiftMemory.budget +
            " ብር\n\n" +

            "እነዚህን መረጃዎች በመጠቀም " +
            "የተሻለ የስጦታ ምክር ልሰጥዎ እችላለሁ።"
        );
    }

    // =================================
    // Default
    // =================================

    return (
        "🤖 እባክዎ ጥያቄዎን በትንሹ " +
        "በዝርዝር ይንገሩኝ።\n\n" +

        "ስለ፦\n" +
        "🎁 ስጦታ\n" +
        "🖼️ ፍሬም\n" +
        "✍️ ጥቅስ\n" +
        "💰 ዋጋ\n" +
        "💼 ቢዝነስ\n" +
        "📅 ቀጠሮ\n\n" +

        "ልርዳዎ እችላለሁ።"
    );
}

// =====================================
// Send Message
// =====================================

function sendMessage() {

    if (!userInput) return;

    const message = userInput.value.trim();

    if (message === "") return;

    addMessage(
        "😊 እርስዎ",
        message
    );

    userInput.value = "";

    const reply = aiReply(message);

    setTimeout(function () {

        addMessage(
            "🤖 AI",
            reply
        );

    }, 500);
}

// =====================================
// Send Button
// =====================================

if (sendBtn) {

    sendBtn.addEventListener(
        "click",
        sendMessage
    );
}

// =====================================
// Enter Key
// =====================================

if (userInput) {

    userInput.addEventListener(
        "keydown",
        function (event) {

            if (event.key === "Enter") {

                event.preventDefault();

                sendMessage();
            }
        }
    );
}
