const { db } = require("./firebase");

function clean(value) {
    return String(value ?? "").trim();
}

async function moveToUniversalTrash({
    collection,
    id,
    data,
    type,
    displayName = "",
    extra = {}
}) {
    const trashRef = db.collection("universalTrash").doc();

    const now = new Date().toISOString();

    const trashData = {
        ...data,

        originalId: id,
        sourceCollection: collection,
        trashType: type,
        displayName: clean(displayName),

        deletedAt: now,
        trashStatus: "deleted",

        ...extra
    };

    await db.runTransaction(async transaction => {
        transaction.set(trashRef, trashData);

        transaction.delete(
            db.collection(collection).doc(id)
        );
    });

    return {
        trashId: trashRef.id,
        ...trashData
    };
}

async function restoreFromUniversalTrash(trashId) {
    const id = clean(trashId);

    if (!id) {
        throw new Error("Trash ID ያስፈልጋል።");
    }

    const trashRef = db
        .collection("universalTrash")
        .doc(id);

    const trashSnap = await trashRef.get();

    if (!trashSnap.exists) {
        throw new Error("በUniversal Trash ውስጥ አልተገኘም።");
    }

    const trashData = trashSnap.data() || {};

    const collection = clean(
        trashData.sourceCollection
    );

    const originalId = clean(
        trashData.originalId
    );

    if (!collection || !originalId) {
        throw new Error(
            "የTrash መረጃው ሙሉ አይደለም።"
        );
    }

    const restoredData = {
        ...trashData
    };

    delete restoredData.originalId;
    delete restoredData.sourceCollection;
    delete restoredData.trashType;
    delete restoredData.displayName;
    delete restoredData.deletedAt;
    delete restoredData.trashStatus;

    restoredData.restoredAt =
        new Date().toISOString();

    restoredData.restoredFromTrash = true;

    const originalRef = db
        .collection(collection)
        .doc(originalId);

    await db.runTransaction(async transaction => {
        const existing = await transaction.get(
            originalRef
        );

        if (existing.exists) {
            throw new Error(
                "ዋናው መረጃ አስቀድሞ አለ። Restore ማድረግ አይቻልም።"
            );
        }

        transaction.set(
            originalRef,
            restoredData
        );

        transaction.delete(trashRef);
    });

    return {
        success: true,
        id: originalId,
        collection,
        type: trashData.trashType || ""
    };
}

async function permanentlyDeleteFromUniversalTrash(
    trashId
) {
    const id = clean(trashId);

    if (!id) {
        throw new Error("Trash ID ያስፈልጋል።");
    }

    const trashRef = db
        .collection("universalTrash")
        .doc(id);

    const trashSnap = await trashRef.get();

    if (!trashSnap.exists) {
        throw new Error(
            "በUniversal Trash ውስጥ አልተገኘም።"
        );
    }

    await trashRef.delete();

    return {
        success: true,
        permanentlyDeleted: true,
        id
    };
}

module.exports = {
    moveToUniversalTrash,
    restoreFromUniversalTrash,
    permanentlyDeleteFromUniversalTrash
};
