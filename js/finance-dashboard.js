(function () {
    "use strict";

    const API = "/api";

    function money(value) {
        const n = Number(value || 0);
        return n.toLocaleString("en-US", {
            maximumFractionDigits: 2
        }) + " ብር";
    }

    async function api(url) {
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok || data.success === false) {
            throw new Error(data.error || "Finance API Error");
        }

        return data;
    }

    function renderCalculationAlarm(control) {
        const box = document.getElementById("financeCalculationAlarm");
        if (!box) return;

        const errors = Array.isArray(control?.results)
            ? control.results.filter(r => r.status === "error")
            : [];

        if (!errors.length) {
            box.innerHTML = `<div class="finance-calculation-ok">
                🟢 <strong>የፋይናንስ ስሌት ቁጥጥር ተሳክቷል</strong><br>
                <span>ሁሉም የተመረመሩ ስሌቶች ትክክል ናቸው።</span>
            </div>`;
            return;
        }

        box.innerHTML = `<div class="finance-calculation-error">
            <div class="finance-alarm-title">🔴 የስሌት ስህተት ተገኝቷል</div>
            ${errors.map(error => `
                <div class="finance-alarm-item">
                    <div>📍 <strong>ቦታ፦</strong> ${error.location || error.calculation || "Finance"}</div>
                    <div>❌ <strong>ችግር፦</strong> ${error.problem || "የስሌት ስህተት"}</div>
                    <div>🔎 <strong>ምክንያት፦</strong> ${error.cause || "የስሌት ምንጭ ይመርምሩ።"}</div>
                    <div>💡 <strong>መፍትሄ፦</strong> ${error.solution || "የስሌቱን ምንጭ ይፈትሹ።"}</div>
                    ${error.actual !== undefined ? `<div>📌 Actual፦ <strong>${money(error.actual)}</strong></div>` : ""}
                    ${error.expected !== undefined ? `<div>✅ Expected፦ <strong>${money(error.expected)}</strong></div>` : ""}
                </div>
            `).join("")}
        </div>`;
    }

    async function loadSummary() {
        const data = await api(`${API}/finance/summary`);
        renderCalculationAlarm(data.calculationControl);

        const sources = data.sources || {};
        const ordersSales = Number(sources.orders || 0);
        const self = sources.selfProducts || {};
        const selfSales = Number(self.sales || 0);
        const selfCost = Number(self.cost || 0);
        const selfProfit = Number(self.profit || 0);

        const expenses = data.expenses || {};
        const profit = data.profit || {};

        const cards = [
            {
                id: "sales",
                icon: "💰",
                title: "ጠቅላላ ሽያጭ",
                value: money(data.sales),
                detail: `
                    <div>🧾 Orders ሽያጭ: <strong>${money(ordersSales)}</strong></div>
                    <div>📦 የራስ ምርት ሽያጭ: <strong>${money(selfSales)}</strong></div>
                `
            },
            {
                id: "received",
                icon: "💳",
                title: "የተከፈለ",
                value: money(data.received),
                detail: `
                    <div>💵 በእጅ የገባ: <strong>${money(data.received)}</strong></div>
                    <div>📌 የሚቀረው: <strong>${money(data.receivable)}</strong></div>
                `
            },
            {
                id: "expenses",
                icon: "💸",
                title: "ጠቅላላ ወጪ",
                value: money(expenses.total),
                detail: `
                    <div>🛠️ የስራ ወጪ: <strong>${money(expenses.workCost)}</strong></div>
                    <div>🧱 የጥሬ እቃ ወጪ: <strong>${money(expenses.materialCost)}</strong></div>
                    <div>📦 የራስ ምርት ወጪ: <strong>${money(selfCost)}</strong></div>
                    <div>🧾 ሌሎች ወጪዎች: <strong>${money(expenses.otherExpenses)}</strong></div>
                `
            },
            {
                id: "profit",
                icon: "📈",
                title: "የተጣራ ትርፍ",
                value: money(profit.net),
                detail: `
                    <div>📊 Profit Margin: <strong>${Number(profit.margin || 0).toFixed(1)}%</strong></div>
                    <div>💰 ጠቅላላ ሽያጭ: <strong>${money(data.sales)}</strong></div>
                    <div>💸 ጠቅላላ ወጪ: <strong>${money(expenses.total)}</strong></div>
                `
            },
            {
                id: "self-products",
                icon: "📦",
                title: "የራስ ምርት",
                value: money(selfSales),
                detail: `
                    <div>💰 ሽያጭ: <strong>${money(selfSales)}</strong></div>
                    <div>💸 ወጪ: <strong>${money(selfCost)}</strong></div>
                    <div>📈 ትርፍ: <strong>${money(selfProfit)}</strong></div>
                `
            },
            {
                id: "cash-flow",
                icon: "💵",
                title: "Cash Flow",
                value: money(data.cashFlow),
                detail: `
                    <div>💳 የተከፈለ: <strong>${money(data.received)}</strong></div>
                    <div>💸 ወጪ: <strong>${money(expenses.total)}</strong></div>
                `
            },
            {
                id: "receivable",
                icon: "📌",
                title: "የሚቀረው",
                value: money(data.receivable),
                detail: `
                    <div>🧾 ከOrders: <strong>የደንበኞች ቀሪ ክፍያ</strong></div>
                    <div>💡 ይህ ገንዘብ ገና አልተሰበሰበም።</div>
                `
            }
        ];

        const container = document.getElementById("financeCards");

        container.innerHTML = cards.map(card => `
            <button type="button"
                class="yam-re-money-card finance-expand-card"
                data-finance-card="${card.id}">
                <span class="finance-card-title">
                    ${card.icon} ${card.title}
                </span>

                <strong class="finance-card-value">
                    ${card.value}
                </strong>

                <span class="finance-card-hint">
                    ዝርዝር ለማየት ይንኩ ▾
                </span>

                <div class="finance-card-detail">
                    ${card.detail}
                </div>
            </button>
        `).join("");

        container.querySelectorAll(".finance-expand-card").forEach(card => {
            card.addEventListener("click", () => {
                card.classList.toggle("is-expanded");
            });
        });

        const sourcesBox = document.getElementById("financeSources");

        if (sourcesBox) {
            sourcesBox.innerHTML = `
                <div class="finance-source-title">📊 የፋይናንስ ምንጮች</div>
                <div class="finance-source-grid">
                    <div>
                        <span>🧾 Orders</span>
                        <strong>${money(ordersSales)}</strong>
                    </div>
                    <div>
                        <span>📦 የራስ ምርት</span>
                        <strong>${money(selfSales)}</strong>
                    </div>
                    <div>
                        <span>💸 ወጪ</span>
                        <strong>${money(expenses.total)}</strong>
                    </div>
                    <div>
                        <span>📈 ትርፍ</span>
                        <strong>${money(profit.net)}</strong>
                    </div>
                </div>
            `;
        }
    }

    async function loadHistory() {
        const data = await api(`${API}/finance/history`);
        const container = document.getElementById("financeHistory");
        const history = Array.isArray(data.history) ? data.history : [];

        if (!history.length) {
            container.innerHTML = `
                <div class="yam-re-finance-history-section">
                    <button type="button" class="finance-history-box-header"
                            aria-expanded="false">
                        <span>📜 Finance History</span>
                        <span class="finance-history-box-arrow">▾</span>
                    </button>
                    <div class="finance-history-list">
                        <div class="yam-re-empty">
                            📭 የፋይናንስ ታሪክ የለም።
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        const historyFilter = document.getElementById("financeHistoryType");
        const selectedType = historyFilter ? historyFilter.value : "all";
        const filteredHistory = selectedType === "all"
            ? history
            : history.filter(item => item.type === selectedType);

        const historyCards = filteredHistory.map((item, index) => {
            const income = Number(item.income || 0);
            const received = Number(item.received || 0);
            const remaining = Number(item.remaining || 0);
            const expense = Number(item.expense || 0);
            const profit = Number(item.profit || 0);

            return `
                <div class="yam-re-finance-history-card finance-history-expand-card"
                     data-history-index="${index}">

                    <div class="finance-history-header">
                        <div class="finance-history-main">
                            <strong class="finance-history-type">
                                ${item.typeLabel || "ፋይናንስ"}
                            </strong>

                            <strong class="finance-history-title">
                                ${item.title || "-"}
                            </strong>

                            <span class="finance-history-date">
                                📅 ${item.date || "-"}
                            </span>

                            ${item.customerName
                                ? `<span class="finance-history-customer">👤 ${item.customerName}</span>`
                                : ""
                            }
                        </div>

                        <span class="finance-history-arrow">▾</span>
                    </div>

                    <div class="finance-history-details">
                        <div class="finance-history-detail-grid">

                            <div>
                                <span>📅 ቀን</span>
                                <strong>${item.date || "-"}</strong>
                            </div>

                            <div>
                                <span>🛍️ ምርት</span>
                                <strong>${item.title || "-"}</strong>
                            </div>

                            ${item.customerName ? `
                            <div>
                                <span>👤 ደንበኛ</span>
                                <strong>${item.customerName}</strong>
                            </div>
                            ` : ""}

                            ${item.phone ? `
                            <div>
                                <span>📱 ስልክ</span>
                                <strong>${item.phone}</strong>
                            </div>
                            ` : ""}

                            ${income > 0 ? `
                            <div class="finance-positive">
                                <span>💰 ጠቅላላ ገቢ</span>
                                <strong>${money(income)}</strong>
                            </div>
                            ` : ""}

                            ${received > 0 ? `
                            <div class="finance-paid">
                                <span>💳 የተከፈለ</span>
                                <strong>${money(received)}</strong>
                            </div>
                            ` : ""}

                            ${remaining > 0 ? `
                            <div class="finance-warning">
                                <span>📌 ቀሪ ክፍያ</span>
                                <strong>${money(remaining)}</strong>
                            </div>
                            ` : ""}

                            ${expense > 0 ? `
                            <div class="finance-expense">
                                <span>💸 ወጪ</span>
                                <strong>${money(expense)}</strong>
                            </div>
                            ` : ""}

                            ${profit !== 0 ? `
                            <div class="finance-profit">
                                <span>📈 ትርፍ</span>
                                <strong>${money(profit)}</strong>
                            </div>
                            ` : ""}

                        </div>

                        <div class="finance-history-source">
                            🔗 ምንጭ: ${item.source || "-"}
                        </div>
                    </div>
                </div>
            `;
        }).join("");

        container.innerHTML = `
            <div class="yam-re-finance-history-section">

                <button type="button"
                        class="finance-history-box-header"
                        aria-expanded="false">
                    <span>📜 Finance History</span>
                    <span class="finance-history-box-arrow">▾</span>
                </button>

                <div class="finance-history-filters">
                    <select id="financeHistoryType">
                        <option value="all">ሁሉም</option>
                        <option value="sale">💰 ሽያጭ</option>
                        <option value="selfProductSale">📦 የራስ ምርት ሽያጭ</option>
                        <option value="purchase">🛒 ግዢ</option>
                        <option value="expense">💸 ወጪ</option>
                    </select>
                </div>

                <div class="finance-history-list">
                    ${historyCards}
                </div>

            </div>
        `;

        const historyType = container.querySelector("#financeHistoryType");
        if (historyType) {
            historyType.addEventListener("change", () => {
                const selected = historyType.value;
                container.querySelectorAll(".finance-history-expand-card").forEach(card => {
                    const index = Number(card.dataset.historyIndex);
                    const item = history[index];
                    card.style.display =
                        selected === "all" || (item && item.type === selected)
                            ? ""
                            : "none";
                });
            });
        }

        const historySection =
            container.querySelector(".yam-re-finance-history-section");

        const historyHeader =
            container.querySelector(".finance-history-box-header");

        if (historyHeader && historySection) {
            historyHeader.addEventListener("click", () => {
                const expanded =
                    historySection.classList.toggle("history-is-expanded");

                historyHeader.setAttribute(
                    "aria-expanded",
                    String(expanded)
                );
            });
        }

        container
            .querySelectorAll(".finance-history-expand-card")
            .forEach(card => {
                const header =
                    card.querySelector(".finance-history-header");

                if (header) {
                    header.addEventListener("click", event => {
                        event.stopPropagation();
                        card.classList.toggle("is-expanded");
                    });
                }
            });
    }

    async function loadFinance() {
        try {
            await Promise.all([
                loadSummary(),
                loadHistory()
            ]);
        } catch (error) {
            console.error("Universal Finance Error:", error);

            document.getElementById("financeCards").innerHTML = `
                <div class="yam-re-error">
                    ❌ ${error.message}
                </div>
            `;
        }
    }

    const refresh = document.getElementById("financeRefresh");

    if (refresh) {
        refresh.addEventListener("click", loadFinance);
    }

    loadFinance();

})();
