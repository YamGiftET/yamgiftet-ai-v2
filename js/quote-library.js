/* =====================================
   YamGiftET AI — Quote Library
   ===================================== */

const quoteLibrary = {
    quotes: [],
    activeTab: "all",

    async load() {
        const list = document.getElementById("quoteLibraryList");
        if (!list) return;

        list.innerHTML = `
            <div class="quote-library-empty">
                ⏳ ጥቅሶች እየተጫኑ ነው...
            </div>
        `;

        try {
            const response = await fetch("/api/quote-assistant/quotes");
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || "ጥቅሶችን ማምጣት አልተቻለም።");
            }

            this.quotes = Array.isArray(data.quotes) ? data.quotes : [];
            this.render();
            this.updateStats();

        } catch (error) {
            console.error("Quote Library Error:", error);

            list.innerHTML = `
                <div class="quote-library-empty quote-library-error">
                    ⚠️ ጥቅሶችን ማምጣት አልተቻለም።
                </div>
            `;
        }
    },

    render() {
        const list = document.getElementById("quoteLibraryList");
        if (!list) return;

        const visibleQuotes = this.quotes.filter(item => {
            const isTrash = item.trashed === true;
            const isFavorite = item.favorite === true;

            if (this.activeTab === "trash") return isTrash;
            if (this.activeTab === "favorites") return !isTrash && isFavorite;
            return !isTrash;
        });

        if (!visibleQuotes.length) {
            const message =
                this.activeTab === "trash"
                    ? "🗑️ Trash ባዶ ነው።"
                    : this.activeTab === "favorites"
                    ? "⭐ እስካሁን Favorite የተደረገ ጥቅስ የለም።"
                    : "📭 እስካሁን የተቀመጠ ምርጥ ጥቅስ የለም።";

            list.innerHTML = `
                <div class="quote-library-empty">${message}</div>
            `;
            return;
        }

        list.innerHTML = visibleQuotes.map((item) => {
            const originalIndex = this.quotes.indexOf(item);
            const number = originalIndex + 1;
            const favoriteLabel = item.favorite === true
                ? "⭐ Favorite"
                : "☆ Favorite";

            const actions = this.activeTab === "trash"
                ? `
                    <button type="button" onclick="quoteLibrary.restore(${originalIndex})">
                        ♻️ Restore
                    </button>
                    <button type="button" onclick="quoteLibrary.deleteForever(${originalIndex})">
                        🗑️ Delete Forever
                    </button>
                `
                : `
                    <button type="button" onclick="quoteLibrary.favorite(${originalIndex})">
                        ${favoriteLabel}
                    </button>
                    <button type="button" onclick="quoteLibrary.trash(${originalIndex})">
                        🗑️ Trash
                    </button>
                `;

            return `
                <article class="quote-library-item">
                    <div class="quote-library-score">
                        #${number} &nbsp; ⭐ ${Number(item.score || 0)}/100
                    </div>

                    <p class="quote-library-text">
                        ${escapeQuoteHtml(item.emoji || "💬")}
                        ${escapeQuoteHtml(item.quote || "")}
                    </p>

                    <div class="quote-library-meta">
                        <span>📅 ${formatQuoteDate(item.createdAt)}</span>

                        <button
                            type="button"
                            onclick="quoteLibrary.copyByIndex(${originalIndex})">
                            📋 ቅዳ
                        </button>

                        ${actions}
                    </div>
                </article>
            `;
        }).join("");
    },

    async favorite(index) {
        const item = this.quotes[index];
        if (!item?.id) return;

        try {
            const response = await fetch(
                `/api/quote-assistant/quotes/${encodeURIComponent(item.id)}/favorite`,
                { method: "PATCH" }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || "Favorite ማድረግ አልተቻለም።");
            }

            item.favorite = data.favorite === true;
            this.render();
            this.updateStats();
        } catch (error) {
            console.error("Quote Favorite Error:", error);
            alert(error.message || "Favorite ማድረግ አልተቻለም።");
        }
    },

    async trash(index) {
        const item = this.quotes[index];
        if (!item?.id) return;

        try {
            const response = await fetch(
                `/api/quote-assistant/quotes/${encodeURIComponent(item.id)}/trash`,
                { method: "PATCH" }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || "Trash ማድረግ አልተቻለም።");
            }

            item.trashed = true;
            this.render();
            this.updateStats();
        } catch (error) {
            console.error("Quote Trash Error:", error);
            alert(error.message || "Trash ማድረግ አልተቻለም።");
        }
    },

    async restore(index) {
        const item = this.quotes[index];
        if (!item?.id) return;

        try {
            const response = await fetch(
                `/api/quote-assistant/quotes/${encodeURIComponent(item.id)}/restore`,
                { method: "PATCH" }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || "Restore ማድረግ አልተቻለም።");
            }

            item.trashed = false;
            this.render();
            this.updateStats();
        } catch (error) {
            console.error("Quote Restore Error:", error);
            alert(error.message || "ጥቅሱን መመለስ አልተቻለም።");
        }
    },

    async deleteForever(index) {
        const item = this.quotes[index];
        if (!item?.id) return;

        if (!confirm("ይህን ጥቅስ በቋሚነት ማጥፋት ይፈልጋሉ?")) {
            return;
        }

        try {
            const response = await fetch(
                `/api/quote-assistant/quotes/${encodeURIComponent(item.id)}`,
                { method: "DELETE" }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || "ጥቅሱን መሰረዝ አልተቻለም።");
            }

            this.quotes.splice(index, 1);
            this.render();
            this.updateStats();
        } catch (error) {
            console.error("Quote Permanent Delete Error:", error);
            alert(error.message || "ጥቅሱን መሰረዝ አልተቻለም።");
        }
    },

    setTab(tab) {
        if (!["all", "favorites", "trash"].includes(tab)) {
            tab = "all";
        }

        this.activeTab = tab;

        document.querySelectorAll(".quote-library-tab").forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.tab === tab
            );
        });

        this.render();
        this.updateStats();
    },

    bindTabs() {
        document.querySelectorAll(".quote-library-tab").forEach(button => {
            button.addEventListener("click", () => {
                this.setTab(button.dataset.tab);
            });
        });
    },

    renderOldMarker() {

        if (!list) return;

        if (!this.quotes.length) {
            list.innerHTML = `
                <div class="quote-library-empty">
                    📭 እስካሁን የተቀመጠ ምርጥ ጥቅስ የለም።
                </div>
            `;
            return;
        }

        list.innerHTML = this.quotes.map((item) => `
            <article class="quote-library-item">
                <div class="quote-library-score">
                    ⭐ ${Number(item.score || 0)}/100
                </div>

                <p class="quote-library-text">${escapeQuoteHtml(item.emoji || "💬")} ${escapeQuoteHtml(item.quote || "")}</p>

                <div class="quote-library-meta">
                    <span>📅 ${formatQuoteDate(item.createdAt)}</span>
                    <button
                        type="button"
                        onclick="quoteLibrary.copyByIndex(${this.quotes.indexOf(item)})">
                        📋 ቅዳ
                    </button>
                </div>
            </article>
        `).join("");
    },

    async generate() {
        const button = document.getElementById("generateQuoteButton");
        if (button) {
            button.disabled = true;
            button.textContent = "⏳ እየፈጠረ...";
        }

        try {
            const response = await fetch("/api/quote-assistant/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({})
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || "ጥቅስ ማመንጨት አልተቻለም።");
            }

            await this.load();

        } catch (error) {
            console.error("Quote Generate Error:", error);
            alert(error.message || "ጥቅስ ማመንጨት አልተቻለም።");

        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = "✨ አዲስ ምርጥ ጥቅስ";
            }
        }
    },

    async copyByIndex(index) {
        const quote = this.quotes[index]?.quote || "";
        await this.copy(quote);
    },

    async copy(quote) {
        try {
            const text = String(quote || "");

            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                const textarea = document.createElement("textarea");
                textarea.value = text;
                textarea.setAttribute("readonly", "");
                textarea.style.position = "fixed";
                textarea.style.left = "-9999px";
                document.body.appendChild(textarea);
                textarea.select();
                textarea.setSelectionRange(0, textarea.value.length);
                const copied = document.execCommand("copy");
                textarea.remove();

                if (!copied) {
                    throw new Error("Copy command failed");
                }
            }

            alert("✅ ጥቅሱ ተቀድቷል።");
        } catch (error) {
            console.error("Quote Copy Error:", error);
            alert("⚠️ ጥቅሱን መቅዳት አልተቻለም።");
        }
    },

    updateStats() {
        const total = this.quotes.length;

        const totalElement = document.getElementById("quoteLibraryTotal");
        if (totalElement) {
            totalElement.textContent = total;
        }

        const todayElement = document.getElementById("quoteLibraryToday");
        if (todayElement) {
            const today = new Date().toISOString().slice(0, 10);

            const count = this.quotes.filter(item => {
                if (!item.createdAt) return false;
                return String(item.createdAt).slice(0, 10) === today;
            }).length;

            todayElement.textContent = count;
        }

        const bestElement = document.getElementById("quoteLibraryBestScore");
        if (bestElement) {
            const best = this.quotes.reduce(
                (max, item) => Math.max(max, Number(item.score || 0)),
                0
            );

            bestElement.textContent = best ? `${best}/100` : "—";
        }
    }
};

function escapeQuoteHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatQuoteDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString("am-ET", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

window.quoteLibrary = quoteLibrary;

document.addEventListener("DOMContentLoaded", () => {
    quoteLibrary.bindTabs();
    quoteLibrary.load();
});
