const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const { db } = require("./firebase");
const { FieldValue } = require("firebase-admin/firestore");
const { moveToUniversalTrash } = require("./trash-helper");
const calculator = require("./universal-calculator");
const {
  normalizeUnit,
  getUnitFamily
} = require("./units-converter-engine");
const {
  calculateArea
} = require("./area-costing-engine");

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

function normalizeFinishedProductUnit(value) {
    const unit = normalizeUnit(value || "pcs");
    if (!unit || !getUnitFamily(unit)) {
        throw new Error("የFinished Product Unit ልክ አይደለም።");
    }
    return unit;
}


function stockIdempotencyHash(data) {
    return crypto
        .createHash("sha256")
        .update(JSON.stringify(data))
        .digest("hex");
}

function stockIdempotencyRef(requestId) {
    const cleanRequestId = clean(requestId);
    if (!cleanRequestId) return null;

    const safeId = crypto
        .createHash("sha256")
        .update(cleanRequestId)
        .digest("hex");

    return db.collection("stockIdempotency").doc(safeId);
}

function calculateProduct(data = {}) {
    const rawUnit = normalizeUnit(data.unit || "pcs");
    const unitFamily = getUnitFamily(rawUnit);
    const isAreaProduct = unitFamily === "area";

    let quantity = Math.max(0, number(data.quantity));
    let stock = Math.max(0, number(data.stock));
    const sellPrice = Math.max(0, number(data.sellPrice));
    let unitCost = Math.max(0, number(data.unitCost));

    let areaSnapshot = {};

    if (isAreaProduct) {
        const dimensionUnit = normalizeUnit(data.dimensionUnit || "cm");

        const areaResult = calculateArea({
            length: data.length,
            width: data.width,
            dimensionUnit
        });

        const area = number(
            rawUnit === "mm2"
                ? areaResult.areaMm2
                : rawUnit === "cm2"
                    ? areaResult.areaCm2
                    : areaResult.areaM2
        );

        const areaUnit = rawUnit;

        if (area <= 0) {
            throw new Error("Area ከ0 በላይ መሆን አለበት።");
        }

        quantity = area;
        stock = Math.max(0, number(data.stock));

        areaSnapshot = {
            length: number(data.length),
            width: number(data.width),
            dimensionUnit,
            area,
            areaUnit,
            thickness: data.thickness === undefined || data.thickness === ""
                ? null
                : number(data.thickness),
            thicknessUnit: clean(data.thicknessUnit)
                ? normalizeUnit(data.thicknessUnit)
                : null
        };
    }

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
        totalProfit,
        ...areaSnapshot
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
            photoUrl,
            unit,
            length,
            width,
            dimensionUnit,
            thickness,
            thicknessUnit
        } = req.body || {};

        if (!clean(productName)) {
            return res.status(400).json({
                success: false,
                error: "የምርት ስም ያስፈልጋል።"
            });
        }

        let normalizedUnit;
        try {
            normalizedUnit = normalizeFinishedProductUnit(unit);
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }

        const money = calculateProduct({
            quantity,
            stock,
            sellPrice,
            unitCost,
            unit: normalizedUnit,
            length,
            width,
            dimensionUnit,
            thickness,
            thicknessUnit
        });

        const now = new Date().toISOString();

        const product = {
            productName: clean(productName),
            productType: clean(productType),
            productDescription: clean(productDescription),
            unit: normalizedUnit,

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

        const validationMessages = [
            "ከ 0 በላይ መሆን አለበት።",
            "Length/Width Unit የLength Unit መሆን አለበት።"
        ];

        const isValidationError = validationMessages.some(message =>
            String(error?.message || "").includes(message)
        );

        res.status(isValidationError ? 400 : 500).json({
            success: false,
            error: isValidationError
                ? error.message
                : "ምርቱን ማስቀመጥ አልተቻለም።"
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

        const requestedUnit = Object.prototype.hasOwnProperty.call(body, "unit")
            ? body.unit
            : (old.unit || "pcs");

        let normalizedUnit;
        try {
            normalizedUnit = normalizeFinishedProductUnit(requestedUnit);
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }

        const oldUnit = old.unit
            ? normalizeFinishedProductUnit(old.unit)
            : "pcs";

        const currentStock = Math.max(0, number(old.stock));

        if (currentStock > 0 && normalizedUnit !== oldUnit) {
            return res.status(409).json({
                success: false,
                error: "Stock እያለ የFinished Product Unit መቀየር አይቻልም።"
            });
        }

        const merged = {
            ...old,
            ...body,
            unit: normalizedUnit
        };

        const money = calculateProduct(merged);

        const updated = {
            productName: clean(merged.productName),
            productType: clean(merged.productType),
            productDescription: clean(merged.productDescription),
            unit: normalizedUnit,

            ...money,

            productionDate: clean(merged.productionDate),
            photoUrl: clean(merged.photoUrl),

            updatedAt: new Date().toISOString()
        };

        const oldUnitFamily = getUnitFamily(oldUnit);
        const newUnitFamily = getUnitFamily(normalizedUnit);

        if (oldUnitFamily === "area" && newUnitFamily !== "area") {
            updated.length = FieldValue.delete();
            updated.width = FieldValue.delete();
            updated.dimensionUnit = FieldValue.delete();
            updated.area = FieldValue.delete();
            updated.areaUnit = FieldValue.delete();
            updated.thickness = FieldValue.delete();
            updated.thicknessUnit = FieldValue.delete();
        }

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

        const validationMessages = [
            "ከ 0 በላይ መሆን አለበት።",
            "Length/Width Unit የLength Unit መሆን አለበት።"
        ];

        const isValidationError = validationMessages.some(message =>
            String(error?.message || "").includes(message)
        );

        res.status(isValidationError ? 400 : 500).json({
            success: false,
            error: isValidationError
                ? error.message
                : "ምርቱን ማስተካከል አልተቻለም።"
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

        const body = req.body || {};

        const quantity = Math.max(
            0,
            number(body.quantity)
        );

        const salePrice = Math.max(
            0,
            number(body.salePrice)
        );

        const saleDate =
            clean(body.saleDate) ||
            new Date().toISOString().slice(0, 10);

        const now = new Date().toISOString();

        const requestId = clean(body.requestId);

        const idempotencyPayload = {
            operation: "SELF_PRODUCT_SALE",
            productId,
            quantity,
            salePrice,
            unitCost: body.unitCost ?? null,
            saleDate,
            received: body.received ?? body.paidAmount ?? null
        };

        const idempotencyHash =
            stockIdempotencyHash(idempotencyPayload);

        const idempotencyRef =
            stockIdempotencyRef(requestId);

        const result = await db.runTransaction(async transaction => {
            let idempotencySnap = null;

            if (idempotencyRef) {
                idempotencySnap =
                    await transaction.get(idempotencyRef);
            }

            const productSnap =
                await transaction.get(productRef);

            if (idempotencySnap && idempotencySnap.exists) {
                const previous =
                    idempotencySnap.data() || {};

                if (previous.payloadHash !== idempotencyHash) {
                    const error = new Error(
                        "ይህ requestId ቀድሞ በተለየ የሽያጭ መረጃ ተጠቅሟል።"
                    );
                    error.statusCode = 409;
                    throw error;
                }

                if (!previous.result) {
                    const error = new Error(
                        "የቀድሞው idempotency result አልተገኘም።"
                    );
                    error.statusCode = 409;
                    throw error;
                }

                return previous.result;
            }

            if (!productSnap.exists) {
                const error = new Error("ምርቱ አልተገኘም።");
                error.statusCode = 404;
                throw error;
            }

            const product = productSnap.data() || {};

            let productUnit;
            try {
                productUnit = normalizeFinishedProductUnit(
                    product.unit || "pcs"
                );
            } catch (error) {
                const unitError = new Error(
                    "የFinished Product Unit ልክ አይደለም።"
                );
                unitError.statusCode = 400;
                throw unitError;
            }

            const unitCost = Math.max(
                0,
                number(body.unitCost ?? product.unitCost)
            );

            const currentStock = Math.max(
                0,
                number(product.stock)
            );

            if (quantity <= 0) {
                const error = new Error(
                    "የተሸጠው ብዛት ከ 0 በላይ መሆን አለበት።"
                );
                error.statusCode = 400;
                throw error;
            }

            if (salePrice <= 0) {
                const error = new Error(
                    "የሽያጭ ዋጋ ከ 0 በላይ መሆን አለበት።"
                );
                error.statusCode = 400;
                throw error;
            }

            if (unitCost <= 0) {
                const error = new Error(
                    "የምርቱ የአንድ እቃ ወጪ ከ 0 በላይ መሆን አለበት።"
                );
                error.statusCode = 400;
                throw error;
            }

            if (quantity > currentStock) {
                const error = new Error(
                    "በStock ላይ " +
                    currentStock +
                    " ብቻ አለ።"
                );
                error.statusCode = 400;
                throw error;
            }

            const totalSales =
                calculator.multiply(salePrice, quantity);

            const totalCost =
                calculator.multiply(unitCost, quantity);

            const totalProfit =
                calculator.subtract(totalSales, totalCost);

            const received = Math.max(
                0,
                number(
                    body.received ??
                    body.paidAmount ??
                    totalSales
                )
            );

            if (received > totalSales) {
                const error = new Error(
                    "የተቀበለው ክፍያ ከጠቅላላ ሽያጭ መብለጥ አይችልም።"
                );
                error.statusCode = 400;
                throw error;
            }

            const receivable =
                calculator.subtract(
                    totalSales,
                    received
                );

            const saleRef = productRef
                .collection("sales")
                .doc();

            const areaSaleSnapshot =
                getUnitFamily(productUnit) === "area"
                    ? {
                        length: number(product.length),
                        width: number(product.width),
                        dimensionUnit: clean(product.dimensionUnit)
                            ? normalizeUnit(product.dimensionUnit)
                            : null,
                        area: number(product.area),
                        areaUnit: productUnit,
                        thickness:
                            product.thickness === undefined ||
                            product.thickness === ""
                                ? null
                                : number(product.thickness),
                        thicknessUnit:
                            clean(product.thicknessUnit)
                                ? normalizeUnit(product.thicknessUnit)
                                : null
                    }
                    : {};

            const sale = {
                productId,
                productName: clean(product.productName),
                productType: clean(product.productType),
                quantity,
                unit: productUnit,
                salePrice,
                unitCost,
                totalSales,
                totalCost,
                totalProfit,
                received,
                receivable,
                saleDate,
                ...areaSaleSnapshot,
                createdAt: now,
                updatedAt: now
            };

            const newStock =
                currentStock - quantity;

            transaction.set(
                saleRef,
                sale
            );

            transaction.set(
                productRef,
                {
                    stock: newStock,
                    updatedAt: now
                },
                { merge: true }
            );

            const movementRef = db
                .collection("stockMovements")
                .doc();

            const movement = {
                itemType: "selfProduct",
                itemId: productId,
                itemName: clean(product.productName),
                movementType: "SALE",
                quantity,
                unit: productUnit,
                previousStock: currentStock,
                remainingStock: newStock,
                unitCost,
                totalValue: totalCost,
                referenceId: saleRef.id,
                movementDate: saleDate,
                ...areaSaleSnapshot,
                createdAt: now
            };

            transaction.set(
                movementRef,
                movement
            );

            const transactionResult = {
                saleId: saleRef.id,
                movementId: movementRef.id,
                sale,
                previousStock: currentStock,
                sold: quantity,
                remainingStock: newStock
            };

            if (idempotencyRef) {
                transaction.set(idempotencyRef, {
                    operation: "SELF_PRODUCT_SALE",
                    requestId,
                    payloadHash: idempotencyHash,
                    result: transactionResult,
                    createdAt: now,
                    updatedAt: now
                });
            }

            return transactionResult;
        });

        return res.status(201).json({
            success: true,
            message: "ሽያጩ በAtomic Transaction ተመዝግቦ Stock ቀንሷል።",
            sale: {
                id: result.saleId,
                ...result.sale
            },
            stock: {
                previous: result.previousStock,
                sold: result.sold,
                remaining: result.remainingStock
            }
        });
    } catch (error) {
        console.error(
            "Self Product SALE Error:",
            error
        );

        return res.status(
            error.statusCode || 500
        ).json({
            success: false,
            error:
                error.message ||
                "ሽያጩን መመዝገብ አልተቻለም።"
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
async function recordStockMovement(data, transaction = null) {
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

    const movementRef = db.collection("stockMovements").doc();

    if (transaction) {
        transaction.set(movementRef, movement);
        return movementRef;
    }

    return db.collection("stockMovements").add(movement);
}

module.exports = router;
