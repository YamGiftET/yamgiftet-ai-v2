const express = require("express");
const { db } = require("./firebase");
const { moveToUniversalTrash } = require("./trash-helper");
const { ensureContact } = require("./contacts-routes");

const router = express.Router();

function clean(value) {
    return String(value ?? "").trim();
}

/* GET ALL APPOINTMENTS */
router.get("/appointments", async (req, res) => {
    try {
        const snapshot = await db
            .collection("appointments")
            .orderBy("createdAt", "desc")
            .get();

        const appointments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({
            success: true,
            count: appointments.length,
            appointments
        });
    } catch (error) {
        console.error("Appointments GET Error:", error);

        res.status(500).json({
            success: false,
            error: "ቀጠሮዎችን ማምጣት አልተቻለም።"
        });
    }
});

/* GET ONE APPOINTMENT */
router.get("/appointments/:id", async (req, res) => {
    try {
        const id = clean(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                error: "Appointment ID ያስፈልጋል።"
            });
        }

        const ref = db.collection("appointments").doc(id);
        const snap = await ref.get();

        if (!snap.exists) {
            return res.status(404).json({
                success: false,
                error: "ቀጠሮው አልተገኘም።"
            });
        }

        res.json({
            success: true,
            appointment: {
                id: snap.id,
                ...snap.data()
            }
        });
    } catch (error) {
        console.error("Appointment GET ONE Error:", error);

        res.status(500).json({
            success: false,
            error: "ቀጠሮውን ማምጣት አልተቻለም።"
        });
    }
});

/* CREATE APPOINTMENT */
router.post("/appointments", async (req, res) => {
    try {
        const body = req.body || {};

        const name = clean(body.name);
        const phone = clean(body.phone);
        const date = clean(body.date);
        const time = clean(body.time);

        if (!name || !phone || !date || !time) {
            return res.status(400).json({
                success: false,
                error: "ስም፣ ስልክ፣ ቀን እና ሰዓት ያስፈልጋሉ።"
            });
        }

        const now = new Date().toISOString();

        const appointment = {
            name,
            phone,
            date,
            time,
            createdAt: now,
            updatedAt: now
        };

        await ensureContact(name, phone);
        const ref = await db
            .collection("appointments")
            .add(appointment);

        res.status(201).json({
            success: true,
            message: "ቀጠሮው ተመዝግቧል።",
            appointment: {
                id: ref.id,
                ...appointment
            }
        });
    } catch (error) {
        console.error("Appointments CREATE Error:", error);

        res.status(500).json({
            success: false,
            error: "ቀጠሮውን ማስቀመጥ አልተቻለም።"
        });
    }
});

/* UPDATE APPOINTMENT */
router.patch("/appointments/:id", async (req, res) => {
    try {
        const id = clean(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                error: "Appointment ID ያስፈልጋል።"
            });
        }

        const ref = db.collection("appointments").doc(id);
        const snap = await ref.get();

        if (!snap.exists) {
            return res.status(404).json({
                success: false,
                error: "ቀጠሮው አልተገኘም።"
            });
        }

        const body = req.body || {};

        const update = {
            name: clean(body.name),
            phone: clean(body.phone),
            date: clean(body.date),
            time: clean(body.time),
            updatedAt: new Date().toISOString()
        };

        if (!update.name || !update.phone || !update.date || !update.time) {
            return res.status(400).json({
                success: false,
                error: "ስም፣ ስልክ፣ ቀን እና ሰዓት ያስፈልጋሉ።"
            });
        }

        await ref.update(update);
        // 🔗 Centralized Contact auto-sync
        await ensureContact(update.name, update.phone);

        res.json({
            success: true,
            message: "ቀጠሮው ተስተካክሏል።",
            appointment: {
                id,
                ...snap.data(),
                ...update
            }
        });
    } catch (error) {
        console.error("Appointments UPDATE Error:", error);

        res.status(500).json({
            success: false,
            error: "ቀጠሮውን ማስተካከል አልተቻለም።"
        });
    }
});

/* DELETE → UNIVERSAL TRASH */
router.delete("/appointments/:id", async (req, res) => {
    try {
        const id = clean(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                error: "Appointment ID ያስፈልጋል።"
            });
        }

        const ref = db.collection("appointments").doc(id);
        const snap = await ref.get();

        if (!snap.exists) {
            return res.status(404).json({
                success: false,
                error: "ቀጠሮው አልተገኘም።"
            });
        }

        const data = snap.data() || {};

        const result = await moveToUniversalTrash({
            collection: "appointments",
            id,
            data,
            type: "appointment",
            displayName: data.name || "Appointment",
            extra: {
                deletedFrom: "appointments"
            }
        });

        res.json({
            success: true,
            trashed: true,
            trashId: result.trashId,
            message: "🗑️ ቀጠሮው ወደ Universal Trash ተወስዷል።"
        });
    } catch (error) {
        console.error("Appointments DELETE Error:", error);

        res.status(500).json({
            success: false,
            error: "ቀጠሮውን ወደ Trash መውሰድ አልተቻለም።"
        });
    }
});

module.exports = router;
