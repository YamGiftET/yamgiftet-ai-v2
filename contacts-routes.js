const express = require("express");
const { db } = require("./firebase");
const { moveToUniversalTrash } = require("./trash-helper");

const router = express.Router();

function clean(value) {
    return String(value ?? "").trim();
}

/* =====================================
   FIND / CREATE CONTACT
   ===================================== */
async function ensureContact(name, phone) {
    const customerName = clean(name);
    const customerPhone = clean(phone);

    if (!customerPhone) return null;

    const existingSnap = await db
        .collection("contacts")
        .where("phone", "==", customerPhone)
        .limit(1)
        .get();

    const now = new Date().toISOString();

    if (!existingSnap.empty) {
        const doc = existingSnap.docs[0];
        const data = doc.data() || {};

        const update = {
            updatedAt: now,
            lastSeenAt: now
        };

        if (customerName && !data.name) {
            update.name = customerName;
        }

        await doc.ref.update(update);

        return {
            id: doc.id,
            ...data,
            ...update
        };
    }

    const contact = {
        name: customerName || "ያልተጠቀሰ",
        phone: customerPhone,
        createdAt: now,
        updatedAt: now,
        lastSeenAt: now,
        source: "automatic"
    };

    const ref = await db
        .collection("contacts")
        .add(contact);

    return {
        id: ref.id,
        ...contact
    };
}

/* =====================================
   GET CONTACTS
   ===================================== */
router.get("/contacts", async (req, res) => {
    try {
        const snapshot = await db
            .collection("contacts")
            .orderBy("updatedAt", "desc")
            .get();

        const contacts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({
            success: true,
            count: contacts.length,
            contacts
        });
    } catch (error) {
        console.error("Contacts GET Error:", error);

        res.status(500).json({
            success: false,
            error: error.message || "Contacts ማምጣት አልተቻለም።"
        });
    }
});

/* =====================================
   GET ONE CONTACT
   ===================================== */
router.get("/contacts/:id", async (req, res) => {
    try {
        const id = clean(req.params.id);
        if (!id) return res.status(400).json({success:false,error:"Contact ID ያስፈልጋል።"});
        const snap = await db.collection("contacts").doc(id).get();
        if (!snap.exists) return res.status(404).json({success:false,error:"Contact አልተገኘም።"});
        res.json({success:true,contact:{id:snap.id,...snap.data()}});
    } catch (error) {
        console.error("Contact GET ONE Error:", error);
        res.status(500).json({success:false,error:error.message||"Contact ማምጣት አልተቻለም።"});
    }
});

/* =====================================
   CREATE CONTACT
   ===================================== */
router.post("/contacts", async (req, res) => {
    try {
        const name = clean(req.body?.name);
        const phone = clean(req.body?.phone);

        if (!phone) {
            return res.status(400).json({
                success: false,
                error: "ስልክ ቁጥር ያስፈልጋል።"
            });
        }

        const contact = await ensureContact(name, phone);

        res.status(201).json({
            success: true,
            contact
        });
    } catch (error) {
        console.error("Contacts CREATE Error:", error);

        res.status(500).json({
            success: false,
            error: error.message || "Contact ማስቀመጥ አልተቻለም።"
        });
    }
});

/* =====================================
   UPDATE CONTACT
   ===================================== */
router.patch("/contacts/:id", async (req, res) => {
    try {
        const id = clean(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                error: "Contact ID ያስፈልጋል።"
            });
        }

        const ref = db.collection("contacts").doc(id);
        const snap = await ref.get();

        if (!snap.exists) {
            return res.status(404).json({
                success: false,
                error: "Contact አልተገኘም።"
            });
        }

        const name = clean(req.body?.name);
        const phone = clean(req.body?.phone);

        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                error: "ስም እና ስልክ ያስፈልጋሉ።"
            });
        }

        const duplicate = await db
            .collection("contacts")
            .where("phone", "==", phone)
            .limit(2)
            .get();

        const duplicateOther = duplicate.docs.some(
            doc => doc.id !== id
        );

        if (duplicateOther) {
            return res.status(409).json({
                success: false,
                error: "ይህ ስልክ ቁጥር አስቀድሞ Contact ውስጥ አለ።"
            });
        }

        const update = {
            name,
            phone,
            updatedAt: new Date().toISOString()
        };

        await ref.update(update);

        res.json({
            success: true,
            contact: {
                id,
                ...snap.data(),
                ...update
            }
        });
    } catch (error) {
        console.error("Contacts UPDATE Error:", error);

        res.status(500).json({
            success: false,
            error: error.message || "Contact ማስተካከል አልተቻለም።"
        });
    }
});

/* =====================================
   DELETE → UNIVERSAL TRASH
   ===================================== */
router.delete("/contacts/:id", async (req, res) => {
    try {
        const id = clean(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                error: "Contact ID ያስፈልጋል።"
            });
        }

        const ref = db.collection("contacts").doc(id);
        const snap = await ref.get();

        if (!snap.exists) {
            return res.status(404).json({
                success: false,
                error: "Contact አልተገኘም።"
            });
        }

        const data = snap.data() || {};

        const result = await moveToUniversalTrash({
            collection: "contacts",
            id,
            data,
            type: "contact",
            displayName: data.name || data.phone || "Contact",
            extra: {
                deletedFrom: "contacts"
            }
        });

        res.json({
            success: true,
            trashed: true,
            trashId: result.trashId,
            message: "🗑️ Contact ወደ Universal Trash ተወስዷል።"
        });
    } catch (error) {
        console.error("Contacts DELETE Error:", error);

        res.status(500).json({
            success: false,
            error: error.message || "Contact ወደ Trash መውሰድ አልተቻለም።"
        });
    }
});


/* =====================================
   CONTACT PHOTO UPLOAD
   ===================================== */

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const contactUploadDir = path.join(__dirname, "uploads", "contacts");

if (!fs.existsSync(contactUploadDir)) {
    fs.mkdirSync(contactUploadDir, { recursive: true });
}

const contactStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, contactUploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || "").toLowerCase();
        cb(
            null,
            "contact-" +
            Date.now() +
            "-" +
            Math.random().toString(36).slice(2, 8) +
            ext
        );
    }
});

const contactUpload = multer({
    storage: contactStorage,
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
            cb(new Error("የምስል ፋይል ብቻ ይፈቀዳል።"));
        }
    }
});

router.post(
    "/contacts/:id/photo",
    contactUpload.single("photo"),
    async (req, res) => {
        try {
            const id = clean(req.params.id);

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: "Contact ID ያስፈልጋል።"
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: "የContact ፎቶ ያስገቡ።"
                });
            }

            const ref = db.collection("contacts").doc(id);
            const snap = await ref.get();

            if (!snap.exists) {
                return res.status(404).json({
                    success: false,
                    error: "Contact አልተገኘም።"
                });
            }

            const photoUrl =
                "/uploads/contacts/" + req.file.filename;

            await ref.update({
                photoUrl,
                updatedAt: new Date().toISOString()
            });

            res.json({
                success: true,
                photoUrl,
                message: "📸 Contact ፎቶ ተቀምጧል።"
            });

        } catch (error) {
            console.error("Contact Photo Upload Error:", error);

            if (req.file?.path) {
                try {
                    fs.unlinkSync(req.file.path);
                } catch (_) {}
            }

            res.status(500).json({
                success: false,
                error:
                    error.message ||
                    "የContact ፎቶ ማስቀመጥ አልተቻለም።"
            });
        }
    }
);


/* =====================================
   CONTACT CALL RECORDINGS
   ===================================== */
const contactRecordingDir = path.join(__dirname, "uploads", "contacts", "recordings");

if (!fs.existsSync(contactRecordingDir)) {
    fs.mkdirSync(contactRecordingDir, { recursive: true });
}

const recordingStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, contactRecordingDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || "").toLowerCase();
        cb(null, "recording-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ext);
    }
});

const recordingUpload = multer({
    storage: recordingStorage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file && file.mimetype && file.mimetype.startsWith("audio/")) {
            cb(null, true);
        } else {
            cb(new Error("የድምፅ ፋይል ብቻ ይፈቀዳል።"));
        }
    }
});

router.get("/contacts/:id/recordings", async (req, res) => {
    try {
        const id = clean(req.params.id);
        const snapshot = await db.collection("contacts").doc(id).get();

        if (!snapshot.exists) {
            return res.status(404).json({ success: false, error: "Contact አልተገኘም።" });
        }

        const recordingsSnap = await db.collection("contacts").doc(id)
            .collection("recordings").orderBy("createdAt", "desc").get();

        const recordings = recordingsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({ success: true, recordings });
    } catch (error) {
        console.error("Contact Recordings GET Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.patch("/contacts/:id/recordings/:recordingId", async (req, res) => {
    try {
        const id = clean(req.params.id);
        const recordingId = clean(req.params.recordingId);
        const name = clean(req.body?.name);

        if (!id || !recordingId || !name) {
            return res.status(400).json({ success: false, error: "የሪከርዱ ስም ያስፈልጋል።" });
        }

        const ref = db.collection("contacts").doc(id).collection("recordings").doc(recordingId);
        const snap = await ref.get();

        if (!snap.exists) {
            return res.status(404).json({ success: false, error: "ሪከርዱ አልተገኘም።" });
        }

        const now = new Date().toISOString();
        await ref.update({ name, updatedAt: now });

        res.json({ success: true, message: "✏️ የሪከርዱ ስም ተስተካክሏል።" });
    } catch (error) {
        console.error("Contact Recording PATCH Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete("/contacts/:id/recordings/:recordingId", async (req, res) => {
    try {
        const id = clean(req.params.id);
        const recordingId = clean(req.params.recordingId);
        const ref = db.collection("contacts").doc(id).collection("recordings").doc(recordingId);
        const snap = await ref.get();

        if (!snap.exists) {
            return res.status(404).json({ success: false, error: "ሪከርዱ አልተገኘም።" });
        }

        const data = snap.data() || {};
        const result = await moveToUniversalTrash({
            collection: "contacts/" + id + "/recordings",
            id: recordingId,
            data,
            type: "contact-recording",
            displayName: data.name || data.originalName || "የጥሪ ሪከርድ",
            extra: { contactId: id, deletedFrom: "contact-recordings" }
        });

        res.json({ success: true, trashed: true, trashId: result.trashId, message: "🗑️ ሪከርዱ ወደ Universal Trash ተወስዷል።" });
    } catch (error) {
        console.error("Contact Recording DELETE Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});
router.post("/contacts/:id/recordings", recordingUpload.single("recording"), async (req, res) => {
    try {
        const id = clean(req.params.id);
        const snap = await db.collection("contacts").doc(id).get();

        if (!snap.exists) {
            return res.status(404).json({ success: false, error: "Contact አልተገኘም።" });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, error: "የድምፅ ፋይል ያስገቡ።" });
        }

        const now = new Date().toISOString();
        const recording = {
            name: clean(req.body?.name) || req.file.originalname || "የጥሪ ሪከርድ",
            fileName: req.file.filename,
            originalName: req.file.originalname || "",
            mimeType: req.file.mimetype || "audio/mpeg",
            size: req.file.size || 0,
            url: "/uploads/contacts/recordings/" + req.file.filename,
            createdAt: now,
            updatedAt: now
        };

        const ref = await db.collection("contacts").doc(id).collection("recordings").add(recording);

        res.status(201).json({
            success: true,
            recording: { id: ref.id, ...recording },
            message: "🎙️ የጥሪ ሪከርድ ተቀምጧል።"
        });
    } catch (error) {
        console.error("Contact Recording Upload Error:", error);
        if (req.file?.path) {
            try { fs.unlinkSync(req.file.path); } catch (_) {}
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = {
    router,
    ensureContact
};
