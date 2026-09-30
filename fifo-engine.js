"use strict";

function positive(value, field) {
    const n = Number(value);

    if (!Number.isFinite(n) || n <= 0) {
        throw new Error(`${field} ከ 0 በላይ መሆን አለበት።`);
    }

    return n;
}

function allocateFIFO(batches, requiredQuantity) {
    if (!Array.isArray(batches)) {
        throw new Error("FIFO batches array መሆን አለበት።");
    }

    const required = positive(requiredQuantity, "Required quantity");

    let remaining = required;
    let totalCost = 0;

    const allocations = [];

    for (const batch of batches) {
        if (remaining <= 0) break;

        const availableQuantity = Number(batch.availableQuantity);

        if (!Number.isFinite(availableQuantity) || availableQuantity < 0) {
            throw new Error(
                "Batch availableQuantity ልክ ያለው ቁጥር መሆን አለበት።"
            );
        }

        if (availableQuantity === 0) {
            continue;
        }

        const unitCost = positive(
            batch.unitCost,
            "Batch unitCost"
        );

        const allocatedQuantity = Math.min(
            availableQuantity,
            remaining
        );

        const allocationCost = allocatedQuantity * unitCost;

        allocations.push({
            batchId: String(batch.batchId || "").trim(),
            allocatedQuantity,
            unit: batch.unit || "",
            unitCost,
            allocationCost
        });

        totalCost += allocationCost;
        remaining -= allocatedQuantity;
    }

    if (remaining > 0) {
        const error = new Error("FIFO allocation ለማጠናቀቅ በቂ Batch Stock የለም።");
        error.statusCode = 409;
        throw error;
    }

    return {
        requiredQuantity: required,
        allocatedQuantity: required,
        totalCost,
        allocations
    };
}

module.exports = {
    allocateFIFO
};
