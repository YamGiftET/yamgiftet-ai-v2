console.log("✅ YamGiftET AI — OpenRouter Connected");

const chatBox = document.getElementById("chatBox");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

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

async function sendMessage() {

    if (!userInput) return;

    const message = userInput.value.trim();

    if (!message) return;

    addMessage("😊 እርስዎ", message);

    userInput.value = "";

    const loading = document.createElement("p");
    loading.id = "aiLoading";
    loading.innerHTML = "<strong>🤖 AI:</strong> እያሰብኩ ነው...";
    chatBox.appendChild(loading);

    try {

        const response = await fetch(
            "http://localhost:3000/api/chat",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    message: message
                })
            }
        );

        const data = await response.json();

        const oldLoading =
            document.getElementById("aiLoading");

        if (oldLoading) {
            oldLoading.remove();
        }

        if (data.success && data.reply) {

            addMessage(
                "🤖 AI",
                data.reply
            );

        } else {

            addMessage(
                "❌ AI",
                "ይቅርታ፣ AI መልስ መስጠት አልቻለም።"
            );

            console.error(
                "AI Error:",
                data
            );
        }

    } catch (error) {

        const oldLoading =
            document.getElementById("aiLoading");

        if (oldLoading) {
            oldLoading.remove();
        }

        console.error(
            "Connection Error:",
            error
        );

        addMessage(
            "❌ AI",
            "Backend ጋር መገናኘት አልተቻለም።"
        );
    }
}

if (sendBtn) {

    sendBtn.addEventListener(
        "click",
        sendMessage
    );
}

if (userInput) {

    userInput.addEventListener(
        "keydown",
        function(event) {

            if (event.key === "Enter") {

                event.preventDefault();

                sendMessage();
            }

        }
    );
}
