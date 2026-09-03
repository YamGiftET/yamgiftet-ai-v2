"use strict";

/*
 * YamGiftET AI v2
 * Universal Calculator → Epoxy Calculator Engine
 *
 * Shape → Area → Volume → Waste → Total Epoxy
 * → Resin : Hardener → Resin + Hardener
 */

function toNumber(value, field = "value") {
    const n = Number(value);

    if (!Number.isFinite(n) || n < 0) {
        throw new Error(`${field} ትክክለኛ አዎንታዊ ቁጥር መሆን አለበት።`);
    }

    return n;
}

function rectangleArea(length, width) {
    return toNumber(length, "Length") *
           toNumber(width, "Width");
}

function squareArea(side) {
    const s = toNumber(side, "Side");
    return s * s;
}

function circleArea(diameter) {
    const d = toNumber(diameter, "Diameter");
    return Math.PI * Math.pow(d / 2, 2);
}

function ovalArea(length, width) {
    const l = toNumber(length, "Length");
    const w = toNumber(width, "Width");

    return Math.PI * (l / 2) * (w / 2);
}

function triangleArea(base, height) {
    return (
        toNumber(base, "Base") *
        toNumber(height, "Height")
    ) / 2;
}

function volumeFromArea(area, thickness) {
    return (
        toNumber(area, "Area") *
        toNumber(thickness, "Thickness")
    );
}

function addWaste(volume, wastePercent = 0) {
    const v = toNumber(volume, "Volume");
    const waste = toNumber(wastePercent, "Waste");

    return v + (v * waste / 100);
}

function calculateRatio(total, resinPart, hardenerPart) {
    const t = toNumber(total, "Total");
    const resin = toNumber(resinPart, "Resin Ratio");
    const hardener = toNumber(hardenerPart, "Hardener Ratio");

    const ratioTotal = resin + hardener;

    if (ratioTotal <= 0) {
        throw new Error("Resin/Hardener Ratio ትክክል መሆን አለበት።");
    }

    return {
        total: t,
        resin: t * resin / ratioTotal,
        hardener: t * hardener / ratioTotal
    };
}

function calculateEpoxy({
    shape,
    length,
    width,
    diameter,
    base,
    height,
    thickness,
    wastePercent = 0,
    resinRatio = 1,
    hardenerRatio = 1
}) {
    let area;

    switch (String(shape).toLowerCase()) {
        case "rectangle":
            area = rectangleArea(length, width);
            break;

        case "square":
            area = squareArea(length);
            break;

        case "circle":
            area = circleArea(diameter);
            break;

        case "oval":
        case "ellipse":
            area = ovalArea(length, width);
            break;

        case "triangle":
            area = triangleArea(base, height);
            break;

        default:
            throw new Error(`የማይታወቅ ቅርጽ፦ ${shape}`);
    }

    const volume = volumeFromArea(area, thickness);
    const totalEpoxy = addWaste(volume, wastePercent);

    const ratio = calculateRatio(
        totalEpoxy,
        resinRatio,
        hardenerRatio
    );

    return {
        shape,
        area,
        volume,
        wastePercent: toNumber(wastePercent, "Waste"),
        totalEpoxy,
        resin: ratio.resin,
        hardener: ratio.hardener
    };
}

module.exports = {
    toNumber,
    rectangleArea,
    squareArea,
    circleArea,
    ovalArea,
    triangleArea,
    volumeFromArea,
    addWaste,
    calculateRatio,
    calculateEpoxy
};
