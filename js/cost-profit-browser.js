"use strict";

(function () {
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
        return (
            toNumber(materialCost, "Material Cost") +
            toNumber(workCost, "Work Cost") +
            toNumber(otherCost, "Other Cost")
        );
    }

    function calculateProfit(sellingPrice, totalCost) {
        return (
            toNumber(sellingPrice, "Selling Price") -
            toNumber(totalCost, "Total Cost")
        );
    }

    function calculateProfitPercent(profit, totalCost) {
        const p = Number(profit);

        if (!Number.isFinite(p)) {
            throw new Error(
                "Profit ትክክለኛ ቁጥር መሆን አለበት።"
            );
        }

        const cost = toNumber(totalCost, "Total Cost");

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

        const price = toNumber(sellingPrice, "Selling Price");

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
        const qty = toNumber(quantity, "Quantity");
        const materialUnit = toNumber(
            materialUnitCost,
            "Material Unit Cost"
        );
        const work = toNumber(workCost, "Work Cost");
        const other = toNumber(otherCost, "Other Cost");
        const price = toNumber(sellingPrice, "Selling Price");

        const materialCost = materialUnit * qty;

        const totalCost = calculateTotalCost({
            materialCost,
            workCost: work,
            otherCost: other
        });

        const profit = calculateProfit(
            price,
            totalCost
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
            profitPercent: calculateProfitPercent(
                profit,
                totalCost
            ),
            marginPercent: calculateMarginPercent(
                profit,
                price
            )
        };
    }

    window.yamCostProfitCalculator = {
        toNumber,
        calculateTotalCost,
        calculateProfit,
        calculateProfitPercent,
        calculateMarginPercent,
        calculateCostProfit
    };

    console.log(
        "✅ Yam Cost & Profit Browser Bridge loaded"
    );
})();
