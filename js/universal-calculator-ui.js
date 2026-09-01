(function () {
    "use strict";

    const display = document.getElementById("universalCalculatorDisplay");
    if (!display) return;

    let current = "0";
    let previous = null;
    let operation = null;
    let resetNext = false;

function calculateWithCore(a, op, b) {
    const x = Number(a);
    const y = Number(b);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
        throw new Error("ትክክለኛ ቁጥር አስገባ።");
    }

    switch (op) {
        case "+":
            return x + y;
        case "-":
            return x - y;
        case "*":
            return x * y;
        case "/":
            if (y === 0) throw new Error("በዜሮ ማካፈል አይቻልም።");
            return x / y;
        case "%":
            return (x * y) / 100;
        default:
            throw new Error("የማይታወቅ የስሌት አይነት።");
    }
}

    function show(value) {
        display.value = value;
    }

    function inputNumber(value) {
        if (resetNext) {
            current = value;
            resetNext = false;
        } else if (current === "0") {
            current = value;
        } else {
            current += value;
        }
        show(current);
    }

    function clear() {
        current = "0";
        previous = null;
        operation = null;
        resetNext = false;
        show(current);
    }

    function backspace() {
        if (resetNext) return;
        current = current.length > 1 ? current.slice(0, -1) : "0";
        show(current);
    }

    function chooseOperation(op) {
        if (operation && !resetNext) calculate();

        previous = Number(current);
        operation = op;
        resetNext = true;
    }

    function calculate() {
        if (operation === null || previous === null) return;

        const a = previous;
        const b = Number(current);

        let result;

        try {
            result = calculateWithCore(a, operation, b);

            current = String(Number(result.toFixed(10)));
            show(current);
            previous = null;
            operation = null;
            resetNext = true;
        } catch (error) {
            show(error.message);
            current = "0";
            previous = null;
            operation = null;
            resetNext = true;
        }
    }

    document.querySelectorAll("[data-calculator-number]").forEach(button => {
        button.addEventListener("click", () => {
            inputNumber(button.dataset.calculatorNumber);
        });
    });

    document.querySelectorAll("[data-calculator-operation]").forEach(button => {
        button.addEventListener("click", () => {
            chooseOperation(button.dataset.calculatorOperation);
        });
    });

    const equals = document.querySelector("[data-calculator-equals]");
    if (equals) equals.addEventListener("click", calculate);

    const clearButton = document.querySelector("[data-calculator-clear]");
    if (clearButton) clearButton.addEventListener("click", clear);

    const backspaceButton = document.querySelector("[data-calculator-backspace]");
    if (backspaceButton) backspaceButton.addEventListener("click", backspace);

    clear();
})();
