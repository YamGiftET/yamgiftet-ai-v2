const express = require("express");
const crypto = require("crypto");

const router = express.Router();
const { db } = require("./firebase");
const { allocateFIFO } = require("./fifo-engine");
const {
    normalizeUnit,
    getUnitFamily,
    isCompatible,
    convert
} = require("./units-converter-engine");

function clean(value) {
    return String(value ?? "").trim();
}

function positiveNumber(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) {
        throw new Error("Value must be greater than zero");
    }
    return n;
}

function sortBatchesFIFO(batches) {
    return [...batches].sort((a, b) => {
        const dateA = String(a.purchaseDate ?? "");
        const dateB = String(b.purchaseDate ?? "");

        const dateCompare = dateA.localeCompare(dateB);
        if (dateCompare !== 0) {
            return dateCompare;
        }

        return String(a.batchId ?? "").localeCompare(
            String(b.batchId ?? "")
        );
    });
}

function makePayloadHash(payload) {
    return crypto
        .createHash("sha256")
        .update(JSON.stringify(payload))
        .digest("hex");
}

// GET all productions
router.get("/productions", async (req, res) => {
    try {
        const snapshot = await db
            .collection("productions")
            .orderBy("createdAt", "desc")
            .get();

        const productions = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
        }));

        return res.json({
            success: true,
            count: productions.length,
            productions
        });
    } catch (error) {
        console.error("❌ GET /productions error:", error);

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET one production
router.get("/productions/:id", async (req, res) => {
    try {
        const id = clean(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                error: "Production ID is required"
            });
        }

        const ref = db.collection("productions").doc(id);
        const snap = await ref.get();

        if (!snap.exists) {
            return res.status(404).json({
                success: false,
                error: "Production not found"
            });
        }

        return res.json({
            success: true,
            production: {
                id: snap.id,
                ...snap.data()
            }
        });
    } catch (error) {
        console.error("❌ GET /productions/:id error:", error);

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// CREATE production + atomic raw-material consumption
router.post("/productions", async (req, res) => {
    try {
        const sourceType =
            clean(req.body?.sourceType) || "customer_order";
        const orderId = clean(req.body?.orderId);
        const productId = clean(req.body?.productId);
        const recipeId = clean(req.body?.recipeId);
        const requestId = clean(req.body?.requestId);
        const productionDate =
            clean(req.body?.productionDate) ||
            new Date().toISOString();

        const quantity = positiveNumber(req.body?.quantity);

        if (!["customer_order", "self_production"].includes(sourceType)) {
            return res.status(400).json({
                success: false,
                error: "Invalid production sourceType"
            });
        }

        if (!productId || !recipeId || !requestId) {
            return res.status(400).json({
                success: false,
                error: "productId, recipeId and requestId are required"
            });
        }

        if (sourceType === "customer_order" && !orderId) {
            return res.status(400).json({
                success: false,
                error: "orderId is required for customer_order production"
            });
        }

        if (!Number.isInteger(quantity)) {
            return res.status(400).json({
                success: false,
                error: "Production quantity must be a whole number"
            });
        }

        const payload = {
            sourceType,
            orderId: sourceType === "customer_order" ? orderId : "",
            productId,
            recipeId,
            quantity,
            productionDate
        };

        const payloadHash = makePayloadHash(payload);

        const result = await db.runTransaction(async (transaction) => {
            const idempotencyRef = db
                .collection("productionIdempotency")
                .doc(requestId);

            const existingIdempotency =
                await transaction.get(idempotencyRef);

            if (existingIdempotency.exists) {
                const saved = existingIdempotency.data();

                if (saved.payloadHash !== payloadHash) {
                    const error = new Error(
                        "Duplicate requestId with different payload"
                    );
                    error.statusCode = 409;
                    throw error;
                }

                return {
                    duplicate: true,
                    productionId: saved.productionId
                };
            }

            const productRef =
                db.collection("selfProducts").doc(productId);

            let orderData = {};
            let productData = {};

            if (sourceType === "customer_order") {
                const orderRef =
                    db.collection("orders").doc(orderId);

                const [orderSnap, productSnap] =
                    await Promise.all([
                        transaction.get(orderRef),
                        transaction.get(productRef)
                    ]);

                if (!orderSnap.exists) {
                    const error = new Error("Order not found");
                    error.statusCode = 404;
                    throw error;
                }

                if (!productSnap.exists) {
                    const error = new Error(
                        "Self Product not found"
                    );
                    error.statusCode = 404;
                    throw error;
                }

                orderData = orderSnap.data();
                productData = productSnap.data();

                const orderProductId =
                    clean(orderData.productId);

                if (orderProductId && orderProductId !== productId) {
                    const error = new Error(
                        "Order product does not match production product"
                    );
                    error.statusCode = 409;
                    throw error;
                }

                if (!orderProductId) {
                    transaction.update(orderRef, {
                        productId,
                        updatedAt: new Date().toISOString()
                    });

                    orderData = {
                        ...orderData,
                        productId
                    };
                }

                const orderQuantity =
                    Number(orderData.quantity);

                if (
                    !Number.isInteger(orderQuantity) ||
                    orderQuantity < 1
                ) {
                    const error = new Error(
                        "Order quantity is invalid"
                    );
                    error.statusCode = 409;
                    throw error;
                }

                const existingProductionsQuery = db
                    .collection("productions")
                    .where("orderId", "==", orderId)
                    .where("status", "==", "completed");

                const existingProductionsSnap =
                    await transaction.get(
                        existingProductionsQuery
                    );

                const alreadyProducedQuantity =
                    existingProductionsSnap.docs.reduce(
                        (total, doc) =>
                            total +
                            Number(doc.data().quantity || 0),
                        0
                    );

                if (
                    !Number.isInteger(
                        alreadyProducedQuantity
                    ) ||
                    alreadyProducedQuantity < 0
                ) {
                    const error = new Error(
                        "Existing production quantity is invalid"
                    );
                    error.statusCode = 409;
                    throw error;
                }

                if (
                    alreadyProducedQuantity + quantity >
                    orderQuantity
                ) {
                    const error = new Error(
                        `Production quantity exceeds remaining order quantity. Remaining: ${orderQuantity - alreadyProducedQuantity}`
                    );
                    error.statusCode = 409;
                    throw error;
                }
            } else {
                const productSnap =
                    await transaction.get(productRef);

                if (!productSnap.exists) {
                    const error = new Error(
                        "Self Product not found"
                    );
                    error.statusCode = 404;
                    throw error;
                }

                productData = productSnap.data();
            }

            const recipeRef = db
                .collection("recipes")
                .doc(recipeId);

            const recipeSnap =
                await transaction.get(recipeRef);

            if (!recipeSnap.exists) {
                const error = new Error(
                    "Selected Recipe not found"
                );
                error.statusCode = 404;
                throw error;
            }

            const recipeDoc = recipeSnap;
            const recipeData = recipeDoc.data();

            if (clean(recipeData.productId) !== productId) {
                const error = new Error(
                    "Selected Recipe does not match production product"
                );
                error.statusCode = 409;
                throw error;
            }

            if (recipeData.active !== true) {
                const error = new Error(
                    "Selected Recipe is not active"
                );
                error.statusCode = 409;
                throw error;
            }
            const materials = Array.isArray(recipeData.materials)
                ? recipeData.materials
                : [];

            if (!materials.length) {
                const error = new Error(
                    "Recipe has no materials"
                );
                error.statusCode = 409;
                throw error;
            }

            const materialRefs = materials.map((material) =>
                db
                    .collection("rawMaterials")
                    .doc(clean(material.materialId))
            );

            const materialSnaps = [];

            for (const ref of materialRefs) {
                materialSnaps.push(
                    await transaction.get(ref)
                );
            }

            const materialBatchDocs = [];

            for (const material of materials) {
                const batchQuery = db
                    .collection("materialBatches")
                    .where(
                        "materialId",
                        "==",
                        clean(material.materialId)
                    );

                const batchSnapshot =
                    await transaction.get(batchQuery);

                const batches = batchSnapshot.docs
                    .map((doc) => ({
                        id: doc.id,
                        ...doc.data()
                    }));

                materialBatchDocs.push(
                    sortBatchesFIFO(batches)
                );
            }

            const materialsUsed = [];
            const stockChanges = [];
            const movementIds = [];

            const productionRef =
                db.collection("productions").doc();

            for (let i = 0; i < materials.length; i++) {
                const material = materials[i];
                const materialSnap = materialSnaps[i];

                if (!materialSnap.exists) {
                    const error = new Error(
                        `Raw Material not found: ${material.materialId}`
                    );
                    error.statusCode = 404;
                    throw error;
                }

                const materialData = materialSnap.data();

                const quantityPerUnit =
                    positiveNumber(material.quantityPerUnit);

                const recipeUnit =
                    normalizeUnit(material.unit || materialData.unit || "");

                const stockUnit =
                    normalizeUnit(materialData.unit || material.unit || "");

                const recipeFamily =
                    getUnitFamily(recipeUnit);

                const stockFamily =
                    getUnitFamily(stockUnit);

                if (!recipeFamily || !stockFamily) {
                    const error = new Error(
                        `Unsupported unit for Raw Material: ${materialData.materialName || material.materialId}`
                    );
                    error.statusCode = 400;
                    throw error;
                }

                if (!isCompatible(recipeUnit, stockUnit)) {
                    const error = new Error(
                        `Incompatible units for material ${material.materialId}: ${recipeUnit} → ${stockUnit}`
                    );
                    error.statusCode = 400;
                    throw error;
                }

                const requiredRecipeQuantity =
                    quantityPerUnit * quantity;

                const requiredStockQuantity =
                    convert(
                        requiredRecipeQuantity,
                        recipeUnit,
                        stockUnit,
                        recipeFamily
                    );

                const previousStock =
                    Number(materialData.stock || 0);

                if (previousStock < requiredStockQuantity) {
                    const error = new Error(
                        `Insufficient stock for Raw Material: ${materialData.materialName || material.materialId}`
                    );
                    error.statusCode = 409;
                    throw error;
                }

                const trackedBatches =
                    materialBatchDocs[i] || [];

                let batchAllocations = [];
                let unitCost =
                    Number(materialData.unitCost || 0);
                let totalValue =
                    requiredStockQuantity * unitCost;

                if (trackedBatches.length > 0) {
                    const fifoResult = allocateFIFO(
                        trackedBatches,
                        requiredStockQuantity
                    );

                    batchAllocations =
                        fifoResult.allocations.map(allocation => ({
                            batchId: allocation.batchId,
                            allocatedQuantity:
                                allocation.allocatedQuantity,
                            unit: normalizeUnit(
                                allocation.unit || stockUnit
                            ),
                            unitCost: allocation.unitCost,
                            allocationCost:
                                allocation.allocationCost
                        }));

                    totalValue = fifoResult.totalCost;

                    for (const allocation of fifoResult.allocations) {
                        const batchRef = db
                            .collection("materialBatches")
                            .doc(allocation.batchId);

                        const batchDoc =
                            trackedBatches.find(
                                batch =>
                                    batch.batchId ===
                                    allocation.batchId
                            );

                        if (!batchDoc) {
                            const error = new Error(
                                `FIFO Batch not found: ${allocation.batchId}`
                            );
                            error.statusCode = 409;
                            throw error;
                        }

                        const batchAvailable =
                            Number(batchDoc.availableQuantity);

                        const newBatchQuantity =
                            batchAvailable -
                            allocation.allocatedQuantity;

                        if (
                            !Number.isFinite(batchAvailable) ||
                            newBatchQuantity < 0
                        ) {
                            const error = new Error(
                                `Invalid Batch available quantity: ${allocation.batchId}`
                            );
                            error.statusCode = 409;
                            throw error;
                        }

                        transaction.update(batchRef, {
                            availableQuantity:
                                newBatchQuantity,
                            status:
                                newBatchQuantity === 0
                                    ? "depleted"
                                    : "available",
                            updatedAt:
                                new Date().toISOString()
                        });
                    }
                }

                const remainingStock =
                    previousStock - requiredStockQuantity;

                const movementRef =
                    db.collection("stockMovements").doc();

                const materialRef = materialRefs[i];

                transaction.update(materialRef, {
                    stock: remainingStock,
                    updatedAt: new Date().toISOString()
                });

                transaction.set(movementRef, {
                    itemType: "rawMaterial",
                    itemId: material.materialId,
                    itemName:
                        materialData.materialName ||
                        material.materialName ||
                        "",
                    movementType: "CONSUMPTION",
                    sourceType,
                    quantity: requiredStockQuantity,
                    previousStock,
                    remainingStock,
                    unit: stockUnit,
                    recipeQuantity: requiredRecipeQuantity,
                    recipeUnit: recipeUnit,
                    unitCost,
                    totalValue,
                    referenceId: productionRef.id,
                    ...(sourceType === "customer_order" ? { orderId } : {}),
                    createdAt: new Date().toISOString()
                });

                materialsUsed.push({
                    materialId: material.materialId,
                    materialName:
                        materialData.materialName ||
                        material.materialName ||
                        "",
                    quantityPerUnit,
                    quantity: requiredStockQuantity,
                    unit: stockUnit,
                    recipeQuantity: requiredRecipeQuantity,
                    recipeUnit,
                    unitCost,
                    totalValue,
                    batchAllocations
                });

                stockChanges.push({
                    materialId: material.materialId,
                    previousStock,
                    consumed: requiredStockQuantity,
                    remainingStock
                });

                movementIds.push(movementRef.id);
            }

            const currentFinishedStock =
                Number(productData.stock || 0);

            if (
                !Number.isFinite(currentFinishedStock) ||
                currentFinishedStock < 0
            ) {
                const error = new Error(
                    "Finished Product stock is invalid"
                );
                error.statusCode = 409;
                throw error;
            }

            const remainingFinishedStock =
                currentFinishedStock + quantity;

            const totalCost = materialsUsed.reduce(
                (total, material) =>
                    total + Number(material.totalValue || 0),
                0
            );

            const unitCost =
                quantity > 0 ? totalCost / quantity : 0;

            const finishedUnitCost = unitCost;
            const finishedTotalValue = totalCost;

            const finishedMovementRef =
                db.collection("stockMovements").doc();

            transaction.update(productRef, {
                stock: remainingFinishedStock,
                updatedAt: new Date().toISOString()
            });

            transaction.set(finishedMovementRef, {
                itemType: "selfProduct",
                itemId: productId,
                itemName:
                    productData.productName ||
                    orderData.productName ||
                    "",
                movementType: "PRODUCTION",
                quantity,
                unit: "ቁጥር",
                previousStock: currentFinishedStock,
                remainingStock: remainingFinishedStock,
                unitCost: finishedUnitCost,
                totalValue: finishedTotalValue,
                referenceId: productionRef.id,
                ...(sourceType === "customer_order" ? { orderId } : {}),
                createdAt: new Date().toISOString()
            });

            movementIds.push(finishedMovementRef.id);

            const now = new Date().toISOString();

            const expectedSellingPrice =
                Number(productData.sellPrice || 0);
              const expectedProfit = (expectedSellingPrice * quantity) - totalCost;

            const productionData = {
                productionId: productionRef.id,
                sourceType,
                ...(sourceType === "customer_order" ? { orderId } : {}),
                productId,
                productName:
                    productData.productName ||
                    orderData.productName ||
                    "",
                  ...(sourceType === "customer_order" ? {
                      customer: {
                          name: clean(orderData.customerName),
                          phone: clean(orderData.phone)
                      }
                  } : {}),
                quantity,
                recipeId: recipeDoc.id,
                recipeVersion:
                    Number(recipeData.recipeVersion || 1),
                materialsUsed,
                stockChanges,
                movementIds,
                productionDate,
                  totalCost,
                  unitCost,
                  expectedSellingPrice,
                  expectedProfit,

                status: "completed",
                createdAt: now,
                updatedAt: now
            };

            // Production must exist before movements reference it.
            transaction.set(
                productionRef,
                productionData
            );

            transaction.set(idempotencyRef, {
                requestId,
                payloadHash,
                productionId: productionRef.id,
                createdAt: now
            });

            return {
                duplicate: false,
                productionId: productionRef.id,
                production: productionData
            };
        });

        if (result.duplicate) {
            return res.status(200).json({
                success: true,
                duplicate: true,
                productionId: result.productionId
            });
        }

        return res.status(201).json({
            success: true,
            message: "Production completed successfully",
            productionId: result.productionId,
            production: result.production
        });
    } catch (error) {
        console.error("❌ POST /productions error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            error: error.message
        });
    }
});

// VOID production + atomic stock reversal
router.patch("/productions/:id/void", async (req, res) => {
    try {
        const productionId = clean(req.params.id);
        const voidReason = clean(req.body?.reason) || "Production voided";

        if (!productionId) {
            return res.status(400).json({
                success: false,
                error: "Production ID is required"
            });
        }

        const productionRef =
            db.collection("productions").doc(productionId);

        const result = await db.runTransaction(async (transaction) => {
            const productionSnap =
                await transaction.get(productionRef);

            if (!productionSnap.exists) {
                const error = new Error("Production not found");
                error.statusCode = 404;
                throw error;
            }

            const production = productionSnap.data();

            if (clean(production.status).toLowerCase() === "voided") {
                return {
                    alreadyVoided: true,
                    productionId
                };
            }

            if (clean(production.status).toLowerCase() !== "completed") {
                const error = new Error(
                    "Only completed production can be voided"
                );
                error.statusCode = 409;
                throw error;
            }

            const quantity = Number(production.quantity || 0);

            if (!Number.isInteger(quantity) || quantity <= 0) {
                const error = new Error(
                    "Production quantity is invalid"
                );
                error.statusCode = 409;
                throw error;
            }

            const materialsUsed =
                Array.isArray(production.materialsUsed)
                    ? production.materialsUsed
                    : [];

            const movementIds =
                Array.isArray(production.movementIds)
                    ? production.movementIds
                    : [];

            if (movementIds.length < 2) {
                const error = new Error(
                    "Production stock movement data is incomplete"
                );
                error.statusCode = 409;
                throw error;
            }

            const materialRefs = materialsUsed.map((material) =>
                db.collection("rawMaterials").doc(
                    clean(material.materialId)
                )
            );

            const movementRefs = movementIds.map((movementId) =>
                db.collection("stockMovements").doc(clean(movementId))
            );

            const productRef =
                db.collection("selfProducts").doc(
                    clean(production.productId)
                );

            const batchIds = [
                ...new Set(
                    materialsUsed.flatMap((material) =>
                        Array.isArray(material.batchAllocations)
                            ? material.batchAllocations
                                .map((allocation) => clean(allocation.batchId))
                                .filter(Boolean)
                            : []
                    )
                )
            ];

            const batchRefs = batchIds.map((batchId) =>
                db.collection("materialBatches").doc(batchId)
            );

            const reads = [
                transaction.get(productRef),
                ...materialRefs.map((ref) => transaction.get(ref)),
                ...movementRefs.map((ref) => transaction.get(ref)),
                ...batchRefs.map((ref) => transaction.get(ref))
            ];

            const snapshots = await Promise.all(reads);

            const productSnap = snapshots[0];

            const materialSnapshots =
                snapshots.slice(1, 1 + materialRefs.length);

            const movementStartIndex =
                1 + materialRefs.length;

            const movementSnapshots =
                snapshots.slice(
                    movementStartIndex,
                    movementStartIndex + movementRefs.length
                );

            const batchStartIndex =
                movementStartIndex + movementRefs.length;

            const batchSnapshots =
                snapshots.slice(batchStartIndex);

            for (let i = 0; i < movementSnapshots.length; i++) {
                const movementSnap = movementSnapshots[i];

                if (!movementSnap.exists) {
                    const error = new Error(
                        `Original stock movement not found: ${movementIds[i]}`
                    );
                    error.statusCode = 409;
                    throw error;
                }

                const movement = movementSnap.data();

                if (clean(movement.referenceId) !== productionId) {
                    const error = new Error(
                        `Stock movement is not linked to production: ${movementIds[i]}`
                    );
                    error.statusCode = 409;
                    throw error;
                }

                if (clean(movement.reversalOfProductionId)) {
                    const error = new Error(
                        `Stock movement is already a reversal movement: ${movementIds[i]}`
                    );
                    error.statusCode = 409;
                    throw error;
                }

                const expectedIsFinishedProduct =
                    i === movementSnapshots.length - 1;

                const expectedMovementType =
                    expectedIsFinishedProduct
                        ? "PRODUCTION"
                        : "CONSUMPTION";

                const expectedItemId =
                    expectedIsFinishedProduct
                        ? clean(production.productId)
                        : clean(materialsUsed[i]?.materialId);

                if (clean(movement.movementType) !== expectedMovementType) {
                    const error = new Error(
                        `Invalid original movement type: ${movementIds[i]}`
                    );
                    error.statusCode = 409;
                    throw error;
                }

                if (clean(movement.itemId) !== expectedItemId) {
                    const error = new Error(
                        `Original stock movement item mismatch: ${movementIds[i]}`
                    );
                    error.statusCode = 409;
                    throw error;
                }
            }

            if (!productSnap.exists) {
                const error = new Error(
                    "Finished Product not found"
                );
                error.statusCode = 404;
                throw error;
            }

            const productData = productSnap.data();

            const currentFinishedStock =
                Number(productData.stock || 0);

            if (
                !Number.isFinite(currentFinishedStock) ||
                currentFinishedStock < quantity
            ) {
                const error = new Error(
                    "Finished Product stock is insufficient for Void reversal"
                );
                error.statusCode = 409;
                throw error;
            }

            const reversalMovementIds = [];

            for (let i = 0; i < materialsUsed.length; i++) {
                const material = materialsUsed[i];
                const materialSnap = materialSnapshots[i];

                if (!clean(material.materialId)) {
                    const error = new Error(
                        "Production contains invalid material ID"
                    );
                    error.statusCode = 409;
                    throw error;
                }

                if (!materialSnap.exists) {
                    const error = new Error(
                        `Raw Material not found: ${material.materialId}`
                    );
                    error.statusCode = 404;
                    throw error;
                }

                const materialData = materialSnap.data();
                const currentStock =
                    Number(materialData.stock || 0);

                const reversalQuantity =
                    Number(material.quantity || 0);

                if (
                    !Number.isFinite(currentStock) ||
                    currentStock < 0
                ) {
                    const error = new Error(
                        `Raw Material stock is invalid: ${material.materialId}`
                    );
                    error.statusCode = 409;
                    throw error;
                }

                if (
                    !Number.isFinite(reversalQuantity) ||
                    reversalQuantity <= 0
                ) {
                    const error = new Error(
                        `Invalid reversal quantity for material: ${material.materialId}`
                    );
                    error.statusCode = 409;
                    throw error;
                }

                const batchAllocations =
                    Array.isArray(material.batchAllocations)
                        ? material.batchAllocations
                        : [];

                for (const allocation of batchAllocations) {
                    const batchId = clean(allocation.batchId);
                    const allocatedQuantity =
                        Number(allocation.allocatedQuantity);

                    if (!batchId) {
                        const error = new Error(
                            `Invalid FIFO batch ID for material: ${material.materialId}`
                        );
                        error.statusCode = 409;
                        throw error;
                    }

                    if (
                        !Number.isFinite(allocatedQuantity) ||
                        allocatedQuantity <= 0
                    ) {
                        const error = new Error(
                            `Invalid FIFO allocation quantity for batch: ${batchId}`
                        );
                        error.statusCode = 409;
                        throw error;
                    }

                    const batchIndex =
                        batchIds.indexOf(batchId);

                    if (batchIndex === -1) {
                        const error = new Error(
                            `FIFO batch is not loaded: ${batchId}`
                        );
                        error.statusCode = 409;
                        throw error;
                    }

                    const batchSnap =
                        batchSnapshots[batchIndex];

                    if (!batchSnap.exists) {
                        const error = new Error(
                            `FIFO batch not found: ${batchId}`
                        );
                        error.statusCode = 409;
                        throw error;
                    }

                    const batchData = batchSnap.data();

                    if (
                        clean(batchData.batchId) !== batchId ||
                        clean(batchData.materialId) !== clean(material.materialId)
                    ) {
                        const error = new Error(
                            `FIFO batch/material mismatch: ${batchId}`
                        );
                        error.statusCode = 409;
                        throw error;
                    }

                    const availableQuantity =
                        Number(batchData.availableQuantity);

                    if (
                        !Number.isFinite(availableQuantity) ||
                        availableQuantity < 0
                    ) {
                        const error = new Error(
                            `FIFO batch available quantity is invalid: ${batchId}`
                        );
                        error.statusCode = 409;
                        throw error;
                    }
                }

                const newStock =
                    currentStock + reversalQuantity;

                const movementRef =
                    db.collection("stockMovements").doc();

                for (const allocation of batchAllocations) {
                    const batchId = clean(allocation.batchId);
                    const allocatedQuantity =
                        Number(allocation.allocatedQuantity);

                    const batchIndex =
                        batchIds.indexOf(batchId);

                    const batchData =
                        batchSnapshots[batchIndex].data();

                    const currentAvailable =
                        Number(batchData.availableQuantity);

                    const restoredAvailable =
                        currentAvailable + allocatedQuantity;

                    const batchRef =
                        batchRefs[batchIndex];

                    transaction.update(batchRef, {
                        availableQuantity: restoredAvailable,
                        status: "available",
                        updatedAt: new Date().toISOString()
                    });
                }

                transaction.update(materialRefs[i], {
                    stock: newStock,
                    updatedAt: new Date().toISOString()
                });

                transaction.set(movementRef, {
                    itemType: "rawMaterial",
                    itemId: material.materialId,
                    itemName:
                        material.materialName || "",
                    movementType: "VOID_REVERSAL_IN",
                    sourceType: production.sourceType || "",
                    ...(production.sourceType === "customer_order" && clean(production.orderId)
                        ? { orderId: clean(production.orderId) }
                        : {}),
                    quantity: reversalQuantity,
                    previousStock: currentStock,
                    remainingStock: newStock,
                    unit:
                        normalizeUnit(materialData.unit || material.unit || ""),
                    unitCost:
                        Number(material.unitCost || 0),
                    totalValue:
                        Number(material.totalValue || 0),
                    ...(batchAllocations.length > 0
                        ? {
                            batchAllocations: batchAllocations.map(
                                (allocation) => ({
                                    batchId: clean(allocation.batchId),
                                    allocatedQuantity:
                                        Number(allocation.allocatedQuantity),
                                    unit: normalizeUnit(
                                        allocation.unit ||
                                        materialData.unit ||
                                        material.unit ||
                                        ""
                                    ),
                                    unitCost:
                                        Number(allocation.unitCost || 0),
                                    allocationCost:
                                        Number(allocation.allocationCost || 0)
                                })
                            )
                        }
                        : {}),
                    referenceId: productionId,
                    reversalOfProductionId: productionId,
                    createdAt: new Date().toISOString()
                });

                reversalMovementIds.push(movementRef.id);
            }

            const finishedNewStock =
                currentFinishedStock - quantity;

            const finishedMovementRef =
                db.collection("stockMovements").doc();

            transaction.update(productRef, {
                stock: finishedNewStock,
                updatedAt: new Date().toISOString()
            });

            transaction.set(finishedMovementRef, {
                itemType: "selfProduct",
                itemId: clean(production.productId),
                itemName:
                    productData.productName ||
                    production.productName ||
                    "",
                movementType: "VOID_REVERSAL_OUT",
                sourceType: production.sourceType || "",
                ...(production.sourceType === "customer_order" && clean(production.orderId)
                    ? { orderId: clean(production.orderId) }
                    : {}),
                quantity,
                unit: "ቁጥር",
                previousStock: currentFinishedStock,
                remainingStock: finishedNewStock,
                unitCost:
                    Number(production.unitCost || 0),
                totalValue:
                    Number(production.totalCost || 0),
                referenceId: productionId,
                reversalOfProductionId: productionId,
                createdAt: new Date().toISOString()
            });

            reversalMovementIds.push(finishedMovementRef.id);

            const now = new Date().toISOString();

            transaction.update(productionRef, {
                status: "voided",
                voidedAt: now,
                voidReason,
                reversalMovementIds,
                updatedAt: now
            });

            return {
                alreadyVoided: false,
                productionId,
                reversalMovementIds
            };
        });

        if (result.alreadyVoided) {
            return res.status(200).json({
                success: true,
                alreadyVoided: true,
                message: "Production is already voided",
                productionId: result.productionId
            });
        }

        return res.status(200).json({
            success: true,
            message: "Production voided and stock reversed successfully",
            productionId: result.productionId,
            reversalMovementIds: result.reversalMovementIds
        });
    } catch (error) {
        console.error("❌ PATCH /productions/:id/void error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
