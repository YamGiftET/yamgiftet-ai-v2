"use strict";

/*
 * YamGiftET AI v2
 * Universal Calculator → Units Converter Engine
 *
 * Supported:
 * Volume: mL ↔ L
 * Weight: g ↔ kg
 * Length: cm ↔ m ↔ inch
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

const UNITS = {
    volume: {
        ml: 1,
        l: 1000
    },

    weight: {
        g: 1,
        kg: 1000
    },

    length: {
        cm: 1,
        m: 100,
        inch: 2.54
    }
};

function normalizeUnit(unit) {
    return String(unit)
        .trim()
        .toLowerCase();
}

function convert(value, fromUnit, toUnit, category) {
    const amount = toNumber(value, "Value");
    const from = normalizeUnit(fromUnit);
    const to = normalizeUnit(toUnit);
    const type = String(category)
        .trim()
        .toLowerCase();

    if (!UNITS[type]) {
        throw new Error(
            `የማይታወቅ Unit ምድብ፦ ${category}`
        );
    }

    if (
        UNITS[type][from] === undefined ||
        UNITS[type][to] === undefined
    ) {
        throw new Error(
            `የማይታወቅ Unit፦ ${fromUnit} → ${toUnit}`
        );
    }

    const baseValue =
        amount * UNITS[type][from];

    return baseValue / UNITS[type][to];
}

function mlToLiter(value) {
    return convert(value, "ml", "l", "volume");
}

function literToMl(value) {
    return convert(value, "l", "ml", "volume");
}

function gramToKg(value) {
    return convert(value, "g", "kg", "weight");
}

function kgToGram(value) {
    return convert(value, "kg", "g", "weight");
}

function cmToMeter(value) {
    return convert(value, "cm", "m", "length");
}

function meterToCm(value) {
    return convert(value, "m", "cm", "length");
}

function cmToInch(value) {
    return convert(value, "cm", "inch", "length");
}

function inchToCm(value) {
    return convert(value, "inch", "cm", "length");
}

module.exports = {
    toNumber,
    normalizeUnit,
    convert,
    mlToLiter,
    literToMl,
    gramToKg,
    kgToGram,
    cmToMeter,
    meterToCm,
    cmToInch,
    inchToCm,
    UNITS
};
