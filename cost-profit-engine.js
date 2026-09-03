"use strict";

/*
 * YamGiftET AI v2
 * Universal Calculator → Cost & Profit Engine
 *
 * Purpose:
 * - Calculate total cost
 * - Calculate profit
 * - Calculate profit percentage (markup on cost)
 * - Calculate profit margin (profit as % of selling price)
 *
 * This engine does NOT modify Orders, Finance,
 * Self Products, Raw Materials, or Stock.
 */

function toNumber(value, field = "value") {
    const n = Number(value);

    if (!Number.isFinite(n)) {
        throw new Error(
            `${field} ትክክለኛ ቁጥር መሆን አለበት።`
        );
    }

    if (n < 0) {
        throw new Error(
            `${field} አሉታዊ መሆን አይችልም።`
        );
    }

    return n;
}

function calculateTotalCost({
    materialCost = 0,
    workCost = 0,
    otherCost = 0
} = {}) {
    const material = toNumber(
        materialCost,
        "Material Cost"
    );

    const work = toNumber(
        workCost,
        "Work Cost"
    );

    const other = toNumber(
        otherCost,
        "Other Cost"
    );

    return material + work + other;
}

function calculateProfit(sellingPrice, totalCost) {
    const price = toNumber(
        sellingPrice,
        "Selling Price"
    );

    const cost = toNumber(
        totalCost,
        "Total Cost"
    );

    return price - cost;
}

function calculateProfitPercent(profit, totalCost) {
    const p = Number(profit);

    if (!Number.isFinite(p)) {
        throw new Error(
            "Profit ትክክለኛ ቁጥር መሆን አለበት።"
        );
    }

    const cost = toNumber(
        totalCost,
        "Total Cost"
    );

    if (cost === 0) {
        return 0;
    }

    return (p / cost) * 100;
}

function calculateMarginPercent(profit, sellingPrice) {
    const p = Number(profit);

    if (!Number.isFinite(p)) {
        throw new Error(
            "Profit ትክክለኛ ቁጥር መሆን አለበት።"
        );
    }

    const price = toNumber(
        sellingPrice,
        "Selling Price"
    );

    if (price === 0) {
        return 0;
    }

    return (p / price) * 100;
}

function calculateCostProfit({
    quantity = 1,
    materialUnitCost = 0,
    workCost = 0,
    otherCost = 0,
    sellingPrice = 0
} = {}) {
    const qty = toNumber(
        quantity,
        "Quantity"
    );

    const materialUnit = toNumber(
        materialUnitCost,
        "Material Unit Cost"
    );

    const work = toNumber(
        workCost,
        "Work Cost"
    );

    const other = toNumber(
        otherCost,
        "Other Cost"
    );

    const price = toNumber(
        sellingPrice,
        "Selling Price"
    );

    const materialCost =
        materialUnit * qty;

    const totalCost =
        calculateTotalCost({
            materialCost,
            workCost: work,
            otherCost: other
        });

    const profit =
        calculateProfit(
            price,
            totalCost
        );

    const profitPercent =
        calculateProfitPercent(
            profit,
            totalCost
        );

    const marginPercent =
        calculateMarginPercent(
            profit,
            price
        );

    return {
        quantity: qty,
        materialUnitCost: materialUnit,
        materialCost,
        workCost: work,
        otherCost: other,
        totalCost,
        sellingPrice: price,
        profit,
        profitPercent,
        marginPercent
    };
}

module.exports = {
    toNumber,
    calculateTotalCost,
    calculateProfit,
    calculateProfitPercent,
    calculateMarginPercent,
    calculateCostProfit
};
