function calculatePlanningResult(target, actual) {
    const safeTarget = Number(target);
    const safeActual = Number(actual);

    if (!Number.isFinite(safeTarget) || safeTarget < 0) {
        throw new Error("Invalid planning target");
    }

    if (!Number.isFinite(safeActual) || safeActual < 0) {
        throw new Error("Invalid planning actual");
    }

    const achievement = safeTarget > 0
        ? (safeActual / safeTarget) * 100
        : (safeActual === 0 ? 100 : 0);

    const variance = safeActual - safeTarget;
    const remaining = Math.max(safeTarget - safeActual, 0);

    return {
        target: safeTarget,
        actual: safeActual,
        achievement: Number(achievement.toFixed(2)),
        variance: Number(variance.toFixed(2)),
        remaining: Number(remaining.toFixed(2))
    };
}

module.exports = {
    calculatePlanningResult
};

function isDateInPeriod(value, startDate, endDate) {
    const date = String(value ?? "").slice(0, 10);
    return Boolean(date) && date >= startDate && date <= endDate;
}

function sumNumeric(records, field) {
    return records.reduce((total, record) => {
        const value = Number(record?.[field] || 0);
        return total + (Number.isFinite(value) ? value : 0);
    }, 0);
}

async function calculateSalesActual(db, startDate, endDate) {
    const [ordersSnap, deliveredSnap, selfProductsSnap] = await Promise.all([
        db.collection("orders").get(),
        db.collection("deliveredOrders").get(),
        db.collection("selfProducts").get()
    ]);

    const deliveredOriginalIds = new Set(
        deliveredSnap.docs
            .map(doc => doc.data()?.originalOrderId)
            .filter(Boolean)
    );

    let orderSales = 0;

    ordersSnap.docs.forEach(doc => {
        const data = doc.data() || {};

        if (
            deliveredOriginalIds.has(doc.id) ||
            !isDateInPeriod(data.orderDate || data.createdAt, startDate, endDate)
        ) {
            return;
        }

        orderSales += Number(data.totalAmount || 0);
    });

    let selfProductSales = 0;

    for (const productDoc of selfProductsSnap.docs) {
        const salesSnap = await db
            .collection("selfProducts")
            .doc(productDoc.id)
            .collection("sales")
            .get();

        salesSnap.docs.forEach(saleDoc => {
            const data = saleDoc.data() || {};

            if (isDateInPeriod(data.saleDate || data.createdAt, startDate, endDate)) {
                selfProductSales += Number(data.totalSales || 0);
            }
        });
    }

    deliveredSnap.docs.forEach(doc => {
        const data = doc.data() || {};

        if (
            isDateInPeriod(
                data.deliveredAt || data.orderDate || data.createdAt,
                startDate,
                endDate
            )
        ) {
            orderSales += Number(data.totalAmount || 0);
        }
    });

    return Number((orderSales + selfProductSales).toFixed(2));
}

module.exports = {
    calculatePlanningResult,
    isDateInPeriod,
    sumNumeric,
    calculateSalesActual
};

async function calculateExpenseActual(db, startDate, endDate) {
    const snap = await db.collection("expenses").get();

    let total = 0;

    snap.docs.forEach(doc => {
        const data = doc.data() || {};

        if (isDateInPeriod(data.expenseDate || data.createdAt, startDate, endDate)) {
            const amount = Number(data.amount || 0);

            if (Number.isFinite(amount)) {
                total += amount;
            }
        }
    });

    return Number(total.toFixed(2));
}

module.exports.calculateExpenseActual = calculateExpenseActual;

async function calculatePurchaseActual(db, startDate, endDate) {
    const snap = await db.collection("materialPurchases").get();

    let total = 0;

    snap.docs.forEach(doc => {
        const data = doc.data() || {};

        if (
            isDateInPeriod(
                data.purchaseDate || data.createdAt,
                startDate,
                endDate
            )
        ) {
            const amount = Number(
                data.totalCost ?? data.purchasePrice ?? 0
            );

            if (Number.isFinite(amount)) {
                total += amount;
            }
        }
    });

    return Number(total.toFixed(2));
}

module.exports.calculatePurchaseActual = calculatePurchaseActual;

async function calculateProductionActual(db, startDate, endDate) {
    const snap = await db.collection("productions").get();

    let total = 0;

    snap.docs.forEach(doc => {
        const data = doc.data() || {};
        const status = String(data.status || "").toLowerCase();

        if (
            status === "voided" ||
            status === "cancelled" ||
            status === "canceled"
        ) {
            return;
        }

        if (
            isDateInPeriod(
                data.productionDate || data.createdAt,
                startDate,
                endDate
            )
        ) {
            const quantity = Number(data.quantity || 0);

            if (Number.isFinite(quantity)) {
                total += quantity;
            }
        }
    });

    return Number(total.toFixed(2));
}

module.exports.calculateProductionActual = calculateProductionActual;

async function calculateOrderActual(db, startDate, endDate) {
    const [ordersSnap, deliveredSnap] = await Promise.all([
        db.collection("orders").get(),
        db.collection("deliveredOrders").get()
    ]);

    const deliveredOriginalIds = new Set(
        deliveredSnap.docs
            .map(doc => doc.data()?.originalOrderId)
            .filter(Boolean)
    );

    let total = 0;

    ordersSnap.docs.forEach(doc => {
        const data = doc.data() || {};

        if (deliveredOriginalIds.has(doc.id)) {
            return;
        }

        if (
            isDateInPeriod(
                data.orderDate || data.createdAt,
                startDate,
                endDate
            )
        ) {
            const amount = Number(data.totalAmount || 0);

            if (Number.isFinite(amount)) {
                total += amount;
            }
        }
    });

    deliveredSnap.docs.forEach(doc => {
        const data = doc.data() || {};

        if (
            isDateInPeriod(
                data.deliveredAt || data.orderDate || data.createdAt,
                startDate,
                endDate
            )
        ) {
            const amount = Number(data.totalAmount || 0);

            if (Number.isFinite(amount)) {
                total += amount;
            }
        }
    });

    return Number(total.toFixed(2));
}

module.exports.calculateOrderActual = calculateOrderActual;

async function calculateMetricActual(db, metric, startDate, endDate) {
    const normalizedMetric = String(metric ?? "").trim().toLowerCase();

    switch (normalizedMetric) {
        case "sales":
            return calculateSalesActual(db, startDate, endDate);

        case "orders":
            return calculateOrderActual(db, startDate, endDate);

        case "expenses":
            return calculateExpenseActual(db, startDate, endDate);

        case "purchases":
        case "raw_material_purchases":
            return calculatePurchaseActual(db, startDate, endDate);

        case "production":
            return calculateProductionActual(db, startDate, endDate);

        default:
            throw new Error(`Unsupported planning metric: ${metric}`);
    }
}

module.exports.calculateMetricActual = calculateMetricActual;

async function calculatePlanningEvaluation(db, plan) {
    if (!plan || typeof plan !== "object") {
        throw new Error("Invalid planning plan");
    }

    const startDate = String(plan.startDate ?? "").trim();
    const endDate = String(plan.endDate ?? "").trim();
    const metric = String(plan.metric ?? "").trim();

    if (!startDate || !endDate || !metric) {
        throw new Error("Planning period or metric is missing");
    }

    if (endDate < startDate) {
        throw new Error("Invalid planning period");
    }

    const actual = await calculateMetricActual(
        db,
        metric,
        startDate,
        endDate
    );

    const result = calculatePlanningResult(
        plan.target,
        actual
    );

    return {
        planId: plan.id || null,
        title: plan.title || "",
        metric,
        unit: plan.unit || "",
        periodType: plan.periodType || "",
        startDate,
        endDate,
        ...result,
        status: evaluatePlanningStatus(result.achievement)
    };
}

module.exports.calculatePlanningEvaluation = calculatePlanningEvaluation;

function evaluatePlanningStatus(achievement) {
    const value = Number(achievement);

    if (!Number.isFinite(value) || value < 0) {
        throw new Error("Invalid planning achievement");
    }

    if (value >= 100) {
        return "achieved";
    }

    if (value > 0) {
        return "in_progress";
    }

    return "not_started";
}

module.exports.evaluatePlanningStatus = evaluatePlanningStatus;
