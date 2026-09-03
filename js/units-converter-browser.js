"use strict";

(function () {
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

    window.yamUnitsConverter = {
        toNumber: toNumber,
        normalizeUnit: normalizeUnit,
        convert: convert,
        UNITS: UNITS
    };

    console.log(
        "✅ Yam Units Converter Browser Bridge loaded"
    );
})();
