const express = require("express");
const router = express.Router();
const { db } = require("./firebase");
const { moveToUniversalTrash } = require("./trash-helper");
const calculator = require("./universal-calculator");

/* =========================================================
   YamGiftET AI — SELF-MADE PRODUCTS API
   ========================================================= */

function clean(value) {
    return String(value ?? "").trim();
}

function number(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function calculateProduct(data = {}) {
    const quantity = Math.max(0, number(data.quantity));
    const stock = Math.max(0, number(data.stock));
    const sellPrice = Math.max(0, number(data.sellPrice));
    const unitCost = Math.max(0, number(data.unitCost));

    const unitProfit = calculator.subtract(sellPrice, unitCost);
    const totalSales = calculator.multiply(sellPrice, quantity);
    const totalCost = calculator.multiply(unitCost, quantity);
    const totalProfit = calculator.multiply(unitProfit, quantity);

    return {
        quantity,
        stock,
        sellPrice,
        unitCost,
        unitProfit,
        totalSales,
        totalCost,
        totalProfit
    };
}
/* =========================================================
   GET ALL SELF-MADE PRODUCTS
   ========================================================= */

router.get("/self-products", async (req, res) => {
    try {
        const snapshot = await db
            .collection("selfProducts")
            .orderBy("createdAt", "desc")
            .get();

        const products = snapshot.docs.map(doc => {
            const data = doc.data() || {};

            return {
                id: doc.id,
                ...data,
                ...calculateProduct(data)
            };
        });

        res.json({
            success: true,
            count: products.length,
            products
        });

    } catch (error) {
        console.error("Self Products GET Error:", error);

        res.status(500).json({
            success: false,
            error: "የራስ ምርቶችን ማምጣት አልተቻለም።"
        });
    }
});

/* =========================================================
   GET ONE SELF-MADE PRODUCT
   ========================================================= */

router.get("/self-products/:id", async (req, res) => {
    try {
        const id = clean(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                error: "የምርት ID ያስፈልጋል።"
            });
        }

        const doc = await db
            .collection("selfProducts")
            .doc(id)
            .get();

        if (!doc.exists) {
            return res.status(404).json({
                success: false,
                error: "ምርቱ አልተገኘም።"
            });
        }

        const data = doc.data() || {};

        res.json({
            success: true,
            product: {
                id: doc.id,
                ...data,
                ...calculateProduct(data)
            }
        });

    } catch (error) {
        console.error("Self Product GET Error:", error);

        res.status(500).json({
            success: false,
            error: "ምርቱን ማምጣት አልተቻለም።"
        });
    }
});

/* =========================================================
   CREATE SELF-MADE PRODUCT
   ========================================================= */

router.post("/self-products", async (req, res) => {
    try {
        const {
            productName,
            productType,
            productDescription,
            quantity,
            stock,
            sellPrice,
            unitCost,
            productionDate,
            photoUrl
        } = req.body || {};

        if (!clean(productName)) {
            return res.status(400).json({
                success: false,
                error: "የምርት ስም ያስፈልጋል።"
            });
        }

        const money = calculateProduct({
            quantity,
            stock,
            sellPrice,
            unitCost
        });

        const now = new Date().toISOString();

        const product = {
            productName: clean(productName),
            productType: clean(productType),
            productDescription: clean(productDescription),

            ...money,

            productionDate: clean(productionDate),
            photoUrl: clean(photoUrl),

            createdAt: now,
            updatedAt: now
        };

        const doc = await db
            .collection("selfProducts")
            .add(product);

        res.status(201).json({
            success: true,
            message: "ምርቱ በFirebase ተቀምጧል።",
            product: {
                id: doc.id,
                ...product
            }
        });

    } catch (error) {
        console.error("Self Product CREATE Error:", error);

        res.status(500).json({
            success: false,
            error: "ምርቱን ማስቀመጥ አልተቻለም።"
        });
    }
});

/* =========================================================
   UPDATE SELF-MADE PRODUCT
   ========================================================= */

router.patch("/self-products/:id", async (req, res) => {
    try {
        const id = clean(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                error: "የምርት ID ያስፈልጋል።"
            });
        }

        const ref = db
            .collection("selfProducts")
            .doc(id);

        const existing = await ref.get();

        if (!existing.exists) {
            return res.status(404).json({
                success: false,
                error: "ምርቱ አልተገኘም።"
            });
        }

        const old = existing.data() || {};
        const body = req.body || {};

        const merged = {
            ...old,
            ...body
        };

        const money = calculateProduct(merged);

        const updated = {
            productName: clean(merged.productName),
            productType: clean(merged.productType),
            productDescription: clean(merged.productDescription),

            ...money,

            productionDate: clean(merged.productionDate),
            photoUrl: clean(merged.photoUrl),

            updatedAt: new Date().toISOString()
        };

        await ref.set(updated, {
            merge: true
        });

        res.json({
            success: true,
            message: "ምርቱ ተስተካክሏል።",
            product: {
                id,
                ...old,
                ...updated
            }
        });

    } catch (error) {
        console.error("Self Product UPDATE Error:", error);

        res.status(500).json({
            success: false,
            error: "ምርቱን ማስተካከል አልተቻለም።"
        });
    }
});


/* =========================================================
   SELF PRODUCT SALES
   ========================================================= */

/* CREATE SALE */

router.post("/self-products/:id/sales", async (req, res) => {
    try {
        const productId = clean(req.params.id);

        if (!productId) {
            return res.status(400).json({
                success: false,
                error: "የምርት ID ያስፈልጋል።"
            });
        }

        const productRef = db
            .collection("selfProducts")
            .doc(productId);

        const productSnap = await productRef.get();

        if (!productSnap.exists) {
            return res.status(404).json({
                success: false,
                error: "ምርቱ አልተገኘም።"
            });
        }

        const product = productSnap.data() || {};
        const body = req.body || {};

        const quantity = Math.max(
            0,
            number(body.quantity)
        );

        const salePrice = Math.max(
            0,
            number(body.salePrice ?? product.sellPrice)
        );

        const unitCost = Math.max(
            0,
            number(body.unitCost ?? product.unitCost)
        );

        const currentStock = Math.max(
            0,
            number(product.stock)
        );

        if (quantity <= 0) {
            return res.status(400).json({
                success: false,
                error: "የተሸጠው ብዛት ከ 0 በላይ መሆን አለበት።"
            });
        }

        if (quantity > currentStock) {
            return res.status(400).json({
                success: false,
                error:
                    "በStock ላይ " +
                    currentStock +
                    " ብቻ አለ።"
            });
        }

        const saleDate =
            clean(body.saleDate) ||
            new Date().toISOString().slice(0, 10);

        const totalSales = calculator.multiply(salePrice, quantity);
        const totalCost = calculator.multiply(unitCost, quantity);
        const totalProfit = calculator.subtract(totalSales, totalCost);

        const received = Math.max(
            0,
            number(body.received ?? body.paidAmount ?? totalSales)
        );

        if (received > totalSales) {
            return res.status(400).json({
                success: false,
                error: "የተቀበለው ክፍያ ከጠቅላላ ሽያጭ መብለጥ አይችልም።"
            });
        }

        const receivable = calculator.subtract(
            totalSales,
            received
        );

    const now = new Date().toISOString();

        const sale = {
            productId,
            productName: clean(product.productName),
            productType: clean(product.productType),

            quantity,
            salePrice,
            unitCost,

            totalSales,
            totalCost,
            totalProfit,

            received,
            receivable,

            saleDate,

            createdAt: now,
            updatedAt: now
        };

        const saleRef = await productRef
            .collection("sales")
            .add(sale);

        const newStock = currentStock - quantity;

        await productRef.set({
            stock: newStock,
            updatedAt: now
        }, {
            merge: true
        });

        await recordStockMovement({
            itemType: "selfProduct",
            itemId: productId,
            itemName: product.productName,
            movementType: "SALE",
            quantity,
            unit: "ቁጥር",
            previousStock: currentStock,
            remainingStock: newStock,
            unitCost,
            totalValue: totalCost,
            referenceId: saleRef.id,
            movementDate: saleDate,
            createdAt: now
        });

        res.status(201).json({
            success: true,
            message: "ሽያጩ በFirebase ተመዝግቧል።",

            sale: {
                id: saleRef.id,
                ...sale
            },

            stock: {
                previous: currentStock,
                sold: quantity,
                remaining: newStock
            }
        });

    } catch (error) {
        console.error(
            "Self Product SALE Error:",
            error
        );

        res.status(500).json({
            success: false,
            error: "ሽያጩን መመዝገብ አልተቻለም።"
        });
    }
});


/* GET SALES HISTORY */

router.get("/self-products/:id/sales", async (req, res) => {
    try {
        const productId = clean(req.params.id);

        const productRef = db
            .collection("selfProducts")
            .doc(productId);

        const productSnap = await productRef.get();

        if (!productSnap.exists) {
            return res.status(404).json({
                success: false,
                error: "ምርቱ አልተገኘም።"
            });
        }

        const snapshot = await productRef
            .collection("sales")
            .orderBy("saleDate", "desc")
            .get();

        const sales = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        const summary = sales.reduce(
            (acc, sale) => {
                acc.quantity += number(sale.quantity);
                acc.totalSales += number(sale.totalSales);
                acc.totalCost += number(sale.totalCost);
                acc.totalProfit += number(sale.totalProfit);
                return acc;
            },
            {
                quantity: 0,
                totalSales: 0,
                totalCost: 0,
                totalProfit: 0
            }
        );

        res.json({
            success: true,
            productId,
            count: sales.length,
            summary,
            sales
        });

    } catch (error) {
        console.error(
            "Self Product SALES GET Error:",
            error
        );

        res.status(500).json({
            success: false,
            error: "የሽያጭ ታሪኩን ማምጣት አልተቻለም።"
        });
    }
});


/* =========================================================
   DELETE SELF-MADE PRODUCT
   ========================================================= */

router.delete("/self-products/:id", async (req, res) => {
    try {
        const id = clean(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                error: "የምርት ID ያስፈልጋል።"
            });
        }

        const ref = db
            .collection("selfProducts")
            .doc(id);

        const existing = await ref.get();

        if (!existing.exists) {
            return res.status(404).json({
                success: false,
                error: "ምርቱ አልተገኘም።"
            });
        }

        const data = existing.data() || {};

        const result = await moveToUniversalTrash({
            collection: "selfProducts",
            id,
            data,
            type: "selfProduct",
            displayName:
                data.name ||
                data.productName ||
                data.title ||
                "Self Product",
            extra: {
                deletedFrom: "selfProducts"
            }
        });

        return res.json({
            success: true,
            trashed: true,
            trashId: result.trashId,
            message: "🗑️ ምርቱ ወደ Universal Trash ተወስዷል።",
            product: result
        });

    } catch (error) {
        console.error(
            "Self Product Universal Trash Error:",
            error
        );

        return res.status(500).json({
            success: false,
            error:
                error.message ||
                "ምርቱን ወደ Universal Trash መውሰድ አልተቻለም።"
        });
    }
});


/* =========================================================
   SELF-PRODUCT FINANCE — OWN ACCOUNTING ONLY
   ========================================================= */

router.get("/self-products-finance/summary", async (req, res) => {
    try {
        const productsSnap = await db.collection("selfProducts").get();

        let stockQuantity = 0;
        let stockValue = 0;
        let totalSoldQuantity = 0;
        let totalSales = 0;
        let totalCost = 0;
        let totalProfit = 0;

        const products = [];

        for (const productDoc of productsSnap.docs) {
            const product = productDoc.data() || {};

            const salesSnap = await db
                .collection("selfProducts")
                .doc(productDoc.id)
                .collection("sales")
                .get();

            let soldQuantity = 0;
            let sales = 0;
            let cost = 0;
            let profit = 0;

            salesSnap.forEach(doc => {
                const sale = doc.data() || {};
                soldQuantity += number(sale.quantity);
                sales += number(sale.totalSales);
                cost += number(sale.totalCost);
                profit += number(sale.totalProfit);
            });

            const stock = Math.max(0, number(product.stock));
            const unitCost = Math.max(0, number(product.unitCost));

            stockQuantity += stock;
            stockValue += stock * unitCost;
            totalSoldQuantity += soldQuantity;
            totalSales += sales;
            totalCost += cost;
            totalProfit += profit;

            products.push({
                id: productDoc.id,
                productName: clean(product.productName),
                productType: clean(product.productType),
                stock,
                stockValue: stock * unitCost,
                soldQuantity,
                totalSales: sales,
                totalCost: cost,
                totalProfit: profit
            });
        }

        const profitMargin =
            totalSales > 0
                ? (totalProfit / totalSales) * 100
                : 0;

        res.json({
            success: true,
            scope: "self-products-only",
            summary: {
                products: productsSnap.size,
                stockQuantity,
                stockValue,
                totalSoldQuantity,
                totalSales,
                totalCost,
                totalProfit,
                profitMargin
            },
            products
        });

    } catch (error) {
        console.error("Self Products Finance Summary Error:", error);

        res.status(500).json({
            success: false,
            error: "የSelf-Product ፋይናንስ ስሌት ማስኬድ አልተቻለም።"
        });
    }
});


// =========================================================
// STOCK MOVEMENT LEDGER — PHASE 1
// Backend-only transaction audit
// =========================================================
async function recordStockMovement(data) {
    const movement = {
        itemType: data.itemType,
        itemId: data.itemId,
        itemName: clean(data.itemName),
        movementType: data.movementType,
        quantity: number(data.quantity),
        unit: clean(data.unit),
        previousStock: number(data.previousStock),
        remainingStock: number(data.remainingStock),
        unitCost: number(data.unitCost),
        totalValue: number(data.totalValue),
        referenceId: clean(data.referenceId),
        movementDate: clean(data.movementDate),
        createdAt: data.createdAt || new Date().toISOString()
    };

    if (
        !movement.itemType ||
        !movement.itemId ||
        !movement.movementType ||
        movement.quantity <= 0
    ) {
        throw new Error("Invalid stock movement");
    }

    return db.collection("stockMovements").add(movement);
}

module.exports = router;
