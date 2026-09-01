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


module.exports = router;
