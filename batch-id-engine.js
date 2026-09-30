"use strict";

function clean(value) {
    return String(value ?? "").trim();
}

function formatDatePart(value) {
    const raw = clean(value);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        throw new Error("Batch date ትክክለኛ YYYY-MM-DD መሆን አለበት።");
    }

    return raw.replace(/-/g, "");
}

async function generateBatchId(transaction, date) {
    if (!transaction || typeof transaction.get !== "function" || typeof transaction.set !== "function") {
        throw new Error("Batch ID generator transaction ያስፈልገዋል።");
    }

    const datePart = formatDatePart(date);
    const { db } = require("./firebase");

    const counterRef = db.collection("counters").doc("materialBatch");

    const counterSnap = await transaction.get(counterRef);

    const currentSerial = counterSnap.exists
        ? Number(counterSnap.data()?.nextSerial || 1)
        : 1;

    if (!Number.isInteger(currentSerial) || currentSerial <= 0) {
        throw new Error("Batch counter ልክ ያልሆነ ሁኔታ ላይ ነው።");
    }

    const serial = String(currentSerial).padStart(6, "0");
    const batchId = `BATCH-${datePart}-${serial}`;

    transaction.set(
        counterRef,
        {
            nextSerial: currentSerial + 1,
            updatedAt: new Date().toISOString()
        },
        { merge: true }
    );

    return batchId;
}

module.exports = {
    generateBatchId
};
