const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();
const { db } = require("./firebase");

/* =========================================================
   YamGiftET AI — MASTER ORDERS ROUTES
   ========================================================= */

const uploadDir = path.join(__dirname, "uploads", "orders");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

/* =========================================================
   PHOTO UPLOAD
   ========================================================= */

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || "").toLowerCase();

        const name =
            "order-" +
            Date.now() +
            "-" +
            Math.random().toString(36).slice(2, 8) +
            ext;

        cb(null, name);
    }
});

const upload = multer({
    storage,

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

/* =========================================================
   HELPERS
   ========================================================= */

function number(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function clean(value) {
    return String(value ?? "").trim();
}

function normalizeStatus(value) {
    return clean(value).toLowerCase();
}

function isDeliveredStatus(value) {
    const status = normalizeStatus(value);

    return [
        "ተሰጥቷል",
        "ተረክቧል",
        "ተረከበ",
        "ተረክቧል።",
        "delivered",
        "delivery",
        "completed",
        "complete",
        "done",
        "delivered_order"
    ].includes(status);
}

function calculateOrder(totalAmount, deposit, workCost) {
    const total = Math.max(number(totalAmount), 0);
    const paid = Math.max(number(deposit), 0);
    const cost = Math.max(number(workCost), 0);

    const remaining = Math.max(total - paid, 0);

    const profit = total - cost;

    return {
        totalAmount: total,
        deposit: paid,
        remaining,
        workCost: cost,
        profit
    };
}

function buildDeliveryFields(status, oldOrder = {}) {
    const delivered = isDeliveredStatus(status);

    if (delivered) {
        return {
            delivered: true,
            isDelivered: true,
            deliveryStatus: "delivered",
            deliveredAt:
                oldOrder.deliveredAt ||
                new Date().toISOString()
        };
    }

    return {
        delivered: false,
        isDelivered: false,
        deliveryStatus: "",
        deliveredAt: ""
    };
}

/* =========================================================
   CREATE ORDER
   ========================================================= */

router.post(
    "/orders",
    upload.single("photo"),
    async (req, res) => {
        try {
            const {
                customerName,
                phone,
                orderInfo,
                productId,
                productName,
                totalAmount,
                deposit,
                orderDate,
                pickupDate,
                workCost,
                status,
                notes,
                photoUrl
            } = req.body;

            if (
                !clean(customerName) ||
                !clean(phone) ||
                !clean(productName)
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "የደንበኛ ስም፣ ስልክ እና ምርት ያስፈልጋሉ።"
                });
            }

            const money = calculateOrder(
                totalAmount,
                deposit,
                workCost
            );

            const finalStatus =
                clean(status) || "አዲስ";

            const delivery =
                buildDeliveryFields(finalStatus);

            const now = new Date().toISOString();

            const order = {
                customerName: clean(customerName),
                phone: clean(phone),

                orderInfo: clean(orderInfo),
                productId: clean(productId),
                productName: clean(productName),

                ...money,

                orderDate:
                    clean(orderDate) || now,

                pickupDate:
                    clean(pickupDate),

                status: finalStatus,

                notes: clean(notes),

                photoUrl:
                    req.file
                        ? "/uploads/orders/" +
                          req.file.filename
                        : clean(photoUrl),

                ...delivery,

                createdAt: now,
                updatedAt: now
            };

            const doc =
                await db
                    .collection("orders")
                    .add(order);

            res.status(201).json({
                success: true,

                message:
                    "ትዕዛዙ በትክክል ተመዝግቧል።",

                orderId: doc.id,

                order: {
                    id: doc.id,
                    ...order
                }
            });

        } catch (error) {

            console.error(
                "Order Create Error:",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "ትዕዛዙን ማስመዝገብ አልተቻለም።"
            });
        }
    }
);

/* =========================================================
   GET ALL ORDERS
   ========================================================= */

router.get(
    "/orders",
    async (req, res) => {
        try {

            const snapshot =
                await db
                    .collection("orders")
                    .orderBy(
                        "createdAt",
                        "desc"
                    )
                    .get();

            const orders =
                snapshot.docs.map(doc => {

                    const data = doc.data() || {};

                    const money =
                        calculateOrder(
                            data.totalAmount,
                            data.deposit,
                            data.workCost
                        );

                    const status =
                        clean(data.status) ||
                        "አዲስ";

                    const delivery =
                        buildDeliveryFields(
                            status,
                            data
                        );

                    return {
                        id: doc.id,

                        ...data,

                        ...money,

                        status,

                        ...delivery
                    };
                });

            res.json({
                success: true,
                count: orders.length,
                orders
            });

        } catch (error) {

            console.error(
                "Orders Get Error:",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "ትዕዛዞችን ማምጣት አልተቻለም።"
            });
        }
    }
);

/* =========================================================
   GET ONE ORDER
   ========================================================= */

router.get(
    "/orders/:id",
    async (req, res) => {
        try {

            const doc =
                await db
                    .collection("orders")
                    .doc(req.params.id)
                    .get();

            if (!doc.exists) {

                return res.status(404).json({
                    success: false,
                    error:
                        "ትዕዛዙ አልተገኘም።"
                });
            }

            const data =
                doc.data() || {};

            const money =
                calculateOrder(
                    data.totalAmount,
                    data.deposit,
                    data.workCost
                );

            const status =
                clean(data.status) ||
                "አዲስ";

            const delivery =
                buildDeliveryFields(
                    status,
                    data
                );

            res.json({
                success: true,

                order: {
                    id: doc.id,

                    ...data,

                    ...money,

                    status,

                    ...delivery
                }
            });

        } catch (error) {

            console.error(
                "Order Get Error:",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "ትዕዛዙን ማምጣት አልተቻለም።"
            });
        }
    }
);

/* =========================================================
   UPDATE ORDER
   ========================================================= */

router.patch(
    "/orders/:id",
    async (req, res) => {
        try {
            const orderId = clean(req.params.id);

            if (!orderId) {
                return res.status(400).json({
                    success: false,
                    error: "የትዕዛዝ ID የለም።"
                });
            }

            const oldRef = db
                .collection("orders")
                .doc(orderId);

            const oldDoc = await oldRef.get();

            if (!oldDoc.exists) {
                return res.status(404).json({
                    success: false,
                    error: "ትዕዛዙ አልተገኘም።"
                });
            }

            const oldOrder = oldDoc.data() || {};
            const body = req.body || {};

            /*
             * Preserve existing order data.
             * PATCH should update only the fields supplied by the client.
             */
            const merged = {
                ...oldOrder,
                ...body
            };

            const money = calculateOrder(
                merged.totalAmount,
                merged.deposit,
                merged.workCost
            );

            const finalStatus =
                clean(merged.status) ||
                clean(oldOrder.status) ||
                "አዲስ";

            const delivery =
                buildDeliveryFields(
                    finalStatus,
                    oldOrder
                );

            const now =
                new Date().toISOString();

            const orderData = {
                ...merged,

                customerName:
                    clean(merged.customerName),

                phone:
                    clean(merged.phone),

                orderInfo:
                    clean(merged.orderInfo),

                productId:
                    clean(merged.productId),

                productName:
                    clean(merged.productName),

                ...money,

                orderDate:
                    clean(merged.orderDate),

                pickupDate:
                    clean(merged.pickupDate),

                status:
                    finalStatus,

                notes:
                    clean(merged.notes),

                photoUrl:
                    clean(merged.photoUrl),

                ...delivery,

                updatedAt:
                    now
            };

            /*
             * =====================================================
             * 📦 DELIVERED
             *
             * 1. Copy the complete order to deliveredOrders
             * 2. Keep financial calculations
             * 3. Keep customer/product/photo information
             * 4. Delete the active order
             * =====================================================
             */
            if (isDeliveredStatus(finalStatus)) {

                const deliveredRef =
                    db.collection("deliveredOrders").doc();

                const deliveredRecord = {
                    ...orderData,

                    id: deliveredRef.id,

                    originalOrderId:
                        orderId,

                    delivered:
                        true,

                    isDelivered:
                        true,

                    deliveryStatus:
                        "delivered",

                    deliveredAt:
                        oldOrder.deliveredAt ||
                        now,

                    createdAt:
                        oldOrder.createdAt ||
                        now,

                    archivedAt:
                        now,

                    updatedAt:
                        now
                };

                await db.runTransaction(
                    async (transaction) => {

                        transaction.set(
                            deliveredRef,
                            deliveredRecord
                        );

                        transaction.delete(
                            oldRef
                        );
                    }
                );

                return res.json({
                    success: true,

                    delivered: true,

                    message:
                        "📦 ስራው ተረክቧል። ወደ Delivered Archive ተዛውሯል።",

                    order: {
                        id: deliveredRef.id,
                        ...deliveredRecord
                    }
                });
            }

            /*
             * =====================================================
             * NORMAL ORDER UPDATE
             * =====================================================
             */

            await oldRef.update(orderData);

            return res.json({
                success: true,

                delivered: false,

                message:
                    "የትዕዛዙ መረጃ ተዘምኗል።",

                order: {
                    id: orderId,
                    ...orderData
                }
            });

        } catch (error) {

            console.error(
                "Order Update / Delivery Archive Error:",
                error
            );

            return res.status(500).json({
                success: false,

                error:
                    error.message ||
                    "የትዕዛዙን መረጃ ማዘመን ወይም ወደ Delivered Archive ማስቀመጥ አልተቻለም።"
            });
        }
    }
);

/* =========================================================
   DELETE ORDER
   ========================================================= */

router.delete(
    "/orders/:id",
    async (req, res) => {

        try {

            const doc =
                await db
                    .collection("orders")
                    .doc(req.params.id)
                    .get();

            if (!doc.exists) {

                return res.status(404).json({
                    success: false,
                    error:
                        "ትዕዛዙ አልተገኘም።"
                });
            }

            await db
                .collection("orders")
                .doc(req.params.id)
                .delete();

            res.json({
                success: true,

                message:
                    "ትዕዛዙ ተሰርዟል።"
            });

        } catch (error) {

            console.error(
                "Order Delete Error:",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "ትዕዛዙን መሰረዝ አልተቻለም።"
            });
        }
    }
);

module.exports = router;
