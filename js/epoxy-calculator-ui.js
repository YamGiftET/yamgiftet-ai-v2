"use strict";

/*
 * YamGiftET AI v2
 * Browser-safe Epoxy Calculator UI
 *
 * UI layer only.
 * The CommonJS epoxy-calculator-engine.js remains untouched.
 */

(function () {
    const calculator = document.getElementById("epoxyCalculator");
    if (!calculator) return;

    const shape = document.getElementById("epoxyShape");
    const length = document.getElementById("epoxyLength");
    const width = document.getElementById("epoxyWidth");
    const diameter = document.getElementById("epoxyDiameter");
    const base = document.getElementById("epoxyBase");
    const height = document.getElementById("epoxyHeight");
    const thickness = document.getElementById("epoxyThickness");
    const wastePercent = document.getElementById("epoxyWastePercent");
    const resinRatio = document.getElementById("epoxyResinRatio");
    const hardenerRatio = document.getElementById("epoxyHardenerRatio");

    const resultArea = document.getElementById("epoxyResultArea");
    const resultVolume = document.getElementById("epoxyResultVolume");
    const resultTotal = document.getElementById("epoxyResultTotal");
    const resultResin = document.getElementById("epoxyResultResin");
    const resultHardener = document.getElementById("epoxyResultHardener");
    const errorBox = document.getElementById("epoxyCalculatorError");

    function number(value, field) {
        const n = Number(value);

        if (!Number.isFinite(n)) {
            throw new Error(`${field} ትክክለኛ ቁጥር መሆን አለበት።`);
        }

        return n;
    }

    function rectangleArea(l, w) {
        return number(l, "Length") * number(w, "Width");
    }

    function squareArea(side) {
        const s = number(side, "Side");
        return s * s;
    }

    function circleArea(d) {
        const diameterValue = number(d, "Diameter");

        if (diameterValue <= 0) {
            throw new Error("Diameter ከዜሮ በላይ መሆን አለበት።");
        }

        const radius = diameterValue / 2;
        return Math.PI * radius * radius;
    }

    function ovalArea(l, w) {
        return Math.PI * (number(l, "Length") / 2) * (number(w, "Width") / 2);
    }

    function triangleArea(b, h) {
        return (number(b, "Base") * number(h, "Height")) / 2;
    }

    function calculate() {
        const selectedShape = String(shape.value).toLowerCase();

        const l = length.value;
        const w = width.value;
        const d = diameter.value;
        const b = base.value;
        const h = height.value;
        const t = number(thickness.value, "Thickness");
        const waste = number(wastePercent.value || 0, "Waste");
        const resin = number(resinRatio.value || 1, "Resin ratio");
        const hardener = number(hardenerRatio.value || 1, "Hardener ratio");

        if (t <= 0) {
            throw new Error("Thickness ከዜሮ በላይ መሆን አለበት።");
        }

        if (waste < 0) {
            throw new Error("Waste % አሉታዊ መሆን አይችልም።");
        }

        if (resin <= 0 || hardener <= 0) {
            throw new Error("Resin እና Hardener ratio ከዜሮ በላይ መሆን አለባቸው።");
        }

        let area;

        switch (selectedShape) {
            case "rectangle":
                area = rectangleArea(l, w);
                break;

            case "square":
                area = squareArea(l);
                break;

            case "circle":
                area = circleArea(d);
                break;

            case "oval":
                area = ovalArea(l, w);
                break;

            case "triangle":
                area = triangleArea(b, h);
                break;

            default:
                throw new Error("የEpoxy ቅርጽ ይምረጡ።");
        }

        const volume = area * t;
        const total = volume * (1 + waste / 100);
        const ratioTotal = resin + hardener;

        resultArea.textContent = area.toFixed(2);
        resultVolume.textContent = volume.toFixed(2);
        resultTotal.textContent = total.toFixed(2);
        resultResin.textContent = (total * resin / ratioTotal).toFixed(2);
        resultHardener.textContent = (total * hardener / ratioTotal).toFixed(2);

        errorBox.textContent = "";
        errorBox.hidden = true;
    }

    function safeCalculate() {
        try {
            calculate();
        } catch (error) {
            errorBox.textContent = error.message;
            errorBox.hidden = false;
        }
    }

    calculator.querySelectorAll("input, select").forEach((field) => {
        field.addEventListener("input", safeCalculate);
        field.addEventListener("change", safeCalculate);
    });

    const button = document.getElementById("epoxyCalculateButton");

    if (button) {
        button.addEventListener("click", safeCalculate);
    }

    shape.addEventListener("change", function () {
        const selected = String(shape.value).toLowerCase();

        const fields = {
            rectangle: ["length", "width"],
            square: ["length"],
            circle: ["diameter"],
            oval: ["length", "width"],
            triangle: ["base", "height"]
        };

        const active = fields[selected] || [];

        [
            ["epoxyLength", length],
            ["epoxyWidth", width],
            ["epoxyDiameter", diameter],
            ["epoxyBase", base],
            ["epoxyHeight", height]
        ].forEach(([id, field]) => {
            const wrapper = field.closest(".epoxy-field");
            if (wrapper) {
                wrapper.hidden = !active.includes(id.replace("epoxy", "").toLowerCase());
            }
        });

        // በመጀመሪያ ጊዜ የቅርጽ መስኮቶችን ብቻ አሳይ/ደብቅ።
        // ተጠቃሚው እስካሁን ውሂብ አላስገባም፣ ስለዚህ Error አናሳይም።
        if (document.readyState !== "loading") {
            safeCalculate();
        }
    });

    shape.dispatchEvent(new Event("change"));
})();
