const express = require("express");

const router = express.Router();

const { db } = require("./firebase");

const {
    restoreFromUniversalTrash,
    permanentlyDeleteFromUniversalTrash
} = require("./trash-helper");


function clean(value) {
    return String(value ?? "").trim();
}


/* =========================================================
   GET UNIVERSAL TRASH
   ========================================================= */

router.get("/universal-trash", async (req, res) => {
    try {
        const snapshot = await db
            .collection("universalTrash")
            .orderBy("deletedAt", "desc")
            .get();

        const items = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({
            success: true,
            count: items.length,
            items
        });

    } catch (error) {

        console.error(
            "Universal Trash GET Error:",
            error
        );

        res.status(500).json({
            success: false,
            error:
                error.message ||
                "Universal Trash መጫን አልተቻለም።"
        });
    }
});


/* =========================================================
   RESTORE UNIVERSAL TRASH ITEM
   ========================================================= */

router.post(
    "/universal-trash/:id/restore",
    async (req, res) => {

        try {

            const id = clean(req.params.id);

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: "Trash ID ያስፈልጋል።"
                });
            }


            const result =
                await restoreFromUniversalTrash(id);


            res.json({
                success: true,
                restored: true,
                ...result,

                message:
                    "♻️ መረጃው በትክክል Restore ተደርጓል።"
            });


        } catch (error) {

            console.error(
                "Universal Trash Restore Error:",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    error.message ||
                    "Restore ማድረግ አልተቻለም።"
            });
        }
    }
);


/* =========================================================
   PERMANENT DELETE
   ========================================================= */

router.delete(
    "/universal-trash/:id/permanent",
    async (req, res) => {

        try {

            const id = clean(req.params.id);

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: "Trash ID ያስፈልጋል።"
                });
            }


            const result =
                await permanentlyDeleteFromUniversalTrash(id);


            res.json({
                success: true,
                ...result,

                message:
                    "🗑️ መረጃው በቋሚነት ተሰርዟል።"
            });


        } catch (error) {

            console.error(
                "Universal Trash Permanent Delete Error:",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    error.message ||
                    "በቋሚነት መሰረዝ አልተቻለም።"
            });
        }
    }
);


/* =========================================================
   DELETE ALL UNIVERSAL TRASH
   ========================================================= */

router.delete(
    "/universal-trash",
    async (req, res) => {

        try {

            const snapshot = await db
                .collection("universalTrash")
                .get();

            if (snapshot.empty) {
                return res.json({
                    success: true,
                    deletedCount: 0,
                    message:
                        "Universal Trash ባዶ ነው።"
                });
            }


            const batch = db.batch();

            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();


            res.json({
                success: true,
                deletedCount: snapshot.size,
                message:
                    "🗑️ Universal Trash ሙሉ በሙሉ ተጠርጓል።"
            });


        } catch (error) {

            console.error(
                "Universal Trash Clear Error:",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    error.message ||
                    "Universal Trash መጥረግ አልተቻለም።"
            });
        }
    }
);


/* =========================================================
   CALCULATOR HISTORY → UNIVERSAL TRASH BRIDGE
   Calculator History lives in browser localStorage,
   therefore it uses a dedicated Trash bridge.
   ========================================================= */

/* MOVE CALCULATOR HISTORY ITEM TO UNIVERSAL TRASH */
router.post(
    "/universal-trash/calculator-history",
    async (req, res) => {
        try {
            const item = req.body?.item;

            if (!item || typeof item !== "object") {
                return res.status(400).json({
                    success: false,
                    error: "የCalculator History መረጃ ያስፈልጋል።"
                });
            }

            const originalId = clean(item.id);

            if (!originalId) {
                return res.status(400).json({
                    success: false,
                    error: "የCalculator History ID ያስፈልጋል።"
                });
            }

            const trashRef = db
                .collection("universalTrash")
                .doc();

            const now = new Date().toISOString();

            const trashData = {
                calculatorHistoryItem: item,

                originalId,
                sourceCollection: "localStorage",
                trashType: "calculator-history",
                displayName:
                    clean(
                        item.title ||
                        item.expression ||
                        "Calculator History"
                    ),
                deletedAt: now,
                trashStatus: "deleted"
            };

            await trashRef.set(trashData);

            res.json({
                success: true,
                trashId: trashRef.id,
                message:
                    "🗑️ Calculator History ወደ Universal Trash ተወስዷል።"
            });

        } catch (error) {
            console.error(
                "Calculator History Trash Error:",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    error.message ||
                    "Calculator History ወደ Trash መውሰድ አልተቻለም።"
            });
        }
    }
);

/* RESTORE CALCULATOR HISTORY FROM UNIVERSAL TRASH */
router.post(
    "/universal-trash/calculator-history/:id/restore",
    async (req, res) => {
        try {
            const id = clean(req.params.id);

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: "Trash ID ያስፈልጋል።"
                });
            }

            const trashRef = db
                .collection("universalTrash")
                .doc(id);

            const trashSnap = await trashRef.get();

            if (!trashSnap.exists) {
                return res.status(404).json({
                    success: false,
                    error:
                        "የCalculator History Trash መረጃ አልተገኘም።"
                });
            }

            const trashData = trashSnap.data() || {};

            if (
                trashData.trashType !==
                "calculator-history"
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "ይህ መረጃ Calculator History አይደለም።"
                });
            }

            const item =
                trashData.calculatorHistoryItem;

            if (
                !item ||
                typeof item !== "object"
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "የCalculator History መረጃው ሙሉ አይደለም።"
                });
            }

            await trashRef.delete();

            res.json({
                success: true,
                restored: true,
                calculatorHistoryItem: item,
                message:
                    "♻️ Calculator History ተመልሷል።"
            });

        } catch (error) {
            console.error(
                "Calculator History Restore Error:",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    error.message ||
                    "Calculator History Restore ማድረግ አልተቻለም።"
            });
        }
    }
);

module.exports = router;
