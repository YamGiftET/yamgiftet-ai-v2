"use strict";

(function () {
    const refreshButton = document.getElementById("yamManagementAIRefresh");
    const statusBox = document.getElementById("yamManagementAIStatus");
    const resultBox = document.getElementById("yamManagementAIResult");

    if (!refreshButton || !statusBox || !resultBox) return;

    async function runAnalysis() {
        refreshButton.disabled = true;
        statusBox.textContent = "🔎 የቢዝነስ መረጃ እየተሰበሰበ ነው...";
        resultBox.textContent = "";

        try {
            const evidenceResponse = await fetch("/api/management-ai-v2/evidence");
            const evidenceData = await evidenceResponse.json();

            if (!evidenceResponse.ok || !evidenceData.success) {
                throw new Error(evidenceData.error || "Evidence መረጃ ማግኘት አልተቻለም።");
            }

            statusBox.textContent = "🤖 AI የንግድ መረጃውን እየተነተነ ነው...";

            const analysisResponse = await fetch("/api/management-ai-v2/analyze", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    evidence: evidenceData.evidence
                })
            });

            if (!analysisResponse.ok) {
                const errorData = await analysisResponse.json().catch(() => ({}));
                throw new Error(errorData.error || "AI analysis አልተሳካም።");
            }

            const reader = analysisResponse.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let analysis = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                const events = buffer.split("\n\n");
                buffer = events.pop() || "";

                for (const event of events) {
                    const lines = event.split("\n");

                    for (const line of lines) {
                        if (!line.startsWith("data:")) continue;

                        const data = line.slice(5).trim();
                        if (!data || data === "[DONE]") continue;

                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed?.choices?.[0]?.delta?.content;

                            if (content) {
                                analysis += content;
                                resultBox.textContent = analysis;
                            }
                        } catch (_) {
                            // Ignore non-JSON SSE control lines.
                        }
                    }
                }
            }

            if (!analysis.trim()) {
                throw new Error("AI ምንም የሚጠቅም ትንታኔ አልመለሰም።");
            }

            statusBox.textContent = "✅ Management AI v2 ትንታኔ ተጠናቋል";
        } catch (error) {
            statusBox.textContent = "❌ ትንታኔው አልተሳካም";
            resultBox.textContent = error.message || "ያልታወቀ ስህተት።";
        } finally {
            refreshButton.disabled = false;
        }
    }

    refreshButton.addEventListener("click", runAnalysis);
})();
