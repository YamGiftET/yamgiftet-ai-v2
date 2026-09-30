/* =========================================================
   YamGiftET AI v2
   RAW MATERIALS + EXPENSES + FINANCIAL DASHBOARD UI
   Stage 2 — New isolated module
   ========================================================= */

(function () {
    "use strict";

    const API = "/api";

    let materials = [];
    let expenses = [];

    function esc(value) {
        const div = document.createElement("div");
        div.textContent = String(value ?? "");
        return div.innerHTML;
    }

    function money(value) {
        return Number(value || 0).toLocaleString("en-US") + " ብር";
    }

    function number(value) {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    }

    async function api(url, options = {}) {
        const response = await fetch(url, {
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            },
            ...options
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || data.success === false) {
            throw new Error(
                data.error || "የመረጃ ጥያቄው አልተሳካም።"
            );
        }

        return data;
    }

    function getTodayEthiopian() {
        try {
            const now = new Date();

            if (typeof gregorianToEthiopian === "function") {
                const result = gregorianToEthiopian(
                    now.getFullYear(),
                    now.getMonth() + 1,
                    now.getDate()
                );

                if (
                    result &&
                    result.year &&
                    result.month &&
                    result.day
                ) {
                    return {
                        year: Number(result.year),
                        month: Number(result.month),
                        day: Number(result.day)
                    };
                }
            }
        } catch (error) {
            console.warn(
                "Ethiopian calendar conversion unavailable:",
                error
            );
        }

        return null;
    }

    function buildEthiopianDateFields(prefix, label) {
        const today = getTodayEthiopian();

        const year = today ? today.year : "";
        const month = today ? today.month : "";
        const day = today ? today.day : "";

        return `
            <div class="yam-et-date">
                <label>${esc(label)}</label>

                <div class="yam-et-date-grid">
                    <input
                        id="${prefix}Year"
                        type="number"
                        min="1900"
                        max="2500"
                        value="${year}"
                        placeholder="ዓመት"
                    >

                    <select id="${prefix}Month">
                        <option value="">ወር</option>
                        ${[
                            "መስከረም",
                            "ጥቅምት",
                            "ኅዳር",
                            "ታኅሣሥ",
                            "ጥር",
                            "የካቲት",
                            "መጋቢት",
                            "ሚያዝያ",
                            "ግንቦት",
                            "ሰኔ",
                            "ሐምሌ",
                            "ነሐሴ",
                            "ጳጉሜ"
                        ]
                            .map(
                                (name, index) => `
                                    <option
                                        value="${index + 1}"
                                        ${Number(month) === index + 1 ? "selected" : ""}
                                    >
                                        ${name}
                                    </option>
                                `
                            )
                            .join("")}
                    </select>

                    <input
                        id="${prefix}Day"
                        type="number"
                        min="1"
                        max="30"
                        value="${day}"
                        placeholder="ቀን"
                    >
                </div>
            </div>
        `;
    }

    function sectionExists() {
        return document.getElementById(
            "yamRawExpenseDashboard"
        );
    }

    function createSection() {
        if (sectionExists()) {
            return sectionExists();
        }

        const section = document.createElement("section");

        section.id = "yamRawExpenseDashboard";
        section.className = "yam-raw-expense-dashboard";

        section.innerHTML = `
            <div class="yam-re-header">
                <div>
                    <h2>📦 ጥሬ እቃዎች እና ወጪዎች</h2>
                    <p>
                        የጥሬ እቃ ግዢ፣ Stock፣ ሌሎች ወጪዎች
                        እና የፋይናንስ ማጠቃለያ
                    </p>
                </div>

                <button
                    type="button"
                    id="yamRERefresh"
                    class="yam-re-refresh"
                >
                    🔄 አድስ
                </button>
            </div>

            <div id="yamREFinancialCards"
                 class="yam-re-financial-cards">
                <div class="yam-re-loading">
                    ⏳ የፋይናንስ መረጃ እየተጫነ ነው...
                </div>
            </div>

            <div class="yam-re-tabs">
                <button
                    type="button"
                    class="yam-re-tab active"
                    data-tab="materials"
                >
                    📦 ጥሬ እቃ
                </button>

                <button
                    type="button"
                    class="yam-re-tab"
                    data-tab="purchases"
                >
                    🛒 ግዢ
                </button>

                <button
                    type="button"
                    class="yam-re-tab"
                    data-tab="expenses"
                >
                    💸 ሌሎች ወጪዎች
                </button>

                <button
                    type="button"
                    class="yam-re-tab"
                    data-tab="financial"
                >
                    📊 ፋይናንስ
                </button>
            </div>

            <div id="yamRETabMaterials"
                 class="yam-re-tab-panel active">

                <div class="yam-re-panel-header">
                    <div>
                        <h3>📦 የጥሬ እቃ ዝርዝር</h3>
                        <p>
                            Stock እና የእቃ ዋጋ መከታተያ
                        </p>
                    </div>

                    <button
                        type="button"
                        id="yamREAddMaterial"
                        class="yam-re-primary"
                    >
                        ➕ ጥሬ እቃ ጨምር
                    </button>
                </div>

                <div id="yamREMaterialsList">
                    ⏳ እየተጫነ...
                </div>
            </div>

            <div id="yamRETabPurchases"
                 class="yam-re-tab-panel">

                <div class="yam-re-panel-header">
                    <div>
                        <h3>🛒 የጥሬ እቃ ግዢ</h3>
                        <p>
                            ግዢ ሲመዘገብ Stock በራሱ ይጨምራል።
                        </p>
                    </div>
                </div>

                <div style="margin:14px 0;">
                    <button
                        type="button"
                        id="yamREAddPurchaseMaterial"
                        class="yam-re-primary"
                    >
                        ➕ አዲስ ጥሬ እቃ
                    </button>
                </div>

                <div class="yam-re-purchase-selector">
                    <label for="yamREPurchaseMaterial">
                        📦 ጥሬ እቃ ይምረጡ
                    </label>

                    <select id="yamREPurchaseMaterial">
                        <option value="">-- ጥሬ እቃ ይምረጡ --</option>
                        ${materials.map(material => `
                            <option value="${esc(material.id)}">
                                ${esc(material.materialName)}
                                (${esc(material.unit || "pcs")})
                            </option>
                        `).join("")}
                    </select>
                </div>

                <div id="yamREPurchasesList">
                    ጥሬ እቃ በመጀመሪያ ይምረጡ።
                </div>
            </div>

            <div id="yamRETabExpenses"
                 class="yam-re-tab-panel">

                <div class="yam-re-panel-header">
                    <div>
                        <h3>💸 ሌሎች የንግድ ወጪዎች</h3>
                        <p>
                            ትራንስፖርት፣ መላኪያ፣ ኪራይ
                            እና ሌሎች ወጪዎች
                        </p>
                    </div>

                    <button
                        type="button"
                        id="yamREAddExpense"
                        class="yam-re-primary"
                    >
                        ➕ ወጪ መዝግብ
                    </button>
                </div>

                <div id="yamREExpensesList">
                    ⏳ እየተጫነ...
                </div>
            </div>

            <div id="yamRETabFinancial"
                 class="yam-re-tab-panel">

                <div class="yam-re-panel-header">
                    <div>
                        <h3>📊 የፋይናንስ ማጠቃለያ</h3>
                        <p>
                            ሽያጭ፣ ወጪ እና የተገመተ የተጣራ ትርፍ
                        </p>
                    </div>
                </div>

                <div id="yamREFinancialDetails">
                <div id="yamREFinanceHistory"></div>
                    ⏳ እየተጫነ...
                </div>
            </div>

            <div
                id="yamREModal"
                class="yam-re-modal"
                style="display:none;"
            ></div>
        `;

        const main =
            document.querySelector("main") ||
            document.body;

        main.appendChild(section);

        bindEvents();

        return section;
    }

    function bindEvents() {
        document
            .querySelectorAll(".yam-re-tab")
            .forEach(button => {
                button.addEventListener("click", () => {
                    const target = button.dataset.tab;

                    document
                        .querySelectorAll(".yam-re-tab")
                        .forEach(item =>
                            item.classList.remove("active")
                        );

                    document
                        .querySelectorAll(".yam-re-tab-panel")
                        .forEach(panel =>
                            panel.classList.remove("active")
                        );

                    button.classList.add("active");

                    const panel = document.getElementById(
                        "yamRETab" +
                        target.charAt(0).toUpperCase() +
                        target.slice(1)
                    );

                    if (panel) {
                        panel.classList.add("active");
                    }
                });
            });

        const refresh = document.getElementById(
            "yamRERefresh"
        );

        if (refresh) {
            refresh.addEventListener(
                "click",
                loadRawExpenseDashboard
            );
        }

        const addPurchaseMaterial = document.getElementById(
            "yamREAddPurchaseMaterial"
        );

        if (addPurchaseMaterial) {
            addPurchaseMaterial.addEventListener(
                "click",
                () => showMaterialModal()
            );
        }

        const purchaseMaterial = document.getElementById(
            "yamREPurchaseMaterial"
        );

        if (purchaseMaterial) {
            purchaseMaterial.addEventListener(
                "change",
                () => {
                    const materialId = purchaseMaterial.value;

                    if (!materialId) {
                        const list = document.getElementById(
                            "yamREPurchasesList"
                        );

                        if (list) {
                            list.textContent =
                                "ጥሬ እቃ በመጀመሪያ ይምረጡ።";
                        }

                        return;
                    }

                    loadPurchaseHistory(materialId);
                }
            );
        }

        const addMaterial = document.getElementById(
            "yamREAddMaterial"
        );

        if (addMaterial) {
            addMaterial.addEventListener(
                "click",
                () => showMaterialModal()
            );
        }

        const addExpense = document.getElementById(
            "yamREAddExpense"
        );

        if (addExpense) {
            addExpense.addEventListener(
                "click",
                () => showExpenseModal()
            );
        }
    }

    async function loadMaterials() {
        const data = await api(
            `${API}/raw-materials`
        );

        materials = Array.isArray(data.materials)
            ? data.materials
            : [];

        renderMaterials();

        const purchaseMaterial = document.getElementById(
            "yamREPurchaseMaterial"
        );

        if (purchaseMaterial) {
            purchaseMaterial.innerHTML = `
                <option value="">
                    -- ጥሬ እቃ ይምረጡ --
                </option>
                ${materials.map(material => `
                    <option value="${esc(material.id)}">
                        ${esc(material.materialName)}
                        (${esc(material.unit || "pcs")})
                    </option>
                `).join("")}
            `;
        }
    }

    async function loadPurchaseHistory(materialId) {
        const list = document.getElementById(
            "yamREPurchasesList"
        );

        if (!list) return;

        list.textContent =
            "⏳ የግዢ ታሪክ እየተጫነ...";

        try {
            const data = await api(
                `${API}/raw-materials/${encodeURIComponent(materialId)}/purchases`
            );

            renderPurchaseHistory(data);
        } catch (error) {
            console.error(
                "Purchase History Error:",
                error
            );

            list.innerHTML = `
                <div class="yam-re-empty">
                    ❌ የግዢ ታሪኩን ማምጣት አልተቻለም።
                </div>
            `;
        }
    }

    function renderPurchaseHistory(data) {
        const container = document.getElementById(
            "yamREPurchasesList"
        );

        if (!container) return;

        const purchases = Array.isArray(data?.purchases)
            ? data.purchases
            : [];

        const summary = data?.summary || {};
        const quantityByUnit =
            summary.quantityByUnit &&
            typeof summary.quantityByUnit === "object"
                ? summary.quantityByUnit
                : {};

        if (!purchases.length) {
            container.innerHTML = `
                <div class="yam-re-empty">
                    🛒 ለዚህ ጥሬ እቃ የግዢ ታሪክ የለም።
                </div>
            `;
            return;
        }

        const quantitySummary =
            Object.entries(quantityByUnit)
                .map(
                    ([unit, quantity]) =>
                        `${number(quantity)} ${esc(unit)}`
                )
                .join(" + ");

        container.innerHTML = `
            <div class="yam-re-purchase-history">

                <div class="yam-re-summary-grid">
                    <div>
                        <small>🧾 የግዢ ብዛት</small>
                        <strong>
                            ${quantitySummary || "-"}
                        </strong>
                    </div>

                    <div>
                        <small>💰 ጠቅላላ የግዢ ዋጋ</small>
                        <strong>
                            ${money(summary.totalCost)}
                        </strong>
                    </div>
                </div>

                <div class="yam-re-purchase-list">
                    ${purchases
                        .map(purchase => `
                            <div class="yam-re-purchase-card">

                                <div>
                                    <strong>
                                        📅 ${esc(
                                            purchase.purchaseDate || "-"
                                        )}
                                    </strong>
                                </div>

                                <p>
                                    🆔 Batch ID:
                                    <strong>${esc(purchase.batchId || "-")}</strong>
                                </p>

                                ${
                                    ["mm2", "cm2", "m2"].includes(purchase.unit)
                                        ? `
                                            <p>
                                                📐 Dimensions:
                                                <strong>
                                                    ${
    purchase.length != null &&
    purchase.width != null &&
    purchase.dimensionUnit
        ? `${number(purchase.length)} × ${number(purchase.width)} ${esc(purchase.dimensionUnit)}`
        : "—"
}
                                                </strong>
                                            </p>

                                            <p>
                                                📏 Area:
                                                <strong>
                                                    ${
    purchase.area != null &&
    purchase.areaUnit
        ? `${number(purchase.area)} ${esc(purchase.areaUnit)}`
        : "—"
}
                                                </strong>
                                            </p>

                                            ${
                                                purchase.thickness && number(purchase.thickness) > 0
                                                    ? `
                                                        <p>
                                                            📎 Thickness:
                                                            <strong>
                                                                ${number(purchase.thickness)} ${esc(purchase.thicknessUnit || "mm")}
                                                            </strong>
                                                        </p>
                                                    `
                                                    : ""
                                            }

                                            <p>
                                                💳 Purchase Price:
                                                <strong>${
    purchase.purchasePrice != null
        ? money(purchase.purchasePrice)
        : "—"
}</strong>
                                            </p>
                                        `
                                        : ""
                                }

                                <p>
                                    📦 ብዛት:
                                    <strong>
                                        ${number(
                                            purchase.quantity
                                        )}
                                        ${esc(
                                            purchase.unit || ""
                                        )}
                                    </strong>
                                </p>

                                <p>
                                    💵 Unit Cost:
                                    <strong>
                                        ${money(
                                            purchase.unitCost
                                        )}/${esc(
                                            purchase.unit || ""
                                        )}
                                    </strong>
                                </p>

                                <p>
                                    💰 Total Cost:
                                    <strong>
                                        ${money(
                                            purchase.totalCost
                                        )}
                                    </strong>
                                </p>

                                <p>
                                    🏪 Supplier:
                                    ${esc(
                                        purchase.supplier || "-"
                                    )}
                                </p>

                                ${
                                    purchase.notes
                                        ? `
                                            <p>
                                                📝 ${esc(
                                                    purchase.notes
                                                )}
                                            </p>
                                        `
                                        : ""
                                }

                            </div>
                        `)
                        .join("")}
                </div>

            </div>
        `;
    }

    async function loadExpenses() {
        const data = await api(
            `${API}/expenses`
        );

        expenses = Array.isArray(data.expenses)
            ? data.expenses
            : [];

        renderExpenses();
    }

    async function loadFinancialSummary() {
        const data = await api(
            `${API}/finance/summary`
        );

        renderFinancialCards(data);
        renderFinancialDetails(data);
    }

    async function loadFinanceHistory() {
        const data = await api(`${API}/finance/history`);
        renderFinanceHistory(data);
    }

    function renderFinanceHistory(data) {
        const container = document.getElementById("yamREFinanceHistory");
        if (!container) return;

        const history = Array.isArray(data.history) ? data.history : [];

        container.innerHTML = `
            <div class="yam-re-history">
                <h3>📜 Universal Finance History</h3>
                <div class="yam-re-history-filters">
                    <select id="yamREHistoryType">
                        <option value="all">ሁሉም</option>
                        <option value="sale">💰 ሽያጭ</option>
                        <option value="purchase">🛒 ግዢ</option>
                        <option value="expense">💸 ወጪ</option>
                        <option value="selfProductSale">📦 የራስ ምርት ሽያጭ</option>
                    </select>
                </div>
                <div id="yamREHistoryList"></div>
            </div>
        `;

        const list = document.getElementById("yamREHistoryList");
        const typeSelect = document.getElementById("yamREHistoryType");

        function draw() {
            const type = typeSelect.value;
            const filtered = type === "all"
                ? history
                : history.filter(item => item.type === type);

            if (!filtered.length) {
                list.innerHTML =
                    `<div class="yam-re-empty">📭 የFinance History መረጃ የለም።</div>`;
                return;
            }

            list.innerHTML = filtered.map(item => `
                <div class="yam-re-history-row">
                    <div>
                        <strong>${item.typeLabel || ""}</strong>
                        <span>${item.title || ""}</span>
                        <small>${item.customerName || ""}</small>
                    </div>
                    <div>
                        <small>${item.date || ""}</small>
                        <strong>${item.income > 0
                            ? "+" + money(item.income)
                            : "-" + money(item.expense)}</strong>
                    </div>
                </div>
            `).join("");
        }

        typeSelect.addEventListener("change", draw);
        draw();
    }

    async function loadRawExpenseDashboard() {
        createSection();

        try {
            await Promise.all([
                loadMaterials(),
                loadExpenses(),
                loadFinancialSummary(),
                loadFinanceHistory()
            ]);
        } catch (error) {
            console.error(
                "Raw/Expense Dashboard Error:",
                error
            );

            const section =
                document.getElementById(
                    "yamRawExpenseDashboard"
                );

            if (section) {
                const existing =
                    section.querySelector(
                        ".yam-re-error"
                    );

                if (!existing) {
                    const errorBox =
                        document.createElement("div");

                    errorBox.className =
                        "yam-re-error";

                    errorBox.textContent =
                        "❌ " +
                        (
                            error.message ||
                            "የጥሬ እቃ/ወጪ መረጃ ማምጣት አልተቻለም።"
                        );

                    section.prepend(errorBox);
                }
            }
        }
    }

    function renderFinancialCards(data) {
        const container =
            document.getElementById(
                "yamREFinancialCards"
            );

        if (!container) return;

        const sales = data.sales || {};
        const expensesData = data.expenses || {};
        const profit = data.profit || {};

        container.innerHTML = `
            <div class="yam-re-money-card">
                <span>💰 ጠቅላላ ሽያጭ</span>
                <strong>${money(sales)}</strong>
            </div>

            <div class="yam-re-money-card">
                <span>💸 ጠቅላላ ወጪ</span>
                <strong>${money(expensesData.total)}</strong>
            </div>

            <div class="yam-re-money-card">
                <span>📈 የተጣራ ትርፍ</span>
                <strong>${money(profit.net)}</strong>
            </div>

            <div class="yam-re-money-card">
                <span>💳 የተከፈለ</span>
                <strong>${money(data.received)}</strong>
            </div>

            <div class="yam-re-money-card">
                <span>📌 የሚቀረው</span>
                <strong>${money(data.receivable)}</strong>
            </div>

            <div class="yam-re-money-card">
                <span>💵 Cash Flow</span>
                <strong>${money(data.cashFlow)}</strong>
            </div>

            <div class="yam-re-money-card">
                <span>📊 Profit Margin</span>
                <strong>${number(profit.margin).toFixed(1)}%</strong>
            </div>
        `;
    }

    function renderMaterials() {
        const container =
            document.getElementById(
                "yamREMaterialsList"
            );

        if (!container) return;

        if (!materials.length) {
            container.innerHTML = `
                <div class="yam-re-empty">
                    📦 እስካሁን ጥሬ እቃ አልተመዘገበም።
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="yam-re-material-grid">
                ${materials
                    .map(material => {
                        const lowStock =
                            number(material.stock) <=
                            number(material.minimumStock);

                        return `
                            <div class="yam-re-material-card">

                                ${
                                    material.photoUrl
                                        ? `
                                            <img
                                                src="${esc(
                                                    material.photoUrl
                                                )}"
                                                alt="${esc(
                                                    material.materialName
                                                )}"
                                            >
                                        `
                                        : ""
                                }

                                <h4>
                                    ${esc(
                                        material.materialName
                                    )}
                                </h4>

                                <p>
                                    📂
                                    ${esc(
                                        material.category ||
                                        "ሌላ"
                                    )}
                                </p>

                                <p>
                                    📦 ክምችት:
                                    <strong>
                                        ${number(
                                            material.stock
                                        )}
                                        ${esc(
                                            material.unit ||
                                            ""
                                        )}
                                    </strong>
                                </p>

                                <p>
                                    💵 የአንድ እቃ ዋጋ:
                                    <strong>
                                        ${money(
                                            material.unitCost
                                        )}
                                    </strong>
                                </p>

                                <p>
                                    💰 የክምችት ዋጋ:
                                    <strong>
                                        ${money(
                                            material.stockValue
                                        )}
                                    </strong>
                                </p>

                                ${
                                    lowStock
                                        ? `
                                            <div class="yam-re-low-stock">
                                                ⚠️ Stock ዝቅተኛ ነው
                                            </div>
                                        `
                                        : ""
                                }

                                <div class="yam-re-card-actions">

                                    <button
                                        type="button"
                                        data-material-purchase="${esc(
                                            material.id
                                        )}"
                                    >
                                        🛒 ግዢ
                                    </button>

                                    <button
                                        type="button"
                                        data-material-edit="${esc(
                                            material.id
                                        )}"
                                    >
                                        ✏️
                                    </button>

                                    <button
                                        type="button"
                                        data-material-delete="${esc(
                                            material.id
                                        )}"
                                    >
                                        🗑️
                                    </button>

                                </div>
                            </div>
                        `;
                    })
                    .join("")}
            </div>
        `;

        container
            .querySelectorAll(
                "[data-material-purchase]"
            )
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () =>
                        showPurchaseModal(
                            button.dataset.materialPurchase
                        )
                );
            });

        container
            .querySelectorAll(
                "[data-material-edit]"
            )
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () =>
                        showMaterialModal(
                            button.dataset.materialEdit
                        )
                );
            });

        container
            .querySelectorAll(
                "[data-material-delete]"
            )
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () =>
                        deleteMaterial(
                            button.dataset.materialDelete
                        )
                );
            });
    }

    function renderExpenses() {
        const container =
            document.getElementById(
                "yamREExpensesList"
            );

        if (!container) return;

        if (!expenses.length) {
            container.innerHTML = `
                <div class="yam-re-empty">
                    💸 እስካሁን ሌላ ወጪ አልተመዘገበም።
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="yam-re-expense-list">
                ${expenses
                    .map(expense => `
                        <div class="yam-re-expense-row">

                            <div>
                                <strong>
                                    ${esc(
                                        expense.title
                                    )}
                                </strong>

                                <small>
                                    ${esc(
                                        expense.category ||
                                        "ሌላ"
                                    )}
                                    •
                                    ${esc(
                                        expense.expenseDate ||
                                        "-"
                                    )}
                                </small>

                                ${
                                    expense.description
                                        ? `
                                            <small>
                                                ${esc(
                                                    expense.description
                                                )}
                                            </small>
                                        `
                                        : ""
                                }
                            </div>

                            <strong>
                                ${money(
                                    expense.amount
                                )}
                            </strong>

                            <div
                                class="yam-re-card-actions"
                            >
                                <button
                                    type="button"
                                    data-expense-edit="${esc(
                                        expense.id
                                    )}"
                                >
                                    ✏️
                                </button>

                                <button
                                    type="button"
                                    data-expense-delete="${esc(
                                        expense.id
                                    )}"
                                >
                                    🗑️
                                </button>
                            </div>

                        </div>
                    `)
                    .join("")}
            </div>
        `;

        container
            .querySelectorAll(
                "[data-expense-edit]"
            )
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () =>
                        showExpenseModal(
                            button.dataset.expenseEdit
                        )
                );
            });

        container
            .querySelectorAll(
                "[data-expense-delete]"
            )
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () =>
                        deleteExpense(
                            button.dataset.expenseDelete
                        )
                );
            });
    }

    function renderFinancialDetails(data) {
        const container =
            document.getElementById(
                "yamREFinancialDetails"
            );

        if (!container) return;

        const expensesData = data.expenses || {};
        const profit = data.profit || {};

        container.innerHTML = `
            <div class="yam-re-financial-detail-grid">

                <div>
                    <span>💳 የተከፈለ</span>
                    <strong>${money(data.received)}</strong>
                </div>

                <div>
                    <span>📌 የሚቀረው</span>
                    <strong>${money(data.receivable)}</strong>
                </div>

                <div>
                    <span>🛠️ የስራ ወጪ</span>
                    <strong>${money(expensesData.workCost)}</strong>
                </div>

                <div>
                    <span>📦 የጥሬ እቃ ግዢ</span>
                    <strong>${money(expensesData.materialCost)}</strong>
                </div>

                <div>
                    <span>💸 ሌሎች ወጪዎች</span>
                    <strong>${money(expensesData.otherExpenses)}</strong>
                </div>

                <div>
                    <span>📉 ጠቅላላ ወጪ</span>
                    <strong>${money(expensesData.total)}</strong>
                </div>

                <div class="yam-re-profit">
                    <span>📈 የተጣራ ትርፍ</span>
                    <strong>${money(profit.net)}</strong>
                </div>

                <div>
                    <span>📊 የትርፍ መጠን</span>
                    <strong>${number(profit.margin).toFixed(1)}%</strong>
                </div>

                <div>
                    <span>💵 Cash Flow</span>
                    <strong>${money(data.cashFlow)}</strong>
                </div>

            </div>
        `;
    }

    function openModal(html) {
        const modal =
            document.getElementById(
                "yamREModal"
            );

        if (!modal) return;

        modal.innerHTML = `
            <div class="yam-re-modal-box">
                ${html}
            </div>
        `;

        modal.style.display = "flex";

        const close =
            modal.querySelector(
                "[data-yam-re-close]"
            );

        if (close) {
            close.addEventListener(
                "click",
                closeModal
            );
        }
    }

    function closeModal() {
        const modal =
            document.getElementById(
                "yamREModal"
            );

        if (modal) {
            modal.style.display = "none";
            modal.innerHTML = "";
        }
    }

    function showMaterialModal(id = "") {
        const material =
            materials.find(
                item => item.id === id
            ) || {};

        const unitConverter =
            window.yamUnitsConverter;

        const currentUnit =
            unitConverter
                ? unitConverter.normalizeUnit(
                    material.unit || "pcs"
                )
                : (material.unit || "pcs");

        openModal(`
            <div class="yam-re-modal-header">
                <h3>
                    ${
                        id
                            ? "✏️ ጥሬ እቃ አስተካክል"
                            : "➕ አዲስ ጥሬ እቃ"
                    }
                </h3>

                <button
                    type="button"
                    data-yam-re-close
                >
                    ✖️
                </button>
            </div>

            <form id="yamMaterialForm">

                <label>
                    የጥሬ እቃ ስም
                    <input
                        name="materialName"
                        required
                        value="${esc(
                            material.materialName ||
                            ""
                        )}"
                    >
                </label>

                <label>
                    ምድብ
                    <input
                        name="category"
                        value="${esc(
                            material.category ||
                            ""
                        )}"
                        placeholder="ኢፖክሲ፣ ቀለም፣ ፍሬም..."
                    >
                </label>

                <label>
                    መለኪያ
                    <select name="unit" required>
                        <optgroup label="💧 Volume / ፈሳሽ">
                            <option value="ml" ${
                                currentUnit === "ml"
                                    ? "selected"
                                    : ""
                            }>ml</option>
                            <option value="l" ${
                                currentUnit === "l"
                                    ? "selected"
                                    : ""
                            }>L</option>
                        </optgroup>

                        <optgroup label="⚖️ Weight / ክብደት">
                            <option value="mg" ${
                                currentUnit === "mg"
                                    ? "selected"
                                    : ""
                            }>mg</option>
                            <option value="g" ${
                                currentUnit === "g"
                                    ? "selected"
                                    : ""
                            }>g</option>
                            <option value="kg" ${
                                currentUnit === "kg"
                                    ? "selected"
                                    : ""
                            }>kg</option>
                        </optgroup>

                        <optgroup label="📏 Length / ርዝመት">
                            <option value="mm" ${
                                currentUnit === "mm"
                                    ? "selected"
                                    : ""
                            }>mm</option>
                            <option value="cm" ${
                                currentUnit === "cm"
                                    ? "selected"
                                    : ""
                            }>cm</option>
                            <option value="m" ${
                                currentUnit === "m"
                                    ? "selected"
                                    : ""
                            }>m</option>
                        </optgroup>

                        <optgroup label="📐 Area / ስፋት">
                            <option value="mm2" ${
                                currentUnit === "mm2"
                                    ? "selected"
                                    : ""
                            }>mm²</option>
                            <option value="cm2" ${
                                currentUnit === "cm2"
                                    ? "selected"
                                    : ""
                            }>cm²</option>
                            <option value="m2" ${
                                currentUnit === "m2"
                                    ? "selected"
                                    : ""
                            }>m²</option>
                        </optgroup>

                        <optgroup label="🔢 Count / ቁጥር">
                            <option value="pcs" ${
                                currentUnit === "pcs"
                                    ? "selected"
                                    : ""
                            }>pcs / ቁጥር</option>
                        </optgroup>
                    </select>
                </label>

                <label>
                    አሁን ያለ ክምችት
                    <input
                        name="stock"
                        type="number"
                        min="0"
                        step="any"
                        value="${number(
                            material.stock
                        )}"
                     readonly aria-readonly="true" title="ክምችት በግዢ፣ በክምችት መግቢያ/መውጫ እና በሌሎች የክምችት እንቅስቃሴዎች ብቻ ይለወጣል።">
                </label>

                ${
                    id
                        ? ""
                        : `
                <label>
                    📦 የመጀመሪያ ግዢ ብዛት
                    <div style="display:flex;align-items:center;gap:8px;">
                        <input
                            name="initialPurchaseQuantity"
                            type="number"
                            min="0"
                            step="any"
                            value="0"
                            style="flex:1;"
                        >
                        <strong id="yamInitialPurchaseUnitLabel" style="white-space:nowrap;">
                            ${esc(currentUnit || "pcs")}
                        </strong>
                    </div>
                    <small style="display:block;margin-top:6px;opacity:.7;">
                        አዲሱ ጥሬ እቃ ሲመዘገብ የመጀመሪያ ግዢ ከሆነ ብዛቱን እዚህ ያስገቡ።
                    </small>
                </label>

                `}

                <div class="yam-re-calculator-actions">
                    <p>🧮 ካልኩሌተር ውጤት ወደ ግዢ ላክ</p>

                    <button
                        type="button"
                        class="yam-re-calculator-action"
                        data-raw-material-calculator-action="quantity"
                    >
                        📦 ወደ ግዢ ብዛት አስገባ
                    </button>

                    <button
                        type="button"
                        class="yam-re-calculator-action"
                        data-raw-material-calculator-action="unit-cost"
                    >
                        💰 ወደ አንድ እቃ ዋጋ አስገባ
                    </button>
                </div>

                <label>
                    የአንድ እቃ ዋጋ
                    <input
                        name="unitCost"
                        type="number"
                        min="0"
                        step="any"
                        value="${number(
                            material.unitCost
                        )}"
                    >
                </label>

                <label>
                    ዝቅተኛ የክምችት መጠን
                    <input
                        name="minimumStock"
                        type="number"
                        min="0"
                        step="any"
                        value="${number(
                            material.minimumStock
                        )}"
                    >
                </label>

                <label>
                    አቅራቢ
                    <input
                        name="supplier"
                        value="${esc(
                            material.supplier ||
                            ""
                        )}"
                    >
                </label>

                <label>
                    ማብራሪያ
                    <textarea
                        name="description"
                    >${esc(
                        material.description ||
                        ""
                    )}</textarea>
                </label>

                                <label>
                    📷 የጥሬ እቃ ፎቶ
                    <input
                        id="yamMaterialPhotoInput"
                        name="materialPhoto"
                        type="file"
                        accept="image/*"
                    >
                    <input
                        type="hidden"
                        name="photoUrl"
                        id="yamMaterialPhotoUrl"
                        value="${esc(material.photoUrl || "")}"
                    >
                    <div
                        id="yamMaterialPhotoPreview"
                        style="margin-top:10px;"
                    >
                        ${material.photoUrl ? `
                            <img
                                src="${esc(material.photoUrl)}"
                                alt="${esc(material.materialName || "Raw Material")}"
                                style="width:120px;height:120px;object-fit:cover;border-radius:12px;border:1px solid #ddd;display:block;"
                            >
                        ` : `
                            <span style="opacity:.7;">📷 ፎቶ አልተመረጠም</span>
                        `}
                    </div>
                    <small style="display:block;margin-top:6px;opacity:.7;">
                        JPG, PNG, WEBP — እስከ 5MB
                    </small>
                </label>

                <button
                    type="submit"
                    class="yam-re-primary"
                >
                    💾 አስቀምጥ
                </button>

            </form>
        `);

        const form =
            document.getElementById(
                "yamMaterialForm"
            );

        /* =====================================================
           RAW MATERIAL PHOTO PICKER
           ===================================================== */

        const unitSelect = form?.elements?.unit;
    const initialPurchaseUnitLabel = form?.querySelector(
        "#yamInitialPurchaseUnitLabel"
    );

    if (unitSelect && initialPurchaseUnitLabel) {
        const syncInitialPurchaseUnit = () => {
            initialPurchaseUnitLabel.textContent =
                unitSelect.value || "pcs";
        };

        unitSelect.addEventListener(
            "change",
            syncInitialPurchaseUnit
        );

        syncInitialPurchaseUnit();
    }

    const photoInput =
            document.getElementById(
                "yamMaterialPhotoInput"
            );

        const photoUrlInput =
            document.getElementById(
                "yamMaterialPhotoUrl"
            );

        const photoPreview =
            document.getElementById(
                "yamMaterialPhotoPreview"
            );

        if (photoInput) {
            photoInput.addEventListener(
                "change",
                () => {
                    const selected =
                        photoInput.files?.[0];

                    if (!selected) return;

                    if (
                        !selected.type ||
                        !selected.type.startsWith("image/")
                    ) {
                        alert(
                            "📷 የምስል ፋይል ብቻ ይምረጡ።"
                        );

                        photoInput.value = "";
                        return;
                    }

                    if (
                        selected.size >
                        5 * 1024 * 1024
                    ) {
                        alert(
                            "📷 ፎቶው ከ 5MB መብለጥ የለበትም።"
                        );

                        photoInput.value = "";
                        return;
                    }

                    const previewUrl =
                        URL.createObjectURL(selected);

                    if (photoPreview) {
                        photoPreview.innerHTML =
                            `
                            <img
                                src="${previewUrl}"
                                alt="Photo Preview"
                                style="
                                    width:120px;
                                    height:120px;
                                    object-fit:cover;
                                    border-radius:12px;
                                    border:1px solid #ddd;
                                    display:block;
                                "
                            >
                            <small
                                style="
                                    display:block;
                                    margin-top:6px;
                                    opacity:.75;
                                "
                            >
                                📷 ${esc(selected.name)}
                            </small>
                            `;
                    }
                }
            );
        }


        form.addEventListener(
            "submit",
            async event => {
                event.preventDefault();

                const body =
                    Object.fromEntries(
                        new FormData(form)
                    );

                /* =================================================
                   UPLOAD SELECTED RAW MATERIAL PHOTO
                   ================================================= */

                const selectedPhoto =
                    photoInput?.files?.[0] || null;

                if (selectedPhoto) {

                    const photoFormData =
                        new FormData();

                    photoFormData.append(
                        "photo",
                        selectedPhoto
                    );

                    const photoResponse =
                        await fetch(
                            `${API}/raw-materials/upload-photo`,
                            {
                                method: "POST",
                                body: photoFormData
                            }
                        );

                    const photoData =
                        await photoResponse
                            .json()
                            .catch(() => ({}));

                    if (
                        !photoResponse.ok ||
                        !photoData.success ||
                        !photoData.photoUrl
                    ) {
                        throw new Error(
                            photoData.error ||
                            "📷 ፎቶውን መጫን አልተቻለም።"
                        );
                    }

                    body.photoUrl =
                        photoData.photoUrl;

                    if (photoUrlInput) {
                        photoUrlInput.value =
                            photoData.photoUrl;
                    }

                    console.log(
                        "✅ Raw-material photo uploaded:",
                        photoData.photoUrl
                    );
                }


                body.stock =
                    number(body.stock);

                body.unitCost =
                    number(body.unitCost);

                body.minimumStock =
                    number(body.minimumStock);

                const initialPurchaseQuantity =
                    number(body.initialPurchaseQuantity);

                delete body.initialPurchaseQuantity;

                try {
                    const saveResult =
                        await api(
                            id
                                ? `${API}/raw-materials/${encodeURIComponent(
                                      id
                                  )}`
                                : `${API}/raw-materials`,
                            {
                                method: id
                                    ? "PATCH"
                                    : "POST",
                                body: JSON.stringify(body)
                            }
                        );

                    if (
                        !id &&
                        initialPurchaseQuantity > 0 &&
                        saveResult?.material?.id
                    ) {
                        const initialPurchaseRequestId =
                            typeof crypto !== "undefined" &&
                            typeof crypto.randomUUID === "function"
                                ? crypto.randomUUID()
                                : `initial-purchase-${Date.now()}-${Math.random()
                                      .toString(36)
                                      .slice(2)}`;

                        const initialPurchaseBody = {
                            quantity:
                                initialPurchaseQuantity,
                unit:
                    body.unit,

                            unitCost:
                                number(body.unitCost),

                            supplier:
                                body.supplier || "",

                            notes:
                                body.description || "",

                            requestId:
                                initialPurchaseRequestId
                        };

                        let purchaseDate = "";

                        if (
                            typeof getEthiopianDate ===
                            "function"
                        ) {
                            purchaseDate =
                                getEthiopianDate(
                                    "yamPurchase"
                                );
                        }

                        if (purchaseDate) {
                            initialPurchaseBody.purchaseDate =
                                purchaseDate;
                        }

                        await api(
                            `${API}/raw-materials/${encodeURIComponent(
                                saveResult.material.id
                            )}/purchases`,
                            {
                                method: "POST",
                                body: JSON.stringify(
                                    initialPurchaseBody
                                )
                            }
                        );
                    }

                    closeModal();

                    await loadMaterials();
                    await loadFinancialSummary();
                } catch (error) {
                    alert(
                        error.message ||
                        "መረጃውን ማስቀመጥ አልተቻለም።"
                    );
                }
            }
        );
    }

    function showPurchaseModal(materialId) {
        const material =
            materials.find(
                item => item.id === materialId
            );

        if (!material) return;

        const unitConverter = window.yamUnitsConverter;
        const purchaseUnit = unitConverter
            ? unitConverter.normalizeUnit(material.unit || "pcs")
            : (material.unit || "pcs");

        const purchaseRequestId =
            typeof crypto !== "undefined" &&
            typeof crypto.randomUUID === "function"
                ? crypto.randomUUID()
                : `purchase-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        openModal(`
            <div class="yam-re-modal-header">
                <h3>🛒 የጥሬ እቃ ግዢ</h3>

                <button
                    type="button"
                    data-yam-re-close
                >
                    ✖️
                </button>
            </div>

            <p>
                <strong>
                    ${esc(
                        material.materialName
                    )}
                </strong>
            </p>

            <p>
                አሁን ያለ ክምችት:
                <strong>
                    ${number(material.stock)} ${esc(purchaseUnit)}
                </strong>
            </p>

            <form id="yamPurchaseForm">

                                      <div
                      id="areaPurchaseFields"
                      style="display:${["mm2","cm2","m2"].includes(purchaseUnit) ? "block" : "none"};margin:12px 0;"
                  >
                      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;">
                          <label>
                              ርዝመት
                              <input name="length" type="number" min="0.0001" step="any">
                          </label>
                          <label>
                              ስፋት
                              <input name="width" type="number" min="0.0001" step="any">
                          </label>
                          <label>
                              የመጠን መለኪያ
                              <select name="dimensionUnit">
                                  <option value="mm">mm</option>
                                  <option value="cm" selected>cm</option>
                                  <option value="m">m</option>
                              </select>
                          </label>
                          <label>
                              ውፍረት (አማራጭ)
                              <input name="thickness" type="number" min="0" step="any">
                          </label>
                      </div>

                      <label style="margin-top:10px;">
                          የArea መለኪያ
                          <select name="areaUnit">
                              <option value="mm2" ${purchaseUnit === "mm2" ? "selected" : ""}>mm²</option>
                              <option value="cm2" ${purchaseUnit === "cm2" ? "selected" : ""}>cm²</option>
                              <option value="m2" ${purchaseUnit === "m2" ? "selected" : ""}>m²</option>
                          </select>
                      </label>

                      <label style="margin-top:10px;">
                          የግዢ ጠቅላላ ዋጋ
                          <input name="purchasePrice" type="number" min="0.01" step="any">
                      </label>

                      <div style="margin-top:10px;padding:10px;border-radius:8px;background:rgba(212,175,55,.08);">
                          📐 Area:
                          <strong id="purchaseAreaDisplay">0</strong>
                          <span id="purchaseAreaUnitDisplay">${esc(purchaseUnit)}</span>
                          <br>
                          💰 Area Unit Cost:
                          <strong id="purchaseAreaUnitCostDisplay">0</strong> ብር
                      </div>
                  </div>

                  <div id="normalPurchaseFields">
                      <label>
                          📦 የተገዛው ጥሬ እቃ ብዛት
                          <div style="display:flex;align-items:center;gap:8px;">
                              <input
                                  name="quantity"
                                  type="number"
                                  min="0.0001"
                                  step="any"
                                  required
                                  style="flex:1;"
                              >
                              <strong style="white-space:nowrap;">
                                  ${esc(purchaseUnit)}
                              </strong>
                          </div>
                          <small style="display:block;margin-top:6px;opacity:.7;">
                              የሚገዛው ብዛት በዚህ እቃ መለኪያ ይመዘገባል።
                          </small>
                      </label>

                      <label>
                          የአንድ ${esc(purchaseUnit)} ዋጋ
                          <input
                              name="unitCost"
                              type="number"
                              min="0.01"
                              step="any"
                              value="${number(material.unitCost)}"
                              required
                          >
                      </label>
                  </div>

                  <div
                      id="purchaseTotalValue"
                      style="margin:12px 0;padding:12px;border-radius:10px;background:rgba(212,175,55,.10);"
                  >
                    🧾 ጠቅላላ የግዢ ዋጋ:
                    <strong id="purchaseTotalAmount">0 ብር</strong>
                </div>

                <section
                    id="costProfitCalculator"
                    class="universal-calculator-section"
                    style="margin-top:16px;"
                >
                    <div class="universal-calculator">
                        <div class="calculator-header">
                            <span>📊</span>
                            <div>
                                <h3>ወጪ እና ትርፍ</h3>
                                <p>የዋጋ፣ ወጪ እና ትርፍ ስሌት</p>
                            </div>
                        </div>

                        <label>
                            መጠን
                            <input
                                id="costProfitQuantity"
                                type="number"
                                min="0.0001"
                                step="any"
                            >
                        </label>

                        <label>
                            የጥሬ እቃ አንድ ዋጋ
                            <input
                                id="costProfitMaterialUnitCost"
                                type="number"
                                min="0"
                                step="any"
                            >
                        </label>

                        <label>
                            የሥራ ወጪ
                            <input
                                id="costProfitWorkCost"
                                type="number"
                                min="0"
                                step="any"
                                value="0"
                            >
                        </label>

                        <label>
                            ሌሎች ወጪዎች
                            <input
                                id="costProfitOtherCost"
                                type="number"
                                min="0"
                                step="any"
                                value="0"
                            >
                        </label>

                        <label>
                            የሽያጭ ዋጋ
                            <input
                                id="costProfitSellingPrice"
                                type="number"
                                min="0"
                                step="any"
                                value="0"
                            >
                        </label>

                        <button
                            type="button"
                            id="costProfitCalculateButton"
                        >
                            📊 ወጪ እና ትርፍ አስላ
                        </button>

                        <div
                            id="costProfitError"
                            role="alert"
                        ></div>

                        <div
                            id="costProfitResult"
                            hidden
                        >
                            <p>
                                የጥሬ እቃ ወጪ:
                                <strong id="costProfitResultMaterialCost">0</strong>
                            </p>
                            <p>
                                ጠቅላላ ወጪ:
                                <strong id="costProfitResultTotalCost">0</strong>
                            </p>
                            <p>
                                የሽያጭ ዋጋ:
                                <strong id="costProfitResultSellingPrice">0</strong>
                            </p>
                            <p>
                                ትርፍ:
                                <strong id="costProfitResultProfit">0</strong>
                            </p>
                            <p>
                                የትርፍ %:
                                <strong id="costProfitResultProfitPercent">0%</strong>
                            </p>
                            <p>
                                የትርፍ ማርጅን %:
                                <strong id="costProfitResultMarginPercent">0%</strong>
                            </p>

                            <button
                                type="button"
                                data-cost-profit-destination="raw-material"
                            >
                                📤 ወደ ግዢ ላክ
                            </button>
                        </div>
                    </div>
                </section>

                ${buildEthiopianDateFields(
                    "yamPurchase",
                    "የግዢ ቀን — የኢትዮጵያ ዘመን"
                )}

                <label>
                    አቅራቢ
                    <input name="supplier">
                </label>

                <label>
                    ማስታወሻ
                    <textarea name="notes"></textarea>
                </label>

                <button
                    type="submit"
                    class="yam-re-primary"
                >
                    💾 ግዢውን መዝግብ
                </button>

            </form>
        `);


          const form =
              document.getElementById("yamPurchaseForm");

          const purchaseQuantityInput =
              form.querySelector('input[name="quantity"]');

          const purchaseUnitCostInput =
              form.querySelector('input[name="unitCost"]');

          const purchaseTotalAmount =
              form.querySelector("#purchaseTotalAmount");

          const areaPurchaseFields =
              form.querySelector("#areaPurchaseFields");

          const normalPurchaseFields =
              form.querySelector("#normalPurchaseFields");

          const areaLengthInput =
              form.querySelector('input[name="length"]');

          const areaWidthInput =
              form.querySelector('input[name="width"]');

          const areaDimensionUnitInput =
              form.querySelector('select[name="dimensionUnit"]');

          const areaUnitInput =
              form.querySelector('select[name="areaUnit"]');

          const areaPurchasePriceInput =
              form.querySelector('input[name="purchasePrice"]');

          const areaDisplay =
              form.querySelector("#purchaseAreaDisplay");

          const areaUnitDisplay =
              form.querySelector("#purchaseAreaUnitDisplay");

          const areaUnitCostDisplay =
              form.querySelector("#purchaseAreaUnitCostDisplay");

          const isAreaPurchase =
              ["mm2", "cm2", "m2"].includes(purchaseUnit);

          if (areaPurchaseFields) {
              areaPurchaseFields.style.display =
                  isAreaPurchase ? "block" : "none";
          }

          if (normalPurchaseFields) {
              normalPurchaseFields.style.display =
                  isAreaPurchase ? "none" : "block";
          }
          if (purchaseQuantityInput) purchaseQuantityInput.required = !isAreaPurchase;
          if (purchaseUnitCostInput) purchaseUnitCostInput.required = !isAreaPurchase;


          function updateAreaPurchase() {
              if (!isAreaPurchase) return;

              const length =
                  number(areaLengthInput?.value);

              const width =
                  number(areaWidthInput?.value);

              const purchasePrice =
                  number(areaPurchasePriceInput?.value);

              const dimensionUnit =
                  areaDimensionUnitInput?.value || "cm";

              const areaUnit =
                  areaUnitInput?.value || purchaseUnit;

              const lengthFactor = {
                  mm: 1,
                  cm: 10,
                  m: 1000
              };

              const areaFactor = {
                  mm2: 1,
                  cm2: 100,
                  m2: 1000000
              };

              const dimensionFactor =
                  lengthFactor[dimensionUnit];

              const targetFactor =
                  areaFactor[areaUnit];

              const areaInMm2 =
                  length > 0 &&
                  width > 0 &&
                  dimensionFactor
                      ? length * dimensionFactor *
                        width * dimensionFactor
                      : 0;

              const area =
                  areaInMm2 > 0 &&
                  targetFactor
                      ? areaInMm2 / targetFactor
                      : 0;

              const areaUnitCost =
                  area > 0 &&
                  purchasePrice > 0
                      ? purchasePrice / area
                      : 0;

              if (areaDisplay) {
                  areaDisplay.textContent =
                      area.toLocaleString(
                          undefined,
                          { maximumFractionDigits: 10 }
                      );
              }

              if (areaUnitDisplay) {
                  areaUnitDisplay.textContent =
                      areaUnit;
              }

              if (areaUnitCostDisplay) {
                  areaUnitCostDisplay.textContent =
                      areaUnitCost.toLocaleString(
                          undefined,
                          { maximumFractionDigits: 10 }
                      );
              }

              if (purchaseTotalAmount) {
                  purchaseTotalAmount.textContent =
                      `${area.toLocaleString()} ${areaUnit} × ${areaUnitCost.toLocaleString()} ብር/${areaUnit} = ${purchasePrice.toLocaleString()} ብር`;
              }
          }

          function updatePurchaseTotal() {
              if (isAreaPurchase) {
                  updateAreaPurchase();
                  return;
              }

              const quantity =
                  number(purchaseQuantityInput?.value);

              const unitCost =
                  number(purchaseUnitCostInput?.value);

              const total =
                  quantity * unitCost;

              if (purchaseTotalAmount) {
                  purchaseTotalAmount.textContent =
                      `${quantity.toLocaleString()} ${purchaseUnit} × ${unitCost.toLocaleString()} ብር/${purchaseUnit} = ${total.toLocaleString()} ብር`;
              }
          }

          purchaseQuantityInput?.addEventListener(
              "input",
              updatePurchaseTotal
          );

          purchaseUnitCostInput?.addEventListener(
              "input",
              updatePurchaseTotal
          );

          [
              areaLengthInput,
              areaWidthInput,
              areaDimensionUnitInput,
              areaUnitInput,
              areaPurchasePriceInput
          ].forEach(input => {
              input?.addEventListener(
                  "input",
                  updateAreaPurchase
              );

              input?.addEventListener(
                  "change",
                  updateAreaPurchase
              );
          });

          updatePurchaseTotal();

          form.addEventListener(
              "submit",
              async event => {
                  event.preventDefault();

                  const body =
                      Object.fromEntries(
                          new FormData(form)
                      );

                  if (isAreaPurchase) {
                      const length =
                          number(
                              areaLengthInput?.value
                          );

                      const width =
                          number(
                              areaWidthInput?.value
                          );

                      const purchasePrice =
                          number(
                              areaPurchasePriceInput?.value
                          );

                      const dimensionUnit =
                          areaDimensionUnitInput?.value ||
                          "cm";

                      const areaUnit =
                          areaUnitInput?.value ||
                          purchaseUnit;

                      const lengthFactor = {
                          mm: 1,
                          cm: 10,
                          m: 1000
                      };

                      const areaFactor = {
                          mm2: 1,
                          cm2: 100,
                          m2: 1000000
                      };

                      const dimensionFactor =
                          lengthFactor[dimensionUnit];

                      const targetFactor =
                          areaFactor[areaUnit];

                      const area =
                          length > 0 &&
                          width > 0 &&
                          dimensionFactor &&
                          targetFactor
                              ? (
                                  length *
                                  dimensionFactor *
                                  width *
                                  dimensionFactor
                                ) / targetFactor
                              : 0;

                      const unitCost =
                          area > 0 &&
                          purchasePrice > 0
                              ? purchasePrice / area
                              : 0;

                      body.quantity = area;
                      body.unitCost = unitCost;
                      body.unit = purchaseUnit;
                      body.length = length;
                      body.width = width;
                      body.dimensionUnit =
                          dimensionUnit;
                      body.areaUnit = areaUnit;
                      body.purchasePrice =
                          purchasePrice;

                      const thicknessInput =
                          form.querySelector(
                              'input[name="thickness"]'
                          );

                      if (
                          thicknessInput &&
                          thicknessInput.value !== ""
                      ) {
                          body.thickness =
                              number(
                                  thicknessInput.value
                              );
                      } else {
                          delete body.thickness;
                      }
                  } else {
                      body.quantity =
                          number(body.quantity);

                      body.unitCost =
                          number(body.unitCost);

                      body.unit =
                          purchaseUnit;

                      delete body.length;
                      delete body.width;
                      delete body.dimensionUnit;
                      delete body.areaUnit;
                      delete body.purchasePrice;
                      delete body.thickness;
                  }

                  body.requestId =
                      purchaseRequestId;

                  let purchaseDate = "";

                  if (
                      typeof getEthiopianDate ===
                      "function"
                  ) {
                      purchaseDate =
                          getEthiopianDate(
                              "yamPurchase"
                          );
                  }

                  if (purchaseDate) {
                      body.purchaseDate =
                          purchaseDate;
                  }

                  try {
                      await api(
                          `${API}/raw-materials/${encodeURIComponent(
                              materialId
                          )}/purchases`,
                          {
                              method: "POST",
                              body: JSON.stringify(body)
                          }
                      );

                      closeModal();

                      await loadMaterials();
                      await loadFinancialSummary();
                  } catch (error) {
                      alert(
                          error.message ||
                          "ግዢውን ማስቀመጥ አልተቻለም።"
                      );
                  }
              }
          );
        }

    function showExpenseModal(id = "") {
        const expense =
            expenses.find(
                item => item.id === id
            ) || {};

        openModal(`
            <div class="yam-re-modal-header">
                <h3>
                    ${
                        id
                            ? "✏️ ወጪ አስተካክል"
                            : "➕ አዲስ ወጪ"
                    }
                </h3>

                <button
                    type="button"
                    data-yam-re-close
                >
                    ✖️
                </button>
            </div>

            <form id="yamExpenseForm">

                <label>
                    የወጪ ስም
                    <input
                        name="title"
                        required
                        value="${esc(
                            expense.title ||
                            ""
                        )}"
                        placeholder="ትራንስፖርት..."
                    >
                </label>

                <label>
                    ምድብ
                    <input
                        name="category"
                        value="${esc(
                            expense.category ||
                            ""
                        )}"
                        placeholder="Transport, Delivery..."
                    >
                </label>

                <label>
                    መጠን
                    <input
                        name="amount"
                        type="number"
                        min="0.01"
                        step="any"
                        required
                        value="${number(
                            expense.amount
                        )}"
                    >
                </label>

                ${buildEthiopianDateFields(
                    "yamExpense",
                    "የወጪ ቀን — የኢትዮጵያ ዘመን"
                )}

                <label>
                    Payment Method
                    <input
                        name="paymentMethod"
                        value="${esc(
                            expense.paymentMethod ||
                            ""
                        )}"
                    >
                </label>

                <label>
                    Reference
                    <input
                        name="reference"
                        value="${esc(
                            expense.reference ||
                            ""
                        )}"
                    >
                </label>

                <label>
                    ማብራሪያ
                    <textarea
                        name="description"
                    >${esc(
                        expense.description ||
                        ""
                    )}</textarea>
                </label>

                <button
                    type="submit"
                    class="yam-re-primary"
                >
                    💾 ወጪውን አስቀምጥ
                </button>

            </form>
        `);

        const form =
            document.getElementById(
                "yamExpenseForm"
            );

        form.addEventListener(
            "submit",
            async event => {
                event.preventDefault();

                const body =
                    Object.fromEntries(
                        new FormData(form)
                    );

                body.amount =
                    number(body.amount);

                let expenseDate = "";

                if (
                    typeof getEthiopianDate ===
                    "function"
                ) {
                    expenseDate =
                        getEthiopianDate(
                            "yamExpense"
                        );
                }

                if (expenseDate) {
                    body.expenseDate =
                        expenseDate;
                }

                try {
                    await api(
                        id
                            ? `${API}/expenses/${encodeURIComponent(
                                  id
                              )}`
                            : `${API}/expenses`,
                        {
                            method: id
                                ? "PATCH"
                                : "POST",
                            body: JSON.stringify(body)
                        }
                    );

                    closeModal();

                    await loadExpenses();
                    await loadFinancialSummary();
                } catch (error) {
                    alert(
                        error.message ||
                        "ወጪውን ማስቀመጥ አልተቻለም።"
                    );
                }
            }
        );
    }

    async function deleteMaterial(id) {
        if (
            !confirm(
                "ይህን ጥሬ እቃ ለመሰረዝ እርግጠኛ ነዎት?"
            )
        ) {
            return;
        }

        try {
            await api(
                `${API}/raw-materials/${encodeURIComponent(
                    id
                )}`,
                {
                    method: "DELETE"
                }
            );

            await loadMaterials();
            await loadFinancialSummary();
        } catch (error) {
            alert(
                error.message ||
                "ጥሬ እቃውን መሰረዝ አልተቻለም።"
            );
        }
    }

    async function deleteExpense(id) {
        if (
            !confirm(
                "ይህን ወጪ ለመሰረዝ እርግጠኛ ነዎት?"
            )
        ) {
            return;
        }

        try {
            await api(
                `${API}/expenses/${encodeURIComponent(
                    id
                )}`,
                {
                    method: "DELETE"
                }
            );

            await loadExpenses();
            await loadFinancialSummary();
        } catch (error) {
            alert(
                error.message ||
                "ወጪውን መሰረዝ አልተቻለም።"
            );
        }
    }

    function addStyles() {
        if (
            document.getElementById(
                "yamRawExpenseDashboardStyles"
            )
        ) {
            return;
        }

        const style =
            document.createElement("style");

        style.id =
            "yamRawExpenseDashboardStyles";

        style.textContent = `
            .yam-raw-expense-dashboard {
                margin: 25px 0;
                padding: 20px;
                background: #fff;
                border-radius: 18px;
                box-shadow: 0 5px 22px rgba(0,0,0,.08);
                border: 1px solid #eee;
            }

            .yam-re-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 15px;
                flex-wrap: wrap;
                margin-bottom: 20px;
            }

            .yam-re-header h2 {
                margin: 0;
                color: #0f3d2e;
            }

            .yam-re-header p,
            .yam-re-panel-header p {
                margin: 6px 0 0;
                color: #777;
            }

            .yam-re-refresh,
            .yam-re-primary,
            .yam-re-card-actions button {
                border: 0;
                border-radius: 10px;
                padding: 10px 14px;
                cursor: pointer;
                font-weight: 700;
            }

            .yam-re-primary {
                background: #0f3d2e;
                color: #fff;
            }

            .yam-re-refresh {
                background: #f0f3f1;
                color: #0f3d2e;
            }

            .yam-re-financial-cards {
                display: grid;
                grid-template-columns:
                    repeat(auto-fit,minmax(180px,1fr));
                gap: 12px;
                margin-bottom: 20px;
            }

            .yam-re-money-card {
                padding: 18px;
                border-radius: 15px;
                background: #f5f8f6;
                border: 1px solid #e4ebe6;
            }

            .yam-re-money-card span {
                display: block;
                color: #666;
                margin-bottom: 8px;
            }

            .yam-re-money-card strong {
                display: block;
                font-size: 22px;
                color: #0f3d2e;
            }

            .yam-re-tabs {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
                margin-bottom: 18px;
                border-bottom: 1px solid #eee;
                padding-bottom: 10px;
            }

            .yam-re-tab {
                border: 0;
                background: #f5f5f5;
                color: #333;
                padding: 10px 14px;
                border-radius: 10px;
                cursor: pointer;
                font-weight: 700;
            }

            .yam-re-tab.active {
                background: #0f3d2e;
                color: #fff;
            }

            .yam-re-tab-panel {
                display: none;
            }

            .yam-re-tab-panel.active {
                display: block;
            }

            .yam-re-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
                margin-bottom: 15px;
            }

            .yam-re-panel-header h3 {
                margin: 0;
            }

            .yam-re-material-grid {
                display: grid;
                grid-template-columns:
                    repeat(auto-fit,minmax(220px,1fr));
                gap: 14px;
            }

            .yam-re-material-card {
                border: 1px solid #eee;
                border-radius: 15px;
                padding: 15px;
                background: #fff;
            }

            .yam-re-material-card img {
                width: 100%;
                height: 150px;
                object-fit: cover;
                border-radius: 12px;
                margin-bottom: 10px;
            }

            .yam-re-material-card h4 {
                margin: 5px 0 10px;
                color: #0f3d2e;
            }

            .yam-re-low-stock {
                margin-top: 10px;
                padding: 8px 10px;
                border-radius: 8px;
                background: #fff4e5;
                color: #9a5b00;
                font-weight: 700;
            }

            .yam-re-card-actions {
                display: flex;
                gap: 7px;
                flex-wrap: wrap;
                margin-top: 12px;
            }

            .yam-re-card-actions button {
                background: #f0f0f0;
                color: #333;
            }

            .yam-re-expense-list {
                display: grid;
                gap: 10px;
            }

            .yam-re-expense-row {
                display: grid;
                grid-template-columns:
                    minmax(0,1fr) auto auto;
                align-items: center;
                gap: 12px;
                padding: 14px;
                border: 1px solid #eee;
                border-radius: 12px;
            }

            .yam-re-expense-row small {
                display: block;
                color: #777;
                margin-top: 4px;
            }

            .yam-re-financial-detail-grid {
                display: grid;
                grid-template-columns:
                    repeat(auto-fit,minmax(190px,1fr));
                gap: 12px;
            }

            .yam-re-financial-detail-grid > div {
                padding: 15px;
                border-radius: 13px;
                background: #f8f8f8;
            }

            .yam-re-financial-detail-grid span,
            .yam-re-financial-detail-grid strong {
                display: block;
            }

            .yam-re-financial-detail-grid strong {
                margin-top: 7px;
                font-size: 19px;
            }

            .yam-re-profit {
                background: #eef8f0 !important;
            }

            .yam-re-empty,
            .yam-re-loading,
            .yam-re-error {
                padding: 20px;
                text-align: center;
                border-radius: 12px;
                background: #f7f7f7;
            }

            .yam-re-error {
                margin-bottom: 15px;
                color: #a00000;
                background: #fff1f1;
            }

            .yam-re-modal {
                position: fixed;
                inset: 0;
                z-index: 99999;
                align-items: center;
                justify-content: center;
                padding: 15px;
                background: rgba(0,0,0,.55);
            }

            .yam-re-modal-box {
                width: min(600px,100%);
                max-height: 90vh;
                overflow-y: auto;
                background: #fff;
                border-radius: 18px;
                padding: 20px;
                box-shadow: 0 15px 45px rgba(0,0,0,.25);
            }

            .yam-re-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 10px;
                margin-bottom: 15px;
            }

            .yam-re-modal-header h3 {
                margin: 0;
            }

            .yam-re-modal-header button {
                border: 0;
                background: transparent;
                cursor: pointer;
                font-size: 20px;
            }

            .yam-re-modal-box form {
                display: grid;
                gap: 12px;
            }

            .yam-re-modal-box label {
                display: grid;
                gap: 6px;
                font-weight: 700;
            }

            .yam-re-modal-box input,
            .yam-re-modal-box select,
            .yam-re-modal-box textarea {
                width: 100%;
                box-sizing: border-box;
                padding: 11px 12px;
                border: 1px solid #ddd;
                border-radius: 9px;
                font: inherit;
            }

            .yam-re-modal-box textarea {
                min-height: 90px;
                resize: vertical;
            }

            .yam-et-date-grid {
                display: grid;
                grid-template-columns:
                    1fr 1.3fr 1fr;
                gap: 8px;
            }

            @media (max-width: 650px) {
                .yam-re-expense-row {
                    grid-template-columns: 1fr;
                }

                .yam-et-date-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function init() {
        addStyles();
        createSection();
        loadRawExpenseDashboard();
    }

    window.yamRawExpenseDashboard = {
        init,
        reload: loadRawExpenseDashboard,
        loadMaterials,
        loadExpenses,
        loadFinancialSummary
    };

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            init
        );
    } else {
        init();
    }

})();
