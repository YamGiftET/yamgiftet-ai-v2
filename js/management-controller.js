/* =========================================================
   🛡️ YamGiftET AI v2
   የአስተዳደር ማዕከል — Management Controller
   ሁሉንም Dashboard መረጃ ይመረምራል
   ========================================================= */

(() => {
    "use strict";

    const API = "/api";

    const state = {
        orders: [],
        materials: [],
        finance: null,
        productions: [],
        recipes: []
    };

    const money = value => {
        const n = Number(value || 0);
        return n.toLocaleString("am-ET") + " ብር";
    };

    async function getJSON(url) {
        const response = await fetch(url, {
            headers: {
                "Accept": "application/json"
            }
        });

        const data = await response.json();

        if (!response.ok || data.success === false) {
            throw new Error(
                data.error || "መረጃውን ማምጣት አልተቻለም።"
            );
        }

        return data;
    }

    async function loadManagementData() {
        setStatus("መረጃ እየተሰበሰበ ነው...");

        const results = await Promise.allSettled([
            getJSON(`${API}/orders`),
            getJSON(`${API}/raw-materials`),
            getJSON(`${API}/finance/summary`),
            getJSON(`${API}/productions`),
            getJSON(`${API}/recipes`)
        ]);

        if (results[0].status === "fulfilled") {
            state.orders = results[0].value.orders || [];
        }

        if (results[1].status === "fulfilled") {
            state.materials = results[1].value.materials || [];
        }

        if (results[2].status === "fulfilled") {
            state.finance = results[2].value;
        }

        if (results[3].status === "fulfilled") {
            state.productions = results[3].value.productions || [];
        }

        if (results[4].status === "fulfilled") {
            state.recipes = results[4].value.recipes || [];
        }

        analyzeManagement();
    }

    function buildManagementAISnapshot() {
        const finance = state.finance || {};
        const expenses = finance.expenses || {};
        const profit = finance.profit || {};

        return {
            finance: {
                sales: Number(finance.sales || 0),
                received: Number(finance.received || 0),
                receivable: Number(finance.receivable || 0),
                expenses: {
                    workCost: Number(expenses.workCost || 0),
                    materialCost: Number(expenses.materialCost || 0),
                    otherExpenses: Number(expenses.otherExpenses || 0),
                    selfProductCost: Number(expenses.selfProductCost || 0),
                    total: Number(expenses.total || 0)
                },
                profit: {
                    net: Number(profit.net || 0),
                    margin: Number(profit.margin || 0)
                },
                cashFlow: Number(finance.cashFlow || 0)
            },
            stock: state.materials.map(material => ({
                materialId: material.id || material.materialId || "",
                materialName: material.materialName || "",
                unit: material.unit || "",
                stock: Number(material.stock || 0),
                unitCost: Number(material.unitCost || 0),
                stockValue: Number(material.stockValue || 0),
                minimumStock: Number(material.minimumStock || 0)
            })),
            orders: state.orders.map(order => ({
                id: order.id || order.orderId || "",
                status: order.status || "",
                delivered: Boolean(order.delivered || order.isDelivered),
                overdue: Boolean(order.overdue),
                customerName: order.customerName || order.customer?.name || ""
            })),
            productions: state.productions.map(production => ({
                id: production.id || production.productionId || "",
                sourceType: production.sourceType || "",
                productId: production.productId || "",
                productName: production.productName || "",
                quantity: Number(production.quantity || 0),
                recipeId: production.recipeId || "",
                recipeVersion: Number(production.recipeVersion || 0),
                totalCost: Number(production.totalCost || 0),
                unitCost: Number(production.unitCost || 0),
                status: production.status || ""
            })),
            recipes: state.recipes.map(recipe => ({
                id: recipe.id || recipe.recipeId || "",
                productId: recipe.productId || "",
                productName: recipe.productName || "",
                recipeVersion: Number(recipe.recipeVersion || 0),
                active: Boolean(recipe.active),
                materialCount: Array.isArray(recipe.materials) ? recipe.materials.length : 0
            })),
            customers: {
                count: new Set(
                    state.orders
                        .map(order => order.customerName || order.customer?.name || order.customer?.phone || "")
                        .filter(Boolean)
                ).size
            },
            generatedAt: new Date().toISOString(),
            generatedAtEthiopian: new Intl.DateTimeFormat("am-ET-u-ca-ethiopic", {
                dateStyle: "full",
                timeStyle: "medium",
                timeZone: "Africa/Addis_Ababa"
            }).format(new Date())
        };
    }

    function setStatus(text) {
        const el = document.getElementById("managementSystemStatus");

        if (el) {
            el.textContent = text;
        }
    }

    function setText(id, text) {
        const el = document.getElementById(id);

        if (el) {
            el.textContent = text;
        }
    }

    function analyzeManagement() {
        analyzeFinance();
        analyzeStock();
        analyzeMaterials();
        analyzeOrders();
        analyzeCustomers();
        analyzeFinanceErrors();
        generateAdvice();

        setStatus("ስርዓቱ ተገምግሟል");
    }

    /* =====================================================
       💰 ፋይናንስ
       ===================================================== */

    function analyzeFinance() {
        const finance = state.finance;

        if (!finance || !finance.sales || !finance.expenses) {
            setText(
                "managementFinanceStatus",
                "የፋይናንስ መረጃ አልተገኘም"
            );
            return;
        }

        const sales = Number(finance.sales || 0);
        const expenses = Number(finance.expenses.total || 0);
        const profit = Number(
            finance.profit?.net || 0
        );

        if (profit < 0) {
            setText(
                "managementFinanceStatus",
                `⚠️ ኪሳራ ${money(Math.abs(profit))}`
            );
        } else if (profit === 0 && sales > 0) {
            setText(
                "managementFinanceStatus",
                "⚠️ ትርፍ የለም"
            );
        } else {
            setText(
                "managementFinanceStatus",
                `✅ ትርፍ ${money(profit)}`
            );
        }
    }

    /* =====================================================
       📦 ስቶክ
       ===================================================== */

    function analyzeStock() {
        if (!state.materials.length) {
            setText(
                "managementStockStatus",
                "የስቶክ መረጃ የለም"
            );
            return;
        }

        let low = 0;

        state.materials.forEach(material => {
            const stock = Number(material.stock || 0);
            const minimum = Number(material.minimumStock || 0);

            if (minimum > 0 && stock <= minimum) {
                low++;
            }
        });

        if (low > 0) {
            setText(
                "managementStockStatus",
                `🚨 ${low} እቃ ዝቅተኛ ነው`
            );
        } else {
            setText(
                "managementStockStatus",
                "✅ ስቶኩ ጥሩ ነው"
            );
        }
    }

    /* =====================================================
       🧱 ጥሬ እቃ
       ===================================================== */

    function analyzeMaterials() {
        if (!state.materials.length) {
            setText(
                "managementMaterialStatus",
                "ጥሬ እቃ አልተመዘገበም"
            );
            return;
        }

        const totalValue = state.materials.reduce(
            (sum, item) =>
                sum + Number(item.stockValue || 0),
            0
        );

        setText(
            "managementMaterialStatus",
            `${state.materials.length} ዓይነት • ${money(totalValue)} ዋጋ`
        );
    }

    /* =====================================================
       🧾 ትዕዛዞች
       ===================================================== */

    function analyzeOrders() {
        const orders = state.orders;

        if (!orders.length) {
            setText(
                "managementOrdersStatus",
                "ትዕዛዝ የለም"
            );
            return;
        }

        let overdue = 0;
        let pending = 0;

        orders.forEach(order => {
            const status = String(
                order.status ||
                order.deliveryStatus ||
                ""
            ).toLowerCase();

            if (
                !order.delivered &&
                !order.isDelivered
            ) {
                pending++;
            }

            if (
                order.overdue === true ||
                status.includes("overdue") ||
                status.includes("ዘግይ")
            ) {
                overdue++;
            }
        });

        if (overdue > 0) {
            setText(
                "managementOrdersStatus",
                `🚨 ${overdue} ዘግይቷል • ${pending} በሂደት`
            );
        } else {
            setText(
                "managementOrdersStatus",
                `✅ ${pending} በሂደት`
            );
        }
    }

    /* =====================================================
       👥 ደንበኞች
       ===================================================== */

    function analyzeCustomers() {
        const customers = new Set();

        state.orders.forEach(order => {
            const name =
                order.customerName ||
                order.customer ||
                order.name;

            if (name) {
                customers.add(String(name).trim());
            }
        });

        setText(
            "managementCustomersStatus",
            `${customers.size} የተለዩ ደንበኞች`
        );
    }

    /* =====================================================
       🚨 የሂሳብ ስህተት ማስጠንቀቂያ
       ===================================================== */

    function analyzeFinanceErrors() {
        const errors = [];

        state.orders.forEach(order => {
            const total = Number(order.totalAmount || 0);
            const deposit = Number(order.deposit || 0);
            const remaining = Number(order.remaining || 0);
            const workCost = Number(order.workCost || 0);
            const profit = Number(order.profit || 0);

            if (deposit > total) {
                errors.push({
                    title: "የተከፈለ ገንዘብ ከጠቅላላ ዋጋ በላይ ነው",
                    detail:
                        `ደንበኛ: ${order.customerName || "ያልታወቀ"} • ` +
                        `ጠቅላላ: ${money(total)} • ` +
                        `ተከፍሏል: ${money(deposit)}`,
                    solution:
                        "የትዕዛዙን ጠቅላላ ዋጋ እና ቅድመ ክፍያ ያረጋግጡ።"
                });
            }

            const expectedRemaining =
                Math.max(total - deposit, 0);

            if (
                Math.abs(remaining - expectedRemaining) > 0.01
            ) {
                errors.push({
                    title: "የቀሪ ክፍያ ስሌት አይጣጣምም",
                    detail:
                        `ደንበኛ: ${order.customerName || "ያልታወቀ"} • ` +
                        `በሲስተሙ: ${money(remaining)} • ` +
                        `መሆን ያለበት: ${money(expectedRemaining)}`,
                    solution:
                        "ጠቅላላ ዋጋና ተከፍሎ ያለውን ክፍያ አስተካክለው ትዕዛዙን እንደገና ያስቀምጡ።"
                });
            }

            const expectedProfit =
                total - workCost;

            if (
                Math.abs(profit - expectedProfit) > 0.01
            ) {
                errors.push({
                    title: "የትርፍ ስሌት ስህተት",
                    detail:
                        `ደንበኛ: ${order.customerName || "ያልታወቀ"} • ` +
                        `ትርፍ: ${money(profit)} • ` +
                        `ትክክለኛው: ${money(expectedProfit)}`,
                    solution:
                        "የስራ ወጪውን እና ጠቅላላ ዋጋውን ያረጋግጡ።"
                });
            }
        });

        renderFinanceErrors(errors);
    }

    function renderFinanceErrors(errors) {
        const count = document.getElementById(
            "financeErrorCount"
        );

        const list = document.getElementById(
            "financeErrorList"
        );

        if (count) {
            count.textContent = errors.length;
        }

        if (!list) {
            return;
        }

        if (!errors.length) {
            list.innerHTML = `
                <div class="finance-empty-state">
                    <span>✅</span>
                    <p>
                        እስካሁን የተገኘ የሂሳብ ስህተት የለም።
                    </p>
                </div>
            `;
            return;
        }

        list.innerHTML = errors.map(error => `
            <div class="management-advice-item">
                <span>🚨</span>
                <div>
                    <strong>${escapeHTML(error.title)}</strong>
                    <p>${escapeHTML(error.detail)}</p>
                    <small>
                        💡 መፍትሄ፦ ${escapeHTML(error.solution)}
                    </small>
                </div>
            </div>
        `).join("");
    }

    /* =====================================================
       🤖 የአስተዳደር AI ምክር
       ===================================================== */

    function generateAdvice() {
        const advice = [];

        const finance = state.finance;

        if (finance) {
            const profit = Number(
                finance.profit?.net || 0
            );

            const sales = Number(
                finance.sales || 0
            );

            if (profit < 0) {
                advice.push(
                    "⚠️ ቢዝነሱ በኪሳራ ላይ ከሆነ የስራ ወጪንና የጥሬ እቃ ዋጋን በመጀመሪያ ይመርምሩ።"
                );
            } else if (sales > 0 && profit > 0) {
                advice.push(
                    "✅ ትርፍ እየተመዘገበ ነው፤ ትርፋማ የሆኑ ምርቶችን ይበልጥ ማስተዋወቅ ይጠቅማል።"
                );
            }
        }

        const lowStock = state.materials.filter(material => {
            const stock = Number(material.stock || 0);
            const minimum = Number(
                material.minimumStock || 0
            );

            return minimum > 0 && stock <= minimum;
        });

        if (lowStock.length) {
            advice.push(
                `📦 ${lowStock.length} ጥሬ እቃ ዝቅተኛ ነው፤ ከመጨረሱ በፊት የግዢ እቅድ ያዘጋጁ።`
            );
        }

        const overdue = state.orders.filter(order =>
            order.overdue === true
        );

        if (overdue.length) {
            advice.push(
                `⏰ ${overdue.length} ትዕዛዝ ዘግይቷል፤ የማስረከቢያ ቀኖችን ይከታተሉ።`
            );
        }

        if (!advice.length) {
            advice.push(
                "🤖 አሁን የሚጠይቅ ከፍተኛ ማስጠንቀቂያ አልተገኘም። የቢዝነሱን መረጃ በየጊዜው ይከታተሉ።"
            );
        }

        const list = document.getElementById(
            "managementAdviceList"
        );

        if (!list) {
            return;
        }

        list.innerHTML = advice.map(item => `
            <div class="management-advice-item">
                <span>💡</span>
                <p>${escapeHTML(item)}</p>
            </div>
        `).join("");
    }

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    window.yamGiftManagement = {
        load: loadManagementData,
        refresh: loadManagementData,
        getAISnapshot: buildManagementAISnapshot,
        state
    };

    function start() {
        loadManagementData().catch(error => {
            console.error(
                "Management Center Error:",
                error
            );

            setStatus(
                "⚠️ መረጃ ማምጣት ላይ ችግር ተፈጥሯል"
            );
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            start
        );
    } else {
        start();
    }
})();
