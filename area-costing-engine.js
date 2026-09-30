"use strict";

const {
    normalizeUnit,
    getUnitFamily,
    convert
} = require("./units-converter-engine");

function positive(value, field) {
    const n = Number(value);

    if (!Number.isFinite(n) || n <= 0) {
        throw new Error(`${field} ከ 0 በላይ መሆን አለበት።`);
    }

    return n;
}

function calculateArea({
    length,
    width,
    dimensionUnit
}) {
    const l = positive(length, "Length");
    const w = positive(width, "Width");

    const unit = normalizeUnit(dimensionUnit);

    if (getUnitFamily(unit) !== "length") {
        throw new Error("Length/Width Unit የLength Unit መሆን አለበት።");
    }

    const lengthInMm = convert(l, unit, "mm");
    const widthInMm = convert(w, unit, "mm");

    const areaMm2 = lengthInMm * widthInMm;

    return {
        length: l,
        width: w,
        dimensionUnit: unit,
        areaMm2,
        areaCm2: convert(areaMm2, "mm2", "cm2"),
        areaM2: convert(areaMm2, "mm2", "m2")
    };
}

function calculateAreaPurchaseCost({
    length,
    width,
    dimensionUnit,
    areaUnit,
    purchasePrice
}) {
    const area = calculateArea({
        length,
        width,
        dimensionUnit
    });

    const targetAreaUnit = normalizeUnit(areaUnit);

    if (getUnitFamily(targetAreaUnit) !== "area") {
        throw new Error("Area Unit የArea Unit መሆን አለበት።");
    }

    const totalPurchasePrice = positive(
        purchasePrice,
        "Purchase Price"
    );

    const areaQuantity = convert(
        area.areaMm2,
        "mm2",
        targetAreaUnit
    );

    if (!Number.isFinite(areaQuantity) || areaQuantity <= 0) {
        throw new Error("Area Quantity ልክ አይደለም።");
    }

    const areaUnitCost = totalPurchasePrice / areaQuantity;

    return {
        ...area,
        area: areaQuantity,
        areaUnit: targetAreaUnit,
        areaUnitCost,
        purchasePrice: totalPurchasePrice,
        totalCost: totalPurchasePrice
    };
}

function calculateAreaCost({
    length,
    width,
    dimensionUnit,
    areaUnit,
    areaUnitCost
}) {
    const area = calculateArea({
        length,
        width,
        dimensionUnit
    });

    const targetAreaUnit = normalizeUnit(areaUnit);

    if (getUnitFamily(targetAreaUnit) !== "area") {
        throw new Error("Area Unit የArea Unit መሆን አለበት።");
    }

    const costPerAreaUnit = positive(
        areaUnitCost,
        "Area Unit Cost"
    );

    const areaQuantity = convert(
        area.areaMm2,
        "mm2",
        targetAreaUnit
    );

    const totalCost = areaQuantity * costPerAreaUnit;

    return {
        ...area,
        area: areaQuantity,
        areaUnit: targetAreaUnit,
        areaUnitCost: costPerAreaUnit,
        totalCost
    };
}

module.exports = {
    calculateArea,
    calculateAreaCost,
    calculateAreaPurchaseCost
};
