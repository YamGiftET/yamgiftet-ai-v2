const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const { db } = require("./firebase");
const { moveToUniversalTrash } = require("./trash-helper");
const calculator = require("./universal-calculator");

/* =========================================================
   RAW_MATERIAL_PHOTO_UPLOAD_ADDED
   YamGiftET AI v2 — Raw Material Photo Upload
   ========================================================= */

const rawMaterialUploadDir = path.join(
    __dirname,
    "uploads",
    "raw-materials"
);

if (!fs.existsSync(rawMaterialUploadDir)) {
    fs.mkdirSync(rawMaterialUploadDir, { recursive: true });
}

const rawMaterialStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, rawMaterialUploadDir);
    },

    filename: (req, file, cb) => {
        const ext = path.extname(
            file.originalname || ""
        ).toLowerCase();

        const name =
            "raw-material-" +
            Date.now() +
            "-" +
            Math.random().toString(36).slice(2, 8) +
            ext;

        cb(null, name);
    }
});

const rawMaterialUpload = multer({
    storage: rawMaterialStorage,

    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {
        if (
            file &&
            file.mimetype &&
            file.mimetype.startsWith("image/")
        ) {
            cb(null, true);
        } else {
            cb(
                new Error("የምስል ፋይል ብቻ ይፈቀዳል።")
            );
        }
    }
});

/* =========================================================
   YamGiftET AI v2
   RAW MATERIALS + EXPENSES API
   ========================================================= */

function clean(value) {
    return String(value ?? "").trim();
}

function number(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function positiveNumber(value) {
    return Math.max(0, number(value));
}

function nowISO() {
    return new Date().toISOString();
}

/* =========================================================
   RAW MATERIAL PHOTO UPLOAD
   ========================================================= */

router.post(
    "/raw-materials/upload-photo",
    rawMaterialUpload.single("photo"),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: "የጥሬ እቃ ፎቶ ያስፈልጋል።"
                });
            }

            const photoUrl =
                "/uploads/raw-materials/" +
                req.file.filename;

            return res.status(201).json({
                success: true,
                message: "የጥሬ እቃ ፎቶው በትክክል ተጫኗል።",
                photoUrl
            });

        } catch (error) {
            console.error(
                "Raw Material Photo Upload Error:",
                error
            );

            return res.status(500).json({
                success: false,
                error:
                    error.message ||
                    "የጥሬ እቃ ፎቶውን መጫን አልተቻለም።"
            });
        }
    }
);

/* =========================================================
   RAW MATERIAL CALCULATIONS
   ========================================================= */

function calculateMaterial(data = {}) {
    const quantity = positiveNumber(data.quantity);
    const stock = positiveNumber(data.stock);
    const unitCost = positiveNumber(data.unitCost);

    return {
        quantity,
        stock,
        unitCost,
        stockValue: calculator.multiply(stock, unitCost)
    };
}

/* =========================================================
   GET ALL RAW MATERIALS
   ========================================================= */

router.get("/raw-materials", async (req, res) => {
    try {
        const snapshot = await db
            .collection("rawMaterials")
            .orderBy("createdAt", "desc")
            .get();

        const materials = snapshot.docs.map(doc => {
            const data = doc.data() || {};

            return {
                id: doc.id,
                ...data,
                ...calculateMaterial(data)
            };
        });

        const summary = materials.reduce(
            (acc, material) => {
                acc.totalItems += 1;
                acc.totalStock += number(material.stock);
                acc.totalStockValue += number(material.stockValue);
                return acc;
            },
            {
                totalItems: 0,
                totalStock: 0,
                totalStockValue: 0
            }
        );

        res.json({
            success: true,
            count: materials.length,
            summary,
            materials
        });

    } catch (error) {
        console.error("Raw Materials GET Error:", error);

        res.status(500).json({
            success: false,
            error: "የጥሬ እቃዎችን ማምጣት አልተቻለም።"
        });
    }
});

/* =========================================================
   GET ONE RAW MATERIAL
   ========================================================= */

router.get("/raw-materials/:id", async (req, res) => {
    try {
        const id = clean(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                error: "የጥሬ እቃ ID ያስፈልጋል።"
            });
        }

        const doc = await db
            .collection("rawMaterials")
            .doc(id)
            .get();

        if (!doc.exists) {
            return res.status(404).json({
                success: false,
                error: "ጥሬ እቃው አልተገኘም።"
            });
        }

        const data = doc.data() || {};

        res.json({
            success: true,
            material: {
                id: doc.id,
                ...data,
                ...calculateMaterial(data)
            }
        });

    } catch (error) {
        console.error("Raw Material GET Error:", error);

        res.status(500).json({
            success: false,
            error: "ጥሬ እቃውን ማምጣት አልተቻለም።"
        });
    }
});

/* =========================================================
   CREATE RAW MATERIAL
   ========================================================= */

router.post("/raw-materials", async (req, res) => {
    try {
        const body = req.body || {};

        const materialName = clean(body.materialName);
        const category = clean(body.category);
        const unit = clean(body.unit) || "ቁጥር";

        if (!materialName) {
            return res.status(400).json({
                success: false,
                error: "የጥሬ እቃ ስም ያስፈልጋል።"
            });
        }

        const money = calculateMaterial({
            quantity: body.quantity,
            stock: body.stock,
            unitCost: body.unitCost
        });

        const now = nowISO();

        const material = {
            materialName,
            category,
            unit,

            ...money,

            minimumStock: positiveNumber(body.minimumStock),
            supplier: clean(body.supplier),
            description: clean(body.description),
            photoUrl: clean(body.photoUrl),

            createdAt: now,
            updatedAt: now
        };

        const ref = await db
            .collection("rawMaterials")
            .add(material);

        res.status(201).json({
            success: true,
            message: "ጥሬ እቃው በFirebase ተመዝግቧል።",
            material: {
                id: ref.id,
                ...material
            }
        });

    } catch (error) {
        console.error("Raw Material CREATE Error:", error);

        res.status(500).json({
            success: false,
            error: "ጥሬ እቃውን ማስቀመጥ አልተቻለም።"
        });
    }
});

/* =========================================================
   UPDATE RAW MATERIAL
   ========================================================= */

router.patch("/raw-materials/:id", async (req, res) => {
    try {
        const id = clean(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                error: "የጥሬ እቃ ID ያስፈልጋል።"
            });
        }

        const ref = db
            .collection("rawMaterials")
            .doc(id);

        const existing = await ref.get();

        if (!existing.exists) {
            return res.status(404).json({
                success: false,
                error: "ጥሬ እቃው አልተገኘም።"
            });
        }

        const old = existing.data() || {};
        const merged = {
            ...old,
            ...(req.body || {})
        };

        const money = calculateMaterial(merged);

        const updated = {
            materialName: clean(merged.materialName),
            category: clean(merged.category),
            unit: clean(merged.unit) || "ቁጥር",

            ...money,

            minimumStock: positiveNumber(merged.minimumStock),
            supplier: clean(merged.supplier),
            description: clean(merged.description),
            photoUrl: clean(merged.photoUrl),

            updatedAt: nowISO()
        };

        await ref.set(updated, {
            merge: true
        });

        res.json({
            success: true,
            message: "ጥሬ እቃው ተስተካክሏል።",
            material: {
                id,
                ...old,
                ...updated
            }
        });

    } catch (error) {
        console.error("Raw Material UPDATE Error:", error);

        res.status(500).json({
            success: false,
            error: "ጥሬ እቃውን ማስተካከል አልተቻለም።"
        });
    }
});

/* =========================================================
   DELETE RAW MATERIAL
   ========================================================= */

router.delete("/raw-materials/:id", async (req, res) => {
    try {
        const id = clean(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                error: "የጥሬ እቃ ID ያስፈልጋል።"
            });
        }

        const ref = db
            .collection("rawMaterials")
            .doc(id);

        const existing = await ref.get();

        if (!existing.exists) {
            return res.status(404).json({
                success: false,
                error: "ጥሬ እቃው አልተገኘም።"
            });
        }

        const data = existing.data() || {};

        const result = await moveToUniversalTrash({
            collection: "rawMaterials",
            id,
            data,
            type: "rawMaterial",
            displayName:
                data.name ||
                data.materialName ||
                data.title ||
                "Raw Material",
            extra: {
                deletedFrom: "rawMaterials"
            }
        });

        return res.json({
            success: true,
            trashed: true,
            trashId: result.trashId,
            message: "🗑️ ጥሬ እቃው ወደ Universal Trash ተወስዷል።",
            item: result
        });

    } catch (error) {
        console.error(
            "Raw Material Universal Trash Error:",
            error
        );

        return res.status(500).json({
            success: false,
            error:
                error.message ||
                "ጥሬ እቃውን ወደ Universal Trash መውሰድ አልተቻለም።"
        });
    }
});

router.post("/raw-materials/:id/purchases", async (req, res) => {
    try {
        const materialId = clean(req.params.id);

        if (!materialId) {
            return res.status(400).json({
                success: false,
                error: "የጥሬ እቃ ID ያስፈልጋል።"
            });
        }

        const materialRef = db
            .collection("rawMaterials")
            .doc(materialId);

        const materialSnap = await materialRef.get();

        if (!materialSnap.exists) {
            return res.status(404).json({
                success: false,
                error: "ጥሬ እቃው አልተገኘም።"
            });
        }

        const material = materialSnap.data() || {};
        const body = req.body || {};

        const quantity = positiveNumber(body.quantity);
        const unitCost = positiveNumber(
            body.unitCost ?? material.unitCost
        );

        if (quantity <= 0) {
            return res.status(400).json({
                success: false,
                error: "የግዢ ብዛት ከ 0 በላይ መሆን አለበት።"
            });
        }

        if (unitCost <= 0) {
            return res.status(400).json({
                success: false,
                error: "የአንድ እቃ ዋጋ ከ 0 በላይ መሆን አለበት።"
            });
        }

        const purchaseTotal = calculator.multiply(quantity, unitCost);
        const oldStock = positiveNumber(material.stock);
        const newStock = oldStock + quantity;

        const purchaseDate =
            clean(body.purchaseDate) ||
            new Date().toISOString().slice(0, 10);

        const now = nowISO();

        const purchase = {
            materialId,
            materialName: clean(material.materialName),
            category: clean(material.category),
            unit: clean(material.unit),

            quantity,
            unitCost,
            totalCost: purchaseTotal,

            supplier: clean(body.supplier),
            purchaseDate,
            notes: clean(body.notes),

            createdAt: now,
            updatedAt: now
        };

        const purchaseRef = await db
            .collection("materialPurchases")
            .add(purchase);

        await materialRef.set({
            stock: newStock,
            unitCost,
            updatedAt: now
        }, {
            merge: true
        });

        await recordStockMovement({
            itemType: "rawMaterial",
            itemId: materialId,
            itemName: material.materialName,
            movementType: "PURCHASE",
            quantity,
            unit: material.unit,
            previousStock: oldStock,
            remainingStock: newStock,
            unitCost,
            totalValue: purchaseTotal,
            referenceId: purchaseRef.id,
            movementDate: purchaseDate,
            createdAt: now
        });

        res.status(201).json({
            success: true,
            message: "ግዢው ተመዝግቦ Stock ተጨምሯል።",

            purchase: {
                id: purchaseRef.id,
                ...purchase
            },

            stock: {
                previous: oldStock,
                added: quantity,
                remaining: newStock
            }
        });

    } catch (error) {
        console.error("Material Purchase Error:", error);

        res.status(500).json({
            success: false,
            error: "የጥሬ እቃ ግዢን መመዝገብ አልተቻለም።"
        });
    }
});

/* =========================================================
   PURCHASE HISTORY
   ========================================================= */

router.get("/raw-materials/:id/purchases", async (req, res) => {
    try {
        const materialId = clean(req.params.id);

        const snapshot = await db
            .collection("materialPurchases")
            .where("materialId", "==", materialId)
            .orderBy("purchaseDate", "desc")
            .get();

        const purchases = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        const summary = purchases.reduce(
            (acc, item) => {
                acc.quantity += number(item.quantity);
                acc.totalCost += number(item.totalCost);
                return acc;
            },
            {
                quantity: 0,
                totalCost: 0
            }
        );

        res.json({
            success: true,
            materialId,
            count: purchases.length,
            summary,
            purchases
        });

    } catch (error) {
        console.error("Material Purchase History Error:", error);

        res.status(500).json({
            success: false,
            error: "የግዢ ታሪኩን ማምጣት አልተቻለም።"
        });
    }
});

/* =========================================================
   GENERAL BUSINESS EXPENSES
   ========================================================= */

router.get("/expenses", async (req, res) => {
    try {
        const snapshot = await db
            .collection("expenses")
            .orderBy("expenseDate", "desc")
            .get();

        const expenses = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        const summary = expenses.reduce(
            (acc, expense) => {
                acc.total += number(expense.amount);
                return acc;
            },
            {
                total: 0
            }
        );

        res.json({
            success: true,
            count: expenses.length,
            summary,
            expenses
        });

    } catch (error) {
        console.error("Expenses GET Error:", error);

        res.status(500).json({
            success: false,
            error: "የወጪ መረጃዎችን ማምጣት አልተቻለም።"
        });
    }
});

/* =========================================================
   CREATE GENERAL EXPENSE
   ========================================================= */

router.post("/expenses", async (req, res) => {
    try {
        const body = req.body || {};

        const title = clean(body.title);
        const category = clean(body.category) || "ሌላ";
        const amount = positiveNumber(body.amount);

        if (!title) {
            return res.status(400).json({
                success: false,
                error: "የወጪው ስም ያስፈልጋል።"
            });
        }

        if (amount <= 0) {
            return res.status(400).json({
                success: false,
                error: "የወጪው መጠን ከ 0 በላይ መሆን አለበት።"
            });
        }

        const now = nowISO();

        const expense = {
            title,
            category,
            amount,

            expenseDate:
                clean(body.expenseDate) ||
                now.slice(0, 10),

            description: clean(body.description),
            paymentMethod: clean(body.paymentMethod),
            reference: clean(body.reference),

            createdAt: now,
            updatedAt: now
        };

        const ref = await db
            .collection("expenses")
            .add(expense);

        res.status(201).json({
            success: true,
            message: "ወጪው ተመዝግቧል።",
            expense: {
                id: ref.id,
                ...expense
            }
        });

    } catch (error) {
        console.error("Expense CREATE Error:", error);

        res.status(500).json({
            success: false,
            error: "ወጪውን ማስቀመጥ አልተቻለም።"
        });
    }
});

/* =========================================================
   UPDATE EXPENSE
   ========================================================= */

router.patch("/expenses/:id", async (req, res) => {
    try {
        const id = clean(req.params.id);

        const ref = db
            .collection("expenses")
            .doc(id);

        const existing = await ref.get();

        if (!existing.exists) {
            return res.status(404).json({
                success: false,
                error: "ወጪው አልተገኘም።"
            });
        }

        const old = existing.data() || {};
        const merged = {
            ...old,
            ...(req.body || {})
        };

        const updated = {
            title: clean(merged.title),
            category: clean(merged.category) || "ሌላ",
            amount: positiveNumber(merged.amount),

            expenseDate: clean(merged.expenseDate),
            description: clean(merged.description),
            paymentMethod: clean(merged.paymentMethod),
            reference: clean(merged.reference),

            updatedAt: nowISO()
        };

        await ref.set(updated, {
            merge: true
        });

        res.json({
            success: true,
            message: "ወጪው ተስተካክሏል።",
            expense: {
                id,
                ...old,
                ...updated
            }
        });

    } catch (error) {
        console.error("Expense UPDATE Error:", error);

        res.status(500).json({
            success: false,
            error: "ወጪውን ማስተካከል አልተቻለም።"
        });
    }
});

/* =========================================================
   DELETE EXPENSE
   ========================================================= */

router.delete("/expenses/:id", async (req, res) => {
    try {
        const id = clean(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                error: "የወጪ ID ያስፈልጋል።"
            });
        }

        const ref = db
            .collection("expenses")
            .doc(id);

        const existing = await ref.get();

        if (!existing.exists) {
            return res.status(404).json({
                success: false,
                error: "ወጪው አልተገኘም።"
            });
        }

        const data = existing.data() || {};

        const result = await moveToUniversalTrash({
            collection: "expenses",
            id,
            data,
            type: "expense",
            displayName:
                data.description ||
                data.name ||
                data.title ||
                data.category ||
                "Expense",
            extra: {
                deletedFrom: "expenses"
            }
        });

        return res.json({
            success: true,
            trashed: true,
            trashId: result.trashId,
            message: "🗑️ ወጪው ወደ Universal Trash ተወስዷል።",
            expense: result
        });

    } catch (error) {
        console.error(
            "Expense Universal Trash Error:",
            error
        );

        return res.status(500).json({
            success: false,
            error:
                error.message ||
                "ወጪውን ወደ Universal Trash መውሰድ አልተቻለም።"
        });
    }
});

/*
 =========================================================
   FINANCIAL SUMMARY
   ========================================================= */

router.get("/financial-summary", async (req, res) => {
    try {
        const [ordersSnap, deliveredSnap, purchasesSnap, expensesSnap] =
            await Promise.all([
                db.collection("orders").get(),
                db.collection("deliveredOrders").get(),
                db.collection("materialPurchases").get(),
                db.collection("expenses").get()
            ]);

        // የተረከቡ ትዕዛዞችን ከActive Orders እንዳይደግሙ መለየት
        const deliveredOriginalIds = new Set();

        deliveredSnap.forEach(doc => {
            const data = doc.data() || {};

            if (data.originalOrderId) {
                deliveredOriginalIds.add(String(data.originalOrderId));
            }
        });

        let orderSales = 0;
        let orderWorkCost = 0;
        let orderProfit = 0;

        ordersSnap.forEach(doc => {
            // ይህ Order ከዚህ በፊት Delivered ከሆነ እዚህ አንቆጥረውም
            if (deliveredOriginalIds.has(String(doc.id))) {
                return;
            }

            const data = doc.data() || {};

            orderSales += number(data.totalAmount);
            orderWorkCost += number(data.workCost);
            orderProfit += number(data.profit);
        });

        let deliveredSales = 0;
        let deliveredCost = 0;
        let deliveredProfit = 0;

        deliveredSnap.forEach(doc => {
            const data = doc.data() || {};

            deliveredSales += number(data.totalAmount);
            deliveredCost += number(data.workCost);
            deliveredProfit += number(data.profit);
        });

        let materialPurchaseCost = 0;

        purchasesSnap.forEach(doc => {
            const data = doc.data() || {};
            materialPurchaseCost += number(data.totalCost);
        });

        let otherExpenses = 0;

        expensesSnap.forEach(doc => {
            const data = doc.data() || {};
            otherExpenses += number(data.amount);
        });

        const totalSales = orderSales + deliveredSales;
        const totalRecordedWorkCost =
            orderWorkCost + deliveredCost;

        const totalExpenses =
            totalRecordedWorkCost +
            materialPurchaseCost +
            otherExpenses;

        const estimatedNetProfit =
            totalSales - totalExpenses;

        res.json({
            success: true,

            sales: {
                activeOrders: orderSales,
                deliveredOrders: deliveredSales,
                total: totalSales
            },

            expenses: {
                orderWorkCost: totalRecordedWorkCost,
                rawMaterialPurchases: materialPurchaseCost,
                otherExpenses,
                total: totalExpenses
            },

            profit: {
                estimatedNetProfit
            }
        });

    } catch (error) {
        console.error("Financial Summary Error:", error);

        res.status(500).json({
            success: false,
            error: "የፋይናንስ ማጠቃለያውን ማምጣት አልተቻለም።"
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
