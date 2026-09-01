"use strict";

/*
 * YamGiftET AI v2
 * Universal Calculator Engine
 *
 * Shared arithmetic engine for:
 * + Addition
 * - Subtraction
 * * Multiplication
 * / Division
 * % Percentage
 *
 * Finance modules should use this engine for controlled calculations.
 */

function toNumber(value, field = "value") {
    const n = Number(value);

    if (!Number.isFinite(n)) {
        throw new Error(`${field} ትክክለኛ ቁጥር መሆን አለበት።`);
    }

    return n;
}

function add(a, b) {
    return toNumber(a, "A") + toNumber(b, "B");
}

function subtract(a, b) {
    return toNumber(a, "A") - toNumber(b, "B");
}

function multiply(a, b) {
    return toNumber(a, "A") * toNumber(b, "B");
}

function divide(a, b) {
    const divisor = toNumber(b, "B");

    if (divisor === 0) {
        throw new Error("በዜሮ ማካፈል አይቻልም።");
    }

    return toNumber(a, "A") / divisor;
}

function percentage(value, percent) {
    return (
        toNumber(value, "Value") *
        toNumber(percent, "Percent")
    ) / 100;
}

function calculate(operation, a, b) {
    switch (String(operation).trim()) {
        case "+":
        case "add":
            return add(a, b);

        case "-":
        case "subtract":
            return subtract(a, b);

        case "*":
        case "multiply":
            return multiply(a, b);

        case "/":
        case "divide":
            return divide(a, b);

        case "%":
        case "percentage":
            return percentage(a, b);

        default:
            throw new Error(`የማይታወቅ የስሌት አይነት፦ ${operation}`);
    }
}

module.exports = {
    toNumber,
    add,
    subtract,
    multiply,
    divide,
    percentage,
    calculate
};
