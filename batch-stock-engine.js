"use strict";

function positive(value, field) {
    const n = Number(value);

    if (!Number.isFinite(n) || n <= 0) {
        throw new Error(`${field} ከ 0 በላይ መሆን አለበት።`);
    }

    return n;
}

function buildBatchStock({
    batchId,
    purchaseId,
    materialId,
    materialName,
    unit,
    quantity,
    unitCost,
    totalCost,
    purchaseDate,
    areaSnapshot = null,
    now
}) {
    const clean = value => String(value ?? "").trim();

    const normalizedBatchId = clean(batchId);
    const normalizedPurchaseId = clean(purchaseId);
    const normalizedMaterialId = clean(materialId);
    const normalizedUnit = clean(unit);
    const normalizedPurchaseDate = clean(purchaseDate);

    if (!normalizedBatchId) {
        throw new Error("Batch ID ያስፈልጋል።");
    }

    if (!normalizedPurchaseId) {
        throw new Error("Purchase ID ያስፈልጋል።");
    }

    if (!normalizedMaterialId) {
        throw new Error("Material ID ያስፈልጋል።");
    }

    if (!normalizedUnit) {
        throw new Error("Batch Unit ያስፈልጋል።");
    }

    const originalQuantity = positive(
        quantity,
        "Batch quantity"
    );

    const normalizedUnitCost = positive(
        unitCost,
        "Batch unitCost"
    );

    const normalizedTotalCost = positive(
        totalCost,
        "Batch totalCost"
    );

    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedPurchaseDate)) {
        throw new Error(
            "Batch purchaseDate ትክክለኛ YYYY-MM-DD መሆን አለበት።"
        );
    }

    const timestamp = clean(now) || new Date().toISOString();

    return {
        batchId: normalizedBatchId,
        purchaseId: normalizedPurchaseId,
        materialId: normalizedMaterialId,
        materialName: clean(materialName),
        unit: normalizedUnit,
        originalQuantity,
        availableQuantity: originalQuantity,
        unitCost: normalizedUnitCost,
        totalCost: normalizedTotalCost,
        purchaseDate: normalizedPurchaseDate,
        status: "available",
        ...(areaSnapshot ? { areaSnapshot } : {}),
        createdAt: timestamp,
        updatedAt: timestamp
    };
}

function consumeBatch(batch, quantity, now) {
    if (!batch || typeof batch !== "object") {
        throw new Error("Batch መረጃ ያስፈልጋል።");
    }

    const consumeQuantity = positive(
        quantity,
        "Batch consumption quantity"
    );

    const availableQuantity = Number(batch.availableQuantity);

    if (!Number.isFinite(availableQuantity) || availableQuantity < 0) {
        throw new Error(
            "Batch availableQuantity 0 ወይም ከ 0 በላይ መሆን አለበት።"
        );
    }

    if (consumeQuantity > availableQuantity) {
        const error = new Error(
            "ከ Batch ያለውን Available Quantity በላይ መጠቀም አይቻልም።"
        );
        error.statusCode = 409;
        throw error;
    }

    const remainingQuantity =
        availableQuantity - consumeQuantity;

    return {
        availableQuantity: remainingQuantity,
        status:
            remainingQuantity === 0
                ? "depleted"
                : "available",
        updatedAt:
            String(now ?? "").trim() ||
            new Date().toISOString()
    };
}

module.exports = {
    buildBatchStock,
    consumeBatch
};
