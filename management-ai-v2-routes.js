"use strict";

const express = require("express");
const router = express.Router();
const { db } = require("./firebase");

function num(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function positive(value) {
    return Math.max(0, num(value));
}

function text(value) {
    return String(value ?? "").trim();
}

function buildBusinessEvidence({
    finance,
    orders,
    deliveredOrders,
    materials,
    productions,
    recipes,
    selfProducts
}) {
    const f = finance || {};
    const expenses = f.expenses || {};
    const profit = f.profit || {};

    const totalStockValue = materials.reduce(
        (sum, m) => sum + positive(m.stockValue),
        0
    );

    const lowStock = materials.filter(
        m => positive(m.stock) <= positive(m.minimumStock)
    );

    const completedProductions = productions.filter(
        p => text(p.status).toLowerCase() === "completed"
    );

    const activeRecipes = recipes.filter(
        r => r.active === true
    );

    const allOrders = [...orders, ...deliveredOrders];

    const customers = new Set(
        allOrders
            .map(o =>
                text(
                    o.customerName ||
                    o.customer?.name ||
                    o.phone
                )
            )
            .filter(Boolean)
    );

    const findings = [];

    const pendingOrders = allOrders.filter(o =>
        !(o.delivered === true ||
          o.isDelivered === true ||
          text(o.status).toLowerCase() === "delivered")
    );

    const overdueOrders = allOrders.filter(o =>
        o.overdue === true ||
        text(o.status).toLowerCase().includes("overdue") ||
        text(o.status).includes("ዘግይ")
    );

    if (pendingOrders.length > 0) {
        findings.push({
            area: "Orders",
            type: "pending_orders",
            severity: "medium",
            fact: `Pending Orders ${pendingOrders.length} ናቸው።`,
            impact: "የተጠናቀቁ እና የተላለፉ ትዕዛዞች ክትትል ያስፈልጋቸዋል።",
            action: "Pending Orders ሁኔታን እና የማስረከቢያ ቀንን በተከታታይ አዘምን።"
        });
    }

    if (overdueOrders.length > 0) {
        findings.push({
            area: "Orders",
            type: "overdue_orders",
            severity: "high",
            fact: `Overdue Orders ${overdueOrders.length} ናቸው።`,
            impact: "የደንበኛ እርካታና የገቢ ጊዜ ሊጎዳ ይችላል።",
            action: "Overdue Orders በቅድሚያ አስከትል እና የማስረከቢያ ሁኔታቸውን አዘምን።"
        });
    }

    const financeOrderErrors = [];

    allOrders.forEach(o => {
        const total = positive(o.totalAmount);
        const deposit = positive(o.deposit);
        const remaining = positive(o.remaining);
        const workCost = positive(o.workCost);
        const orderProfit = num(o.profit);
        const expectedRemaining = Math.max(total - deposit, 0);
        const expectedProfit = total - workCost;

        if (deposit > total || Math.abs(remaining - expectedRemaining) > 0.01 || Math.abs(orderProfit - expectedProfit) > 0.01) {
            financeOrderErrors.push(text(o.id || o.orderId || "unknown"));
        }
    });

    if (financeOrderErrors.length > 0) {
        findings.push({
            area: "Finance",
            type: "order_data_integrity",
            severity: "high",
            fact: `Finance calculation mismatch ${financeOrderErrors.length} Orders ላይ ተገኝቷል።`,
            impact: "የOrder ትርፍ፣ ቀሪ ክፍያ ወይም የተከፈለ መጠን ትክክለኛነት ሊጎዳ ይችላል።",
            action: "የተገኙትን Orders የTotal፣ Deposit፣ Remaining እና Work Cost እሴቶች በቁጥር አረጋግጥ።"
        });
    }

    if (num(profit.net) < 0) {
        findings.push({
            area: "Finance",
            type: "loss",
            severity: "high",
            fact: `Net Profit ${num(profit.net)} ብር ነው።`,
            impact: "የንግዱ ገቢ ወጪውን አልሸፈነም።",
            action: "የወጪ ክፍሎችን እና የገቢ ምንጮችን በቁጥር መርምር።"
        });
    }

    if (lowStock.length > 0) {
        findings.push({
            area: "Stock",
            type: "low_stock",
            severity: "medium",
            fact: `Low Stock ${lowStock.length} እቃዎች አሉ።`,
            impact: "አንዳንድ ጥሬ እቃዎች ወደ ዝቅተኛ የStock ደረጃ ደርሰዋል።",
            action: "Low Stock ያላቸውን እቃዎች የግዢ ቅድሚያ ላይ አስቀምጥ።"
        });
    }

    if (num(f.cashFlow) < 0) {
        findings.push({
            area: "Finance",
            type: "cash_flow",
            severity: "high",
            fact: `Cash Flow ${num(f.cashFlow)} ብር ነው።`,
            impact: "የገንዘብ ፍሰት ከወጪ በታች ነው።",
            action: "የተቀበለ ገንዘብን፣ የሚሰበሰብ ክፍያን እና ወጪን ይከታተሉ።"
        });
    }

    return {
        generatedAt: new Date().toISOString(),
        findings,

        finance: {
            sales: num(f.sales),
            received: num(f.received),
            receivable: num(f.receivable),
            expenses: {
                workCost: num(expenses.workCost),
                materialCost: num(expenses.materialCost),
                otherExpenses: num(expenses.otherExpenses),
                selfProductCost: num(expenses.selfProductCost),
                total: num(expenses.total)
            },
            netProfit: num(profit.net),
            profitMargin: num(profit.margin),
            cashFlow: num(f.cashFlow)
        },

        orders: {
            total: allOrders.length,
            delivered: deliveredOrders.length,
            active: orders.length,
            deliveredWithStatus: deliveredOrders.filter(o =>
                o.delivered === true ||
                o.isDelivered === true ||
                text(o.status).toLowerCase() === "delivered"
            ).length,
            customers: customers.size,
            totalValue: allOrders.reduce(
                (sum, o) => sum + positive(o.totalAmount),
                0
            ),
            receivable: allOrders.reduce(
                (sum, o) => sum + positive(o.remaining),
                0
            )
        },

        stock: {
            materialCount: materials.length,
            totalStockValue,
            lowStockCount: lowStock.length,
            lowStockItems: lowStock.map(m => ({
                materialId: text(m.materialId || m.id),
                materialName: text(m.materialName),
                stock: positive(m.stock),
                minimumStock: positive(m.minimumStock),
                unit: text(m.unit)
            }))
        },

        production: {
            total: productions.length,
            completed: completedProductions.length,
            totalQuantity: completedProductions.reduce(
                (sum, p) => sum + positive(p.quantity),
                0
            ),
            totalCost: completedProductions.reduce(
                (sum, p) => sum + positive(p.totalCost),
                0
            )
        },

        recipes: {
            total: recipes.length,
            active: activeRecipes.length
        },

        selfProducts: {
            total: selfProducts.length,
            stockValue: selfProducts.reduce(
                (sum, p) =>
                    sum + positive(p.stock) * positive(p.unitCost),
                0
            )
        }
    };
}

router.get("/management-ai-v2/evidence", async (req, res) => {
    try {
        const [ordersSnap, deliveredSnap, purchasesSnap, expensesSnap, productionsSnap, recipesSnap, selfProductsSnap] = await Promise.all([
            db.collection("orders").get(),
            db.collection("deliveredOrders").get(),
            db.collection("materialPurchases").get(),
            db.collection("expenses").get(),
            db.collection("productions").get(),
            db.collection("recipes").get(),
            db.collection("selfProducts").get()
        ]);

        const deliveredOriginalIds = new Set(
            deliveredSnap.docs
                .map(doc => text(doc.data()?.originalOrderId))
                .filter(Boolean)
        );

        const orders = ordersSnap.docs
            .filter(doc => !deliveredOriginalIds.has(doc.id))
            .map(doc => ({ id: doc.id, ...doc.data() }));

        const deliveredOrders = deliveredSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        const materials = await Promise.all(
            (await db.collection("rawMaterials").get()).docs.map(async doc => ({
                id: doc.id,
                ...doc.data()
            }))
        );

        const productions = productionsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        const recipes = recipesSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        const selfProducts = selfProductsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        let selfProductSales = 0;
        let selfProductCost = 0;
        let selfProductProfit = 0;
        let selfProductReceived = 0;
        let selfProductReceivable = 0;

        for (const product of selfProducts) {
            const salesSnap = await db.collection("selfProducts")
                .doc(product.id)
                .collection("sales")
                .get();

            salesSnap.forEach(doc => {
                const d = doc.data() || {};
                const saleTotal = positive(d.totalSales);
                const saleReceived = positive(
                    d.received ?? d.paidAmount ?? saleTotal
                );

                selfProductSales += saleTotal;
                selfProductCost += positive(d.totalCost);
                selfProductProfit += num(d.totalProfit);
                selfProductReceived += saleReceived;
                selfProductReceivable += Math.max(
                    0,
                    saleTotal - saleReceived
                );
            });
        }

        let sales = 0;
        let received = 0;
        let receivable = 0;
        let workCost = 0;
        let materialCost = 0;
        let otherExpenses = 0;

        [...orders, ...deliveredOrders].forEach(d => {
            sales += num(d.totalAmount);
            received += num(d.deposit);
            receivable += num(d.remaining);
            workCost += num(d.workCost);
        });

        purchasesSnap.forEach(doc => {
            materialCost += num(doc.data()?.totalCost);
        });

        expensesSnap.forEach(doc => {
            otherExpenses += num(doc.data()?.amount);
        });

        const totalExpenses =
            workCost +
            materialCost +
            otherExpenses +
            selfProductCost;

        const universalSales = sales + selfProductSales;
        const universalReceived = received + selfProductReceived;
        const universalReceivable = receivable + selfProductReceivable;
        const netProfit = universalSales - totalExpenses;
        const profitMargin =
            universalSales > 0
                ? (netProfit / universalSales) * 100
                : 0;
        const cashFlow = universalReceived - totalExpenses;

        const finance = {
            sales: universalSales,
            received: universalReceived,
            receivable: universalReceivable,
            expenses: {
                workCost,
                materialCost,
                otherExpenses,
                selfProductCost,
                total: totalExpenses
            },
            profit: {
                net: netProfit,
                margin: profitMargin
            },
            cashFlow
        };

        const evidence = buildBusinessEvidence({
            finance,
            orders,
            deliveredOrders,
            materials,
            productions,
            recipes,
            selfProducts
        });

        return res.json({
            success: true,
            evidence
        });
    } catch (error) {
        console.error("Management AI v2 evidence error:", error);

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


router.post("/management-ai-v2/analyze", async (req, res) => {
    try {
        if (!process.env.OPENROUTER_API_KEY) {
            return res.status(500).json({
                success: false,
                error: "OpenRouter API key is missing"
            });
        }

        const evidence = req.body?.evidence || {};

        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:3000",
                    "X-Title": "YamGiftET Management AI v2"
                },
                body: JSON.stringify({
                    model: "nvidia/nemotron-3.5-lightning:free",
                    stream: true,
                    max_tokens: 1800,
                    temperature: 0,
                    top_p: 1,
                    reasoning: { effort: "none" },
                    messages: [
                        {
                            role: "system",
                            content:
                                "አንተ YamGiftET Management AI v2 ነህ።\n" +
                                "EVIDENCE የተረጋገጠ የንግድ መረጃ ነው፤ ከEVIDENCE ውጭ እውነታ አትፍጠር፣ አትገምት።\n" +
                                "ቁጥሮችን በትክክል ተጠቀም፤ የማይገኝ መረጃ ካለ 'መረጃው አልተሰጠም' በል።\n" +
                                "EVIDENCE.findings ዋናው የችግር ማስረጃ ነው፤ area፣ fact፣ impact፣ action በቀጥታ ተጠቀም።\n" +
                                "ከEVIDENCE.findings ውጭ አዲስ ችግር አትፍጠር። ለእያንዳንዱ finding 🔎 ችግር፣ 📌 fact፣ 📉 impact፣ 💡 መፍትሄ፣ 🛠️ action፣ 🎯 severity በተደራጀ መልኩ አቅርብ።\n" +
                                "የሚታዩ ችግሮችን በተጨባጭ ቁጥሮች አስረዳ። ምክንያት በEVIDENCE ካልተረጋገጠ እንደ ግምት አቅርብ ወይም መረጃ እንደሚያስፈልግ ግለጽ።\n" +
                                "መጨረሻ ላይ 📊 የአሁኑን የንግድ ሁኔታ አጠቃልል እና የሚቀጥሉ 3 ተግባራትን ዘርዝር።\n" +
                                "በጥሩ፣ ግልጽ፣ ተፈጥሯዊ አማርኛ እና በተደራጀ አቀራረብ መልስ።"
                        },
                        {
                            role: "user",
                            content:
                                "ይህን EVIDENCE ተንትነህ የንግድ አስተዳደር ትንታኔ ስጥ።\n\n" +
                                JSON.stringify(evidence, null, 2)
                        }
                    ]
                })
            }
        );

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            return res.status(response.status).json({
                success: false,
                error: data?.error?.message || "OpenRouter request failed"
            });
        }

        const reader = response.body?.getReader();

        if (!reader) {
            return res.status(502).json({
                success: false,
                error: "AI streaming response is unavailable"
            });
        }

        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders?.();

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            const events = buffer.split("\n\n");
            buffer = events.pop() || "";

            for (const event of events) {
                if (event.trim()) {
                    res.write(event + "\n\n");
                }
            }
        }

        if (buffer.trim()) {
            res.write(buffer + "\n\n");
        }

        res.write("data: [DONE]\n\n");
        return res.end();
    } catch (error) {
        console.error("Management AI v2 analysis error:", error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
