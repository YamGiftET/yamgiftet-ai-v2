(function () {
    "use strict";

    const display = document.getElementById("universalCalculatorDisplay");
    if (!display) return;

    const calculator = document.getElementById("universalCalculator");

    let expression = "";
    let current = "0";
    let justCalculated = false;

    const HISTORY_KEY = "yamgiftet_universal_calculator_history";

    // -----------------------------------------
    // Display
    // -----------------------------------------

    let expressionDisplay = document.getElementById(
        "universalCalculatorExpression"
    );

    if (!expressionDisplay) {
        expressionDisplay = document.createElement("div");
        expressionDisplay.id = "universalCalculatorExpression";
        expressionDisplay.className = "universal-calculator-expression";

        display.parentNode.insertBefore(
            expressionDisplay,
            display
        );
    }

    function showExpression() {
        expressionDisplay.textContent =
            expression || " ";
    }

    function showResult(value) {
        display.value = value;
    }

    // -----------------------------------------
    // History
    // -----------------------------------------

    let historyBox = document.getElementById(
        "universalCalculatorHistory"
    );

    if (!historyBox && calculator) {
        historyBox = document.createElement("section");
        historyBox.id = "universalCalculatorHistory";
        historyBox.className = "universal-calculator-history";

        historyBox.innerHTML = `
            <div class="calculator-history-header">
                <h3>📜 የስሌት ታሪክ</h3>
                <button type="button"
                        id="clearCalculatorHistory">
                    ሁሉንም አጥፋ
                </button>
            </div>
            <div id="calculatorHistoryList"></div>
        `;

        calculator.parentNode.insertBefore(
            historyBox,
            calculator.nextSibling
        );
    }

    const historyList = document.getElementById(
        "calculatorHistoryList"
    );

    function getHistory() {
        try {
            const data = JSON.parse(
                localStorage.getItem(HISTORY_KEY) || "[]"
            );

            return Array.isArray(data) ? data : [];
        } catch (error) {
            return [];
        }
    }

    function saveHistoryItem(expressionText, result) {
        if (!expressionText) return;

        const history = getHistory();

        history.unshift({
            expression: expressionText,
            result: String(result),
            createdAt: Date.now()
        });

        // Keep the latest 100 calculations.
        const limitedHistory = history.slice(0, 100);

        localStorage.setItem(
            HISTORY_KEY,
            JSON.stringify(limitedHistory)
        );

        renderHistory();
    }

    function renderHistory() {
        if (!historyList) return;

        const history = getHistory();

        if (!history.length) {
            historyList.innerHTML = `
                <div class="calculator-history-empty">
                    እስካሁን የተቀመጠ ስሌት የለም።
                </div>
            `;
            return;
        }

        historyList.innerHTML = history.map((item, index) => `
            <button type="button"
                    class="calculator-history-item"
                    data-history-index="${index}">
                <span class="calculator-history-expression">
                    ${escapeHtml(item.expression)}
                </span>
                <strong class="calculator-history-result">
                    = ${escapeHtml(item.result)}
                </strong>
            </button>
        `).join("");
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function clearHistory() {
        localStorage.removeItem(HISTORY_KEY);
        renderHistory();
    }

    if (historyList) {
        historyList.addEventListener("click", function (event) {
            const button = event.target.closest(
                "[data-history-index]"
            );

            if (!button) return;

            const index = Number(
                button.dataset.historyIndex
            );

            const history = getHistory();
            const item = history[index];

            if (!item) return;

            expression = item.expression;
            current = item.result;
            justCalculated = true;

            showExpression();
            showResult(current);
        });
    }

    const clearHistoryButton = document.getElementById(
        "clearCalculatorHistory"
    );

    if (clearHistoryButton) {
        clearHistoryButton.addEventListener(
            "click",
            clearHistory
        );
    }

    // -----------------------------------------
    // Calculator helpers
    // -----------------------------------------

    function normalizeNumber(value) {
        const number = Number(value);

        if (!Number.isFinite(number)) {
            throw new Error(
                "ትክክለኛ ቁጥር አስገባ።"
            );
        }

        return Number(number.toFixed(10));
    }

    function formatResult(value) {
        const number = normalizeNumber(value);

        return String(number);
    }

    function tokenize(input) {
        const tokens = [];
        let number = "";

        for (let i = 0; i < input.length; i++) {
            const char = input[i];

            if (
                (char >= "0" && char <= "9") ||
                char === "."
            ) {
                number += char;
                continue;
            }

            if ("+-*/".includes(char)) {
                if (number === "" && char === "-") {
                    number = "-";
                    continue;
                }

                if (number === "" || number === "-") {
                    throw new Error(
                        "የስሌቱ አቀራረብ ትክክል አይደለም።"
                    );
                }

                tokens.push(Number(number));
                tokens.push(char);
                number = "";
                continue;
            }

            if (char === "%") {
                if (number === "" || number === "-") {
                    throw new Error(
                        "የ% አጠቃቀም ትክክል አይደለም።"
                    );
                }

                tokens.push(Number(number) / 100);
                number = "";
                continue;
            }

            if (char === " ") {
                continue;
            }

            throw new Error(
                "የማይታወቅ ምልክት ተገኝቷል።"
            );
        }

        if (number === "" || number === "-") {
            throw new Error(
                "ሙሉ ቁጥር አስገባ።"
            );
        }

        tokens.push(Number(number));

        return tokens;
    }

    function evaluateExpression(input) {
        const tokens = tokenize(input);

        if (!tokens.length) {
            throw new Error(
                "ስሌት አስገባ።"
            );
        }

        // × and ÷ first
        for (let i = 1; i < tokens.length - 1;) {
            const operator = tokens[i];

            if (operator === "*" || operator === "/") {
                const left = tokens[i - 1];
                const right = tokens[i + 1];

                if (operator === "/" && right === 0) {
                    throw new Error(
                        "በዜሮ ማካፈል አይቻልም።"
                    );
                }

                const result =
                    operator === "*"
                        ? left * right
                        : left / right;

                tokens.splice(i - 1, 3, result);
            } else {
                i += 2;
            }
        }

        // + and −
        let result = tokens[0];

        for (let i = 1; i < tokens.length; i += 2) {
            const operator = tokens[i];
            const value = tokens[i + 1];

            if (operator === "+") {
                result += value;
            } else if (operator === "-") {
                result -= value;
            }
        }

        return normalizeNumber(result);
    }

    function updateDisplay() {
        showExpression();
        showResult(current);
    }

    // -----------------------------------------
    // Input
    // -----------------------------------------

    function inputNumber(value) {
        if (justCalculated) {
            expression = "";
            current = "0";
            justCalculated = false;
        }

        if (value === ".") {
            const parts = expression.split(/[+\-*/]/);
            const lastNumber = parts[parts.length - 1];

            if (lastNumber.includes(".")) {
                return;
            }

            if (
                !expression ||
                "+-*/".includes(
                    expression.charAt(expression.length - 1)
                )
            ) {
                expression += "0";
            }
        }

        if (current === "0" && value !== ".") {
            current = value;
        } else if (value === ".") {
            current += value;
        } else {
            current += value;
        }

        expression += value;

        updateDisplay();
    }

    function chooseOperation(operator) {
        justCalculated = false;

        if (!expression) {
            expression = current;
        }

        const last = expression.charAt(
            expression.length - 1
        );

        if ("+-*/".includes(last)) {
            expression =
                expression.slice(0, -1) + operator;
        } else {
            expression += operator;
        }

        current = "0";

        updateDisplay();
    }

    function calculate() {
        if (!expression) return;

        try {
            const result = evaluateExpression(expression);
            const formatted = formatResult(result);

            saveHistoryItem(
                expression,
                formatted
            );

            current = formatted;
            showExpression();
            showResult(formatted);

            justCalculated = true;
        } catch (error) {
            expressionDisplay.textContent =
                expression || " ";

            showResult(error.message);

            current = "0";
            justCalculated = true;
        }
    }

    function clear() {
        expression = "";
        current = "0";
        justCalculated = false;

        updateDisplay();
    }

    function backspace() {
        if (justCalculated) {
            clear();
            return;
        }

        if (!expression) return;

        expression = expression.slice(0, -1);

        const match = expression.match(
            /(?:^|[+\-*/])(-?\d*\.?\d*)$/
        );

        current =
            match && match[1]
                ? match[1]
                : "0";

        if (!current || current === "-") {
            current = "0";
        }

        updateDisplay();
    }

    // -----------------------------------------
    // Buttons
    // -----------------------------------------

    document
        .querySelectorAll("[data-calculator-number]")
        .forEach(function (button) {
            button.addEventListener("click", function () {
                inputNumber(
                    button.dataset.calculatorNumber
                );
            });
        });

    document
        .querySelectorAll("[data-calculator-operation]")
        .forEach(function (button) {
            button.addEventListener("click", function () {
                chooseOperation(
                    button.dataset.calculatorOperation
                );
            });
        });

    const equals = document.querySelector(
        "[data-calculator-equals]"
    );

    if (equals) {
        equals.addEventListener("click", calculate);
    }

    const clearButton = document.querySelector(
        "[data-calculator-clear]"
    );

    if (clearButton) {
        clearButton.addEventListener("click", clear);
    }

    const backspaceButton = document.querySelector(
        "[data-calculator-backspace]"
    );

    if (backspaceButton) {
        backspaceButton.addEventListener(
            "click",
            backspace
        );
    }

    // -----------------------------------------
    // Initial state
    // -----------------------------------------

    renderHistory();
    clear();

})();
