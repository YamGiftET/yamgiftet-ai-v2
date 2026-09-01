const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { db } = require("./firebase");
const { moveToUniversalTrash } = require("./trash-helper");

const router = express.Router();

const uploadDir = path.join(__dirname, "uploads", "notes");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || "").toLowerCase();
        cb(null, "note-" + Date.now() + "-" +
            Math.random().toString(36).slice(2, 8) + ext);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file?.mimetype?.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("የምስል ፋይል ብቻ ይፈቀዳል።"));
        }
    }
});

function clean(value) {
    return String(value ?? "").trim();
}

function nowISO() {
    return new Date().toISOString();
}

/* GET ALL NOTES */
router.get("/notes", async (req, res) => {
    try {
        const snapshot = await db.collection("notes")
            .orderBy("createdAt", "desc")
            .get();

        const notes = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({ success: true, notes });
    } catch (error) {
        console.error("Notes GET Error:", error);
        res.status(500).json({
            success: false,
            error: "Notes ማምጣት አልተቻለም።"
        });
    }
});

/* GET ONE NOTE */
router.get("/notes/:id", async (req, res) => {
    try {
        const id = clean(req.params.id);
        const snap = await db.collection("notes").doc(id).get();

        if (!snap.exists) {
            return res.status(404).json({
                success: false,
                error: "Note አልተገኘም።"
            });
        }

        res.json({
            success: true,
            note: { id: snap.id, ...snap.data() }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Note ማምጣት አልተቻለም።"
        });
    }
});

/* CREATE NOTE */
router.post("/notes", upload.single("photo"), async (req, res) => {
    try {
        const body = req.body || {};
        const title = clean(body.title);
        const content = clean(body.content);
        const category = clean(body.category) || "ሌላ";

        if (!title && !content) {
            return res.status(400).json({
                success: false,
                error: "ርዕስ ወይም ማስታወሻ ያስገቡ።"
            });
        }

        const now = nowISO();

        const note = {
            title,
            content,
            category,
            photoUrl: req.file
                ? "/uploads/notes/" + req.file.filename
                : "",
            createdAt: now,
            updatedAt: now
        };

        const ref = await db.collection("notes").add(note);

        res.status(201).json({
            success: true,
            message: "ማስታወሻው ተመዝግቧል።",
            note: { id: ref.id, ...note }
        });
    } catch (error) {
        console.error("Notes CREATE Error:", error);
        res.status(500).json({
            success: false,
            error: "ማስታወሻውን ማስቀመጥ አልተቻለም።"
        });
    }
});

/* UPDATE NOTE */
router.patch("/notes/:id", upload.single("photo"), async (req, res) => {
    try {
        const id = clean(req.params.id);
        const ref = db.collection("notes").doc(id);
        const snap = await ref.get();

        if (!snap.exists) {
            return res.status(404).json({
                success: false,
                error: "Note አልተገኘም።"
            });
        }

        const body = req.body || {};
        const update = {
            title: clean(body.title),
            content: clean(body.content),
            category: clean(body.category) || "ሌላ",
            updatedAt: nowISO()
        };

        if (req.file) {
            update.photoUrl = "/uploads/notes/" + req.file.filename;
        }

        await ref.update(update);

        res.json({
            success: true,
            message: "ማስታወሻው ተስተካክሏል።",
            note: { id, ...snap.data(), ...update }
        });
    } catch (error) {
        console.error("Notes UPDATE Error:", error);
        res.status(500).json({
            success: false,
            error: "ማስታወሻውን ማስተካከል አልተቻለም።"
        });
    }
});

/* DELETE → UNIVERSAL TRASH */
router.delete("/notes/:id", async (req, res) => {
    try {
        const id = clean(req.params.id);
        const ref = db.collection("notes").doc(id);
        const snap = await ref.get();

        if (!snap.exists) {
            return res.status(404).json({
                success: false,
                error: "Note አልተገኘም።"
            });
        }

        const data = snap.data() || {};

        const result = await moveToUniversalTrash({
            collection: "notes",
            id,
            data,
            type: "note",
            displayName: data.title || "Note"
        });

        res.json({
            success: true,
            message: "ማስታወሻው ወደ Trash ተወስዷል።",
            trashId: result.trashId
        });
    } catch (error) {
        console.error("Notes DELETE Error:", error);
        res.status(500).json({
            success: false,
            error: "ማስታወሻውን መሰረዝ አልተቻለም።"
        });
    }
});

module.exports = router;
