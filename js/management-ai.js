"use strict";

(() => {
    const state = { running: false };
    const get = id => document.getElementById(id);

    function setStatus(message) {
        const el = get("yamManagementAIStatus");
        if (el) el.textContent = message;
    }

    function setResult(message) {
        const el = get("yamManagementAIResult");
        if (el) el.textContent = message;
    }

    function buildPrompt(snapshot) {
        return [
            "አንተ YamGiftET Management AI ነህ።",
            "የስራህ ዋና አላማ DATA ውስጥ ያለውን ትክክለኛ የYamGiftET ቢዝነስ ሁኔታ ማንበብ፣ ቁጥሮችን ማገናኘት፣ ከDATA በቀጥታ የሚወጡ ስሌቶችን ማስላት እና ተግባራዊ የአስተዳደር ምክር መስጠት ነው።",
            "Prompt አትድገም። የምትሰጠው መልስ የDATA ትንታኔ እንጂ የprompt ማብራሪያ አይሁን።",
            "",
            "ትንታኔውን በዚህ ቅደም ተከተል አዘጋጅ፦",
            "📊 1. አጠቃላይ የቢዝነስ ሁኔታ — ዋና ቁጥሮችን እና የሚያሳዩትን ሁኔታ አጠቃልል።",
            "💰 2. Finance — Sales, Received, Receivable, Expenses, Net Profit, Profit Margin, Cash Flow እርስ በርስ አገናኝ።",
            "📦 3. Stock እና Raw Material — stock quantity, unit, unit cost, stock value, minimum stock በDATA መሰረት ተንትን።",
            "🏭 4. Production እና Recipes — production quantity, recipe, recipe version, production cost እና unit cost አገናኝ።",
            "🧾 5. Orders እና Customers — orders status, delivered/overdue እና customer count ካለ ተንትን።",
            "🔎 6. ዋና ችግሮች — ችግር ካለ በትክክለኛ DATA ማስረጃ አሳይ።",
            "📌 7. ምክንያት እና ማስረጃ — ከDATA የሚረጋገጠውን ብቻ ጻፍ።",
            "📉 8. ተፅዕኖ — ከቁጥሮቹ በቀጥታ የሚወጣውን ግልጽ አድርግ።",
            "💡 9. መፍትሄ — በDATA የታየውን ችግር ለመፍታት ተግባራዊ ሀሳብ ስጥ።",
            "🛠️ 10. ተግባራዊ እርምጃ — ምን መደረግ እንዳለበት በግልጽ እና ተግባራዊ መልኩ ጻፍ።",
            "🎯 11. ቅድሚያ — እርምጃዎችን በችግሩ አስፈላጊነት መሰረት ግለጽ፤ የማይረጋገጥ ነገር አትገምት።",
            "🚀 12. የቅርብ ጊዜ የስራ እቅድ — በDATA ላይ የተመሰረተ ቀጣይ እርምጃ ስጥ።",
            "",
            "እጅግ አስፈላጊ ደንቦች፦",
            "DATA ውስጥ የሌለ ቁጥር፣ ግብይት፣ ወጪ፣ ደንበኛ ባህሪ፣ ምክንያት ወይም ታሪክ አትፍጠር።",
            "የDATA ቁጥሮችን ወደ 0 አትቀይር፣ አትጨምር፣ አትቀንስ።",
            "ከDATA በቀጥታ የሚሰላ ውጤት ብቻ አስላ።",
            "Field names እንደ sales, expenses, profit, stock, orders ያሉትን በራስህ የተሳሳተ ትርጉም አትስጥ፤ ትክክለኛውን ትርጉም ተጠቀም።",
            "መረጃ ካልበቃ 'በDATA ውስጥ በቂ መረጃ የለም' ብለህ ግልጽ አድርግ።",
            "የሪፖርቱን ቀንና ሰዓት ለማሳየት generatedAtEthiopian ብቻ ተጠቀም። generatedAt ፈጽሞ አታሳይ፣ አትጠቀም፣ አትቀይር።",
            "",
            "DATA:",
            JSON.stringify(snapshot, null, 2)
        ].join("\n");
    }

    async function runAnalysis() {
        if (state.running) return;

        state.running = true;
        setStatus("🔎 የቢዝነስ መረጃ እየተተነተነ ነው...");
        setResult("🤖 Management AI ረዥም ትንታኔ እያዘጋጀ ነው...");

        try {
            if (!window.yamGiftManagement ||
                typeof window.yamGiftManagement.getAISnapshot !== "function") {
                throw new Error("Management data snapshot አልተገኘም።");
            }

            if (typeof window.yamGiftManagement.load === "function") {
                await window.yamGiftManagement.load();
            }

            const snapshot = window.yamGiftManagement.getAISnapshot();

            const response = await fetch("/api/management-ai", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    snapshot,
                    requestType: "management_analysis",
                    prompt: buildPrompt(snapshot)
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    errorText || "Management AI ትንታኔ ማግኘት አልቻለም።"
                );
            }

            if (!response.body) {
                throw new Error("Management AI stream አልተገኘም።");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = "";
            let reply = "";

            setResult("");

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith("data:")) continue;

                    const payload = trimmed.slice(5).trim();
                    if (!payload || payload === "[DONE]") continue;

                    try {
                        const chunk = JSON.parse(payload);
                        const content = chunk?.choices?.[0]?.delta?.content;

                        if (content) {
                            reply += content;
                            setResult(reply);
                        }
                    } catch (parseError) {
                        console.warn("Management AI SSE parse:", parseError);
                    }
                }
            }

            reply += decoder.decode();

            if (!reply.trim()) {
                throw new Error("Management AI ባዶ መልስ ሰጥቷል።");
            }

            setResult(reply);
            setStatus("✅ Management AI ትንታኔ ተጠናቋል");
        } catch (error) {
            console.error("Management AI Error:", error);
            setStatus("⚠️ Management AI ትንታኔ ላይ ችግር ተፈጥሯል");
            setResult(
                "❌ ትንታኔው ሊጫን አልቻለም።\n\n" +
                (error.message || "ያልታወቀ ስህተት።") +
                "\n\n🔄 እንደገና ይሞክሩ።"
            );
        } finally {
            state.running = false;
        }
    }

    function start() {
        const button = get("yamManagementAIRefresh");

        if (!button) {
            console.warn("Management AI button not found.");
            return;
        }

        button.addEventListener("click", runAnalysis);
        runAnalysis();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
        start();
    }

    window.yamGiftManagementAI = {
        run: runAnalysis
    };
})();
