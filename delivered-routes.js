const express = require("express");
const router = express.Router();
const { db } = require("./firebase");
const { moveToUniversalTrash } = require("./trash-helper");
const { ensureContact } = require("./contacts-routes");

function number(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function clean(value) {
    return String(value ?? "").trim();
}

/* =========================================================
   GET DELIVERED WORKS
   ========================================================= */

router.get("/delivered-orders", async (req, res) => {
    try {
        const snapshot = await db
            .collection("deliveredOrders")
            .orderBy("deliveredAt", "desc")
            .get();

        const orders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({
            success: true,
            orders
        });

    } catch (error) {
        console.error("Delivered Orders GET Error:", error);

        res.status(500).json({
            success: false,
            error: "የተረከቡ ስራዎችን ማምጣት አልተቻለም።"
        });
    }
});


/* =========================================================
   CREATE DELIVERED WORK
   ========================================================= */

router.post("/delivered-orders", async (req, res) => {
    try {

        const body = req.body || {};

        const totalAmount = Math.max(
            number(body.totalAmount),
            0
        );

        const deposit = Math.max(
            number(body.deposit),
            0
        );

        const workCost = Math.max(
            number(body.workCost),
            0
        );

        const remaining = Math.max(
            totalAmount - deposit,
            0
        );

        const profit = totalAmount - workCost;

        const deliveredAt =
            clean(body.deliveredAt) ||
            new Date().toISOString();

        const record = {

            originalOrderId:
                clean(body.originalOrderId),

            customerName:
                clean(body.customerName),

            phone:
                clean(body.phone),

            orderInfo:
                clean(body.orderInfo),

            productId:
                clean(body.productId),

            productName:
                clean(body.productName),

            orderDate:
                clean(body.orderDate),

            pickupDate:
                clean(body.pickupDate),

            deliveredAt,

            totalAmount,

            deposit,

            remaining,

            workCost,

            profit,

            notes:
                clean(body.notes),

            photoUrl:
                clean(body.photoUrl),

            createdAt:
                new Date().toISOString(),

            updatedAt:
                new Date().toISOString()
        };

        await ensureContact(record.customerName, record.phone);
        const doc = await db
            .collection("deliveredOrders")
            .add(record);

        res.status(201).json({
            success: true,
            message: "የተረከበ ስራ በትክክል ተመዝግቧል።",
            order: {
                id: doc.id,
                ...record
            }
        });

    } catch (error) {

        console.error(
            "Delivered Order Create Error:",
            error
        );

        res.status(500).json({
            success: false,
            error:
                "የተረከበ ስራን መመዝገብ አልተቻለም።"
        });
    }
});



/* =========================================================
   DELIVER ORDER
   Atomically archives the order and marks the original order
   as delivered.
   ========================================================= */

router.post("/orders/:id/deliver", async (req, res) => {
    try {
        const id = clean(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                error: "የትዕዛዝ ID የለም።"
            });
        }

        const orderRef = db.collection("orders").doc(id);
        const deliveredRef = db.collection("deliveredOrders").doc();

        const orderSnap = await orderRef.get();

        if (!orderSnap.exists) {
            return res.status(404).json({
                success: false,
                error: "ትዕዛዙ በFirebase ላይ አልተገኘም።"
            });
        }

        const existing = orderSnap.data() || {};

        const deliveredAt = new Date().toISOString();

        const totalAmount = Math.max(
            number(existing.totalAmount),
            0
        );

        const deposit = Math.max(
            number(existing.deposit),
            0
        );

        const workCost = Math.max(
            number(existing.workCost),
            0
        );

        const remaining = Math.max(
            totalAmount - deposit,
            0
        );

        const profit = totalAmount - workCost;

        await ensureContact(existing.customerName, existing.phone);
        const archive = {
            originalOrderId: id,

            customerName: clean(existing.customerName),
            phone: clean(existing.phone),

            orderInfo: clean(existing.orderInfo),

            productId: clean(existing.productId),
            productName: clean(existing.productName),

            orderDate: clean(existing.orderDate),
            pickupDate: clean(existing.pickupDate),

            totalAmount,
            deposit,
            remaining,
            workCost,
            profit,

            notes: clean(existing.notes),
            photoUrl: clean(existing.photoUrl),

            status: "ተሰጥቷል",

            delivered: true,
            isDelivered: true,
            deliveryStatus: "delivered",

            deliveredAt,

            createdAt:
                existing.createdAt || deliveredAt,

            originalUpdatedAt:
                existing.updatedAt || "",

            archivedAt: deliveredAt,
            updatedAt: deliveredAt
        };

        const orderUpdate = {
            status: "ተሰጥቷል",

            delivered: true,
            isDelivered: true,
            deliveryStatus: "delivered",

            deliveredAt,

            updatedAt: deliveredAt
        };

        const batch = db.batch();

        batch.set(deliveredRef, archive);
        batch.update(orderRef, orderUpdate);

        await batch.commit();

        res.json({
            success: true,

            message:
                "ትዕዛዙ ተረክቧል እና ወደ Delivered Archive ተዛውሯል።",

            order: {
                id: deliveredRef.id,
                ...archive
            }
        });

    } catch (error) {

        console.error(
            "Deliver Order API Error:",
            error
        );

        res.status(500).json({
            success: false,

            error:
                "ትዕዛዙን ወደ Delivered Archive ማስተላለፍ አልተቻለም።"
        });
    }
});


/* =========================================================
   DELETE DELIVERED WORK
   ========================================================= */

router.delete("/delivered-orders/:id", async (req, res) => {
    try {
        const id = clean(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                error: "ID የለም።"
            });
        }

        const ref = db
            .collection("deliveredOrders")
            .doc(id);

        const existing = await ref.get();

        if (!existing.exists) {
            return res.status(404).json({
                success: false,
                error: "የተረከበው ስራ አልተገኘም።"
            });
        }

        const data = existing.data() || {};

        const result = await moveToUniversalTrash({
            collection: "deliveredOrders",
            id,
            data,
            type: "deliveredOrder",
            displayName:
                data.customerName ||
                data.name ||
                data.productName ||
                data.title ||
                "Delivered Work",
            extra: {
                deletedFrom: "deliveredOrders"
            }
        });

        return res.json({
            success: true,
            trashed: true,
            trashId: result.trashId,
            message: "🗑️ የተረከበው ስራ ወደ Universal Trash ተወስዷል።",
            delivered: result
        });

    } catch (error) {
        console.error(
            "Delivered Universal Trash Error:",
            error
        );

        return res.status(500).json({
            success: false,
            error:
                error.message ||
                "የተረከበውን ስራ ወደ Universal Trash መውሰድ አልተቻለም።"
        });
    }
});

module.exports = router;
