"use strict";

(function () {
    const UNITS = {
        volume: {
            ml: 1,
            l: 1000
        },

        weight: {
            mg: 0.001,
            g: 1,
            kg: 1000
        },

        length: {
            mm: 1,
            cm: 10,
            m: 1000
        },

        area: {
            mm2: 1,
            cm2: 100,
            m2: 1000000
        },

        count: {
            pcs: 1
        }
    };

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

    const UNIT_ALIASES = {
        "ሊትር": "l",
        "liter": "l",
        "litre": "l",
        "ሚሊሊትር": "ml",
        "milliliter": "ml",
        "millilitre": "ml",
        "ሚሊግራም": "mg",
        "milligram": "mg",
        "milligrams": "mg",
        "ግራም": "g",
        "gram": "g",
        "ኪሎ": "kg",
        "ኪሎግራም": "kg",
        "kilogram": "kg",
        "ሚሊሜትር": "mm",
        "millimeter": "mm",
        "ሴንቲሜትር": "cm",
        "centimeter": "cm",
        "ሜትር": "m",
        "meter": "m",

        "ሚሊሜትር ካሬ": "mm2",
        "square millimeter": "mm2",
        "square millimeters": "mm2",
        "mm²": "mm2",

        "ሴንቲሜትር ካሬ": "cm2",
        "square centimeter": "cm2",
        "square centimeters": "cm2",
        "cm²": "cm2",

        "ሜትር ካሬ": "m2",
        "square meter": "m2",
        "square meters": "m2",
        "m²": "m2",

        "ቁጥር": "pcs",
        "ቁጥሮች": "pcs",
        "piece": "pcs",
        "pieces": "pcs",
        "pc": "pcs"
    };

    const UNIT_FAMILY_BY_UNIT = {
        ml: "volume",
        l: "volume",
        mg: "weight",
        g: "weight",
        kg: "weight",
        mm: "length",
        cm: "length",
        m: "length",

        mm2: "area",
        cm2: "area",
        m2: "area",

        pcs: "count"
    };

    function normalizeUnit(unit) {
        const raw = String(unit ?? "")
            .trim()
            .toLowerCase();

        if (!raw) return "";

        return UNIT_ALIASES[raw] || raw;
    }

    function getUnitFamily(unit) {
        const normalized = normalizeUnit(unit);
        return UNIT_FAMILY_BY_UNIT[normalized] || null;
    }

    function convert(value, fromUnit, toUnit, category) {
        const amount = toNumber(value, "Value");
        const from = normalizeUnit(fromUnit);
        const to = normalizeUnit(toUnit);
        let type = String(category ?? "")
            .trim()
            .toLowerCase();

        if (!type) {
            type = getUnitFamily(from);
        }

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

    window.yamUnitsConverter = {
        toNumber: toNumber,
        normalizeUnit: normalizeUnit,
        getUnitFamily: getUnitFamily,
        convert: convert,
        UNITS: UNITS
    };

    console.log(
        "✅ Yam Units Converter Browser Bridge loaded"
    );
})();
