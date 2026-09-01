const express = require("express");
const router = express.Router();
const { db } = require("./firebase");
const calculator = require("./universal-calculator");
const { validateSummary } = require("./finance-calculation-controller");

function number(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

router.get("/finance/health", async (req, res) => {
    res.json({
        success: true,
        module: "Universal Finance",
        status: "ready"
    });
});


router.get("/finance/summary", async (req, res) => {
    try {
        const [ordersSnap, deliveredSnap, purchasesSnap, expensesSnap] =
            await Promise.all([
                db.collection("orders").get(),
                db.collection("deliveredOrders").get(),
                db.collection("materialPurchases").get(),
                db.collection("expenses").get()
            ]);

        const selfProductsSnap =
            await db.collection("selfProducts").get();

        let selfProductSales = 0;
        let selfProductCost = 0;
        let selfProductProfit = 0;
        let selfProductReceived = 0;
        let selfProductReceivable = 0;

        for (const productDoc of selfProductsSnap.docs) {
            const salesSnap = await db
                .collection("selfProducts")
                .doc(productDoc.id)
                .collection("sales")
                .get();

            salesSnap.forEach(doc => {
                const d = doc.data() || {};
                const saleTotal = number(d.totalSales);
                const saleReceived = number(
                    d.received ?? d.paidAmount ?? saleTotal
                );

                selfProductSales += saleTotal;
                selfProductCost += number(d.totalCost);
                selfProductProfit += number(d.totalProfit);
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

        const deliveredOriginalIds = new Set();

        deliveredSnap.forEach(doc => {
            const d = doc.data() || {};
            if (d.originalOrderId) deliveredOriginalIds.add(String(d.originalOrderId));
        });

        ordersSnap.forEach(doc => {
            if (deliveredOriginalIds.has(String(doc.id))) return;
            const d = doc.data() || {};
            sales += number(d.totalAmount);
            received += number(d.deposit);
            receivable += number(d.remaining);
            workCost += number(d.workCost);
        });

        deliveredSnap.forEach(doc => {
            const d = doc.data() || {};
            sales += number(d.totalAmount);
            received += number(d.deposit);
            receivable += number(d.remaining);
            workCost += number(d.workCost);
        });

        purchasesSnap.forEach(doc => {
            materialCost += number((doc.data() || {}).totalCost);
        });

        expensesSnap.forEach(doc => {
            otherExpenses += number((doc.data() || {}).amount);
        });

        const totalExpenses = calculator.add(
            calculator.add(workCost, materialCost),
            calculator.add(otherExpenses, selfProductCost)
        );

        const universalSales = calculator.add(sales, selfProductSales);

        received = calculator.add(
            received,
            selfProductReceived
        );

        receivable = calculator.add(
            receivable,
            selfProductReceivable
        );

        const netProfit = calculator.subtract(universalSales, totalExpenses);

        const profitMargin =
            universalSales > 0 ? calculator.multiply(calculator.divide(netProfit, universalSales), 100) : 0;

        const cashFlow = calculator.subtract(received, totalExpenses);

        const financeResult = {
            sales: universalSales,
            received,
            receivable,
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

        const calculationControl = validateSummary(financeResult);

        res.json({
            success: true,
            calculationControl,
            sales: universalSales,
            received,
            sources: {
                orders: sales,
                selfProducts: {
                    sales: selfProductSales,
                    cost: selfProductCost,
                    profit: selfProductProfit,
                    received: selfProductReceived,
                    receivable: selfProductReceivable
                }
            },
            receivable,
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
        });

    } catch (error) {
        console.error("Finance Engine Error:", error);
        res.status(500).json({
            success: false,
            error: "የፋይናንስ ስሌት ማስኬድ አልተቻለም።"
        });
    }
});

module.exports = router;


/* =========================================================
   STOCK MOVEMENT LEDGER API — PHASE 2
   Read-only viewer endpoint
   ========================================================= */

router.get("/stock-movements", async (req, res) => {
    try {
        const limitRaw = Number(req.query.limit);
        const limit = Number.isFinite(limitRaw)
            ? Math.min(Math.max(Math.floor(limitRaw), 1), 500)
            : 100;

        let cursor = null;

        if (req.query.cursor !== undefined) {
            if (
                typeof req.query.cursor !== "string" ||
                !req.query.cursor.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    error: "የpagination cursor ትክክለኛ አይደለም።"
                });
            }

            try {
                const normalized = req.query.cursor
                    .replace(/-/g, "+")
                    .replace(/_/g, "/");

                const padded = normalized + "=".repeat(
                    (4 - (normalized.length % 4)) % 4
                );

                const decoded = Buffer
                    .from(padded, "base64")
                    .toString("utf8");

                cursor = JSON.parse(decoded);

                if (
                    !cursor ||
                    typeof cursor !== "object" ||
                    Array.isArray(cursor) ||
                    typeof cursor.createdAt !== "string" ||
                    !cursor.createdAt ||
                    typeof cursor.id !== "string" ||
                    !cursor.id
                ) {
                    throw new Error("Invalid cursor shape");
                }
            } catch (cursorError) {
                console.warn(
                    "Invalid stock movement cursor:",
                    cursorError.message
                );

                return res.status(400).json({
                    success: false,
                    error: "የpagination cursor ትክክለኛ አይደለም።"
                });
            }
        }

        let query = db
            .collection("stockMovements")
            .orderBy("createdAt", "desc")
            .orderBy("__name__", "desc");

        if (cursor) {
            query = query.startAfter(cursor.createdAt, cursor.id);
        }

        const snapshot = await query
            .limit(limit + 1)
            .get();

        const hasMore = snapshot.docs.length > limit;
        const pageDocs = hasMore
            ? snapshot.docs.slice(0, limit)
            : snapshot.docs;

        const movements = pageDocs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        let nextCursor = null;

        if (hasMore && pageDocs.length > 0) {
            const lastDoc = pageDocs[pageDocs.length - 1];
            const lastData = lastDoc.data() || {};

            if (typeof lastData.createdAt === "string" && lastData.createdAt) {
                const cursorPayload = JSON.stringify({
                    createdAt: lastData.createdAt,
                    id: lastDoc.id
                });

                nextCursor = Buffer
                    .from(cursorPayload, "utf8")
                    .toString("base64url");
            }
        }

        res.json({
            success: true,
            count: movements.length,
            movements,
            hasMore,
            nextCursor
        });

    } catch (error) {
        console.error("Stock Movement Ledger Error:", error);

        res.status(500).json({
            success: false,
            error: "የStock Movement Ledger መረጃን ማምጣት አልተቻለም።"
        });
    }
});
/* =========================================================
   UNIVERSAL FINANCE HISTORY
   ========================================================= */

router.get("/finance/history", async (req, res) => {
    try {
        const [ordersSnap, deliveredSnap, purchasesSnap, expensesSnap] =
            await Promise.all([
                db.collection("orders").get(),
                db.collection("deliveredOrders").get(),
                db.collection("materialPurchases").get(),
                db.collection("expenses").get()
            ]);

        const history = [];
        const deliveredOriginalIds = new Set();

        deliveredSnap.forEach(doc => {
            const d = doc.data() || {};
            if (d.originalOrderId) {
                deliveredOriginalIds.add(String(d.originalOrderId));
            }
        });

        ordersSnap.forEach(doc => {
            if (deliveredOriginalIds.has(String(doc.id))) return;

            const d = doc.data() || {};

            history.push({
                id: doc.id,
                type: "sale",
                typeLabel: "ሽያጭ",
                date: d.orderDate || d.createdAt || null,
                title: d.productName || d.orderInfo || "ትዕዛዝ",
                customerName: d.customerName || "",
                phone: d.phone || "",
                income: number(d.totalAmount),
                received: number(d.deposit),
                remaining: number(d.remaining),
                expense: 0,
                source: "orders"
            });
        });

        deliveredSnap.forEach(doc => {
            const d = doc.data() || {};

            history.push({
                id: doc.id,
                type: "sale",
                typeLabel: "የተረከበ ሽያጭ",
                date: d.deliveredAt || d.orderDate || d.createdAt || null,
                title: d.productName || d.orderInfo || "የተረከበ ትዕዛዝ",
                customerName: d.customerName || "",
                phone: d.phone || "",
                income: number(d.totalAmount),
                received: number(d.deposit),
                remaining: number(d.remaining),
                expense: 0,
                source: "deliveredOrders"
            });
        });

        purchasesSnap.forEach(doc => {
            const d = doc.data() || {};

            history.push({
                id: doc.id,
                type: "purchase",
                typeLabel: "ጥሬ እቃ ግዢ",
                date: d.purchaseDate || d.createdAt || null,
                title: d.materialName || "ጥሬ እቃ",
                customerName: "",
                phone: "",
                income: 0,
                received: 0,
                remaining: 0,
                expense: number(d.totalCost),
                source: "materialPurchases"
            });
        });

        expensesSnap.forEach(doc => {
            const d = doc.data() || {};

            history.push({
                id: doc.id,
                type: "expense",
                typeLabel: "ሌላ ወጪ",
                date: d.expenseDate || d.createdAt || null,
                title: d.title || d.category || "ወጪ",
                customerName: "",
                phone: "",
                income: 0,
                received: 0,
                remaining: 0,
                expense: number(d.amount),
                source: "expenses"
            });
        });


        /* =========================================================
           SELF-PRODUCT SALES HISTORY
           Own accounting source only
           ========================================================= */
        const selfProductsSnap =
            await db.collection("selfProducts").get();

        for (const productDoc of selfProductsSnap.docs) {
            const product = productDoc.data() || {};
            const salesSnap = await db
                .collection("selfProducts")
                .doc(productDoc.id)
                .collection("sales")
                .get();

            salesSnap.forEach(doc => {
                const d = doc.data() || {};

                history.push({
                    id: doc.id,
                    type: "selfProductSale",
                    typeLabel: "የራስ ምርት ሽያጭ",
                    date: d.saleDate || d.createdAt || null,
                    title: d.productName || product.productName || "የራስ ምርት",
                    customerName: "",
                    phone: "",
                    income: number(d.totalSales),
                    received: number(d.totalSales),
                    remaining: 0,
                    expense: number(d.totalCost),
                    profit: number(d.totalProfit),
                    source: "selfProducts",
                    productId: productDoc.id
                });
            });
        }

        history.sort((a, b) => {
            const da = new Date(a.date || 0).getTime();
            const dbb = new Date(b.date || 0).getTime();
            return dbb - da;
        });

        res.json({
            success: true,
            count: history.length,
            history
        });

    } catch (error) {
        console.error("Finance History Error:", error);

        res.status(500).json({
            success: false,
            error: "የፋይናንስ History ማምጣት አልተቻለም።"
        });
    }
});
