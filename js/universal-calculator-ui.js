(function () {
    "use strict";

    const API =
        "https://yamgiftet-ai-v2-backend.onrender.com/api";

    const display = document.getElementById("universalCalculatorDisplay");
    if (!display) return;

    const calculator = document.getElementById("universalCalculator");

    let expression = "";
    let current = "0";
    let justCalculated = false;
    let lastCalculationValid = false;

    // Edit → Version state
    // null = normal calculation
    // history id = edit this history record as a new version
    let editingHistoryId = null;

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

            <div class="calculator-history-search">
                <input
                    type="search"
                    id="calculatorHistorySearch"
                    placeholder="🔎 ታሪክ ፈልግ..."
                    autocomplete="off"
                    aria-label="የስሌት ታሪክ ፍለጋ"
                >
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

    // -----------------------------------------
    // History V2 — Data Model + Legacy Migration
    // -----------------------------------------

    function createHistoryId() {
        return "calc-" +
            Date.now().toString(36) +
            "-" +
            Math.random().toString(36).slice(2, 10);
    }

    function getEthiopianDate(createdAt) {
        try {
            if (
                typeof gregorianToEthiopian !== "function" ||
                typeof formatEthiopianDate !== "function"
            ) {
                return "";
            }

            const date = new Date(createdAt);

            if (Number.isNaN(date.getTime())) {
                return "";
            }

            const ethiopian = gregorianToEthiopian(date);

            return formatEthiopianDate(
                ethiopian.year,
                ethiopian.month,
                ethiopian.day
            );
        } catch (error) {
            return "";
        }
    }

    function normalizeHistoryItem(item) {
        const source = item && typeof item === "object"
            ? item
            : {};

        const createdAt = Number(source.createdAt) || Date.now();

        return {
            id: source.id || createHistoryId(),

            title: source.title ||
                source.expression ||
                "የCalculator ስሌት",

            expression: String(
                source.expression || ""
            ),

            result: String(
                source.result ?? ""
            ),

            calculationType:
                source.calculationType || "arithmetic",

            inputs:
                source.inputs &&
                typeof source.inputs === "object"
                    ? source.inputs
                    : {},

            cost:
                source.cost ?? null,

            sellingPrice:
                source.sellingPrice ?? null,

            profit:
                source.profit ?? null,

            profitPercent:
                source.profitPercent ?? null,

            orderId:
                source.orderId || null,

            productId:
                source.productId || null,

            versionOf:
                source.versionOf || null,

            version:
                Number(source.version) > 0
                    ? Number(source.version)
                    : 1,

            createdAt,

            updatedAt:
                Number(source.updatedAt) || createdAt,

            ethiopianDate:
                source.ethiopianDate ||
                getEthiopianDate(createdAt)
        };
    }

    function getHistory() {
        try {
            const data = JSON.parse(
                localStorage.getItem(HISTORY_KEY) || "[]"
            );

            if (!Array.isArray(data)) {
            return [];
        }

        return data.map(normalizeHistoryItem);
        } catch (error) {
            return [];
        }
    }

    function saveHistoryItem(expressionText, result) {
        if (!expressionText) return;

        const history = getHistory();

        const createdAt = Date.now();

        history.unshift(
            normalizeHistoryItem({
                id: createHistoryId(),
                title: expressionText,
                expression: expressionText,
                result: String(result),
                calculationType: "arithmetic",
                inputs: {
                    expression: expressionText
                },
                versionOf: null,
                version: 1,
                createdAt,
                updatedAt: createdAt,
                ethiopianDate: getEthiopianDate(createdAt)
            })
        );

        localStorage.setItem(
            HISTORY_KEY,
            JSON.stringify(history)
        );

        renderHistory();
    }

    // -----------------------------------------
    // History Search V2
    // -----------------------------------------

    let historySearchQuery = "";

    function getHistorySearchText(item) {
        const source = item && typeof item === "object"
            ? item
            : {};

        return [
            source.title,
            source.expression,
            source.result,
            source.calculationType,
            source.orderId,
            source.productId,
            source.ethiopianDate,
            source.createdAt,
            source.updatedAt
        ]
            .filter(value => value !== null && value !== undefined)
            .map(value => String(value).toLowerCase())
            .join(" ");
    }

    function filterHistory(history) {
        const query = String(historySearchQuery || "")
            .trim()
            .toLowerCase();

        if (!query) {
            return history;
        }

        return history.filter(item =>
            getHistorySearchText(item).includes(query)
        );
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

        const filteredHistory = filterHistory(history);

        if (!filteredHistory.length) {
            historyList.innerHTML = `
                <div class="calculator-history-empty">
                    🔎 የተፈለገው ስሌት አልተገኘም።
                </div>
            `;
            return;
        }

        historyList.innerHTML = filteredHistory.map((item) => {
            const originalIndex = history.indexOf(item);

            const title = item.title ||
                item.expression ||
                "የCalculator ስሌት";

            const type = item.calculationType ||
                "arithmetic";

            const ethiopianDate = item.ethiopianDate || "";

            const versionText =
                Number(item.version) > 1
                    ? `v${Number(item.version)}`
                    : "";

            const metadata = [];

            if (item.cost !== null && item.cost !== undefined && item.cost !== "") {
                metadata.push(
                    `Cost: ${escapeHtml(item.cost)} ብር`
                );
            }

            if (
                item.sellingPrice !== null &&
                item.sellingPrice !== undefined &&
                item.sellingPrice !== ""
            ) {
                metadata.push(
                    `Selling: ${escapeHtml(item.sellingPrice)} ብር`
                );
            }

            if (
                item.profit !== null &&
                item.profit !== undefined &&
                item.profit !== ""
            ) {
                metadata.push(
                    `Profit: ${escapeHtml(item.profit)} ብር`
                );
            }

            if (
                item.profitPercent !== null &&
                item.profitPercent !== undefined &&
                item.profitPercent !== ""
            ) {
                metadata.push(
                    `Profit %: ${escapeHtml(item.profitPercent)}%`
                );
            }

            if (item.orderId) {
                metadata.push(
                    `Order: ${escapeHtml(item.orderId)}`
                );
            }

            if (item.productId) {
                metadata.push(
                    `Product: ${escapeHtml(item.productId)}`
                );
            }

            return `
                <div class="calculator-history-item"
                     data-history-index="${originalIndex}">

                    <span class="calculator-history-title">
                        ${escapeHtml(title)}
                    </span>

                    <span class="calculator-history-expression">
                        ${escapeHtml(item.expression)}
                    </span>

                    <strong class="calculator-history-result">
                        = ${escapeHtml(item.result)}
                    </strong>

                    <span class="calculator-history-meta">
                        ${escapeHtml(type)}
                        ${ethiopianDate
                            ? ` • ${escapeHtml(ethiopianDate)}`
                            : ""}
                        ${versionText
                            ? ` • ${escapeHtml(versionText)}`
                            : ""}
                    </span>

                    ${
                        metadata.length
                            ? `
                                <span class="calculator-history-finance">
                                    ${metadata.join(" • ")}
                                </span>
                              `
                            : ""
                    }

                    <div class="calculator-history-actions">
                        <button type="button"
                                class="calculator-history-action"
                                data-history-action="edit"
                                data-history-index="${originalIndex}">
                            ✏️ አርትዕ
                        </button>

                        <button type="button"
                                class="calculator-history-action"
                                data-history-action="copy"
                                data-history-index="${originalIndex}">
                            📋 ቅጂ
                        </button>

                        <button type="button"
                                class="calculator-history-action"
                                data-history-action="delete"
                                data-history-index="${originalIndex}">
                            🗑️ ሰርዝ
                        </button>
                    </div>
                </div>
            `;
        }).join("");
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // -----------------------------------------
    // History Search Input
    // -----------------------------------------

    const historySearchInput = document.getElementById(
        "calculatorHistorySearch"
    );

    if (historySearchInput) {
        historySearchInput.addEventListener(
            "input",
            function () {
                historySearchQuery = this.value || "";
                renderHistory();
            }
        );
    }

    function createHistoryVersion(
        item,
        newExpression,
        newResult
    ) {
        if (!item || typeof item !== "object") return null;

        const history = getHistory();
        const createdAt = Date.now();

        const sourceVersion = Number(item.version) > 0
            ? Number(item.version)
            : 1;

        const expressionValue =
            newExpression !== undefined
                ? String(newExpression)
                : String(item.expression || "");

        const resultValue =
            newResult !== undefined
                ? String(newResult)
                : String(item.result ?? "");

        const newItem = normalizeHistoryItem({
            id: createHistoryId(),
            title: item.title || expressionValue || "የCalculator ስሌት",
            expression: expressionValue,
            result: resultValue,
            calculationType: item.calculationType || "arithmetic",
            inputs: {
                ...(item.inputs || {}),
                expression: expressionValue
            },
            cost: item.cost ?? null,
            sellingPrice: item.sellingPrice ?? null,
            profit: item.profit ?? null,
            profitPercent: item.profitPercent ?? null,
            orderId: item.orderId || null,
            productId: item.productId || null,
            versionOf: item.id || null,
            version: sourceVersion + 1,
            createdAt,
            updatedAt: createdAt,
            ethiopianDate: getEthiopianDate(createdAt)
        });

        history.unshift(newItem);

        localStorage.setItem(
            HISTORY_KEY,
            JSON.stringify(history)
        );

        renderHistory();

        return newItem;
    }

    async function deleteHistoryItem(index) {
        const history = getHistory();
        const item = history[index];

        if (!item) return;

        const title =
            item.title ||
            item.expression ||
            "Calculator History";

        if (!confirm(
            "🗑️ ይህን የCalculator History መረጃ ወደ Universal Trash ለመውሰድ ይፈልጋሉ?\\n\\n" +
            title +
            "\\n\\n" +
            "መረጃው በቀጥታ አይጠፋም፤ Universal Trash ውስጥ ይቀመጣል።"
        )) {
            return;
        }

        try {
            const response = await fetch(
                `${API}/universal-trash/calculator-history`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({
                        item
                    })
                }
            );

            const data = await response.json();

            if (!response.ok || data.success === false) {
                throw new Error(
                    data.error ||
                    "Calculator History ወደ Universal Trash መውሰድ አልተቻለም።"
                );
            }

            const latestHistory = getHistory();

            const removeIndex = latestHistory.findIndex(
                historyItem => historyItem.id === item.id
            );

            if (removeIndex !== -1) {
                latestHistory.splice(removeIndex, 1);

                localStorage.setItem(
                    HISTORY_KEY,
                    JSON.stringify(latestHistory)
                );
            }

            editingHistoryId = null;

            renderHistory();

            alert(
                "🗑️ Calculator History ወደ Universal Trash ተወስዷል።"
            );

        } catch (error) {
            console.error(
                "Calculator History Delete Error:",
                error
            );

            alert(
                "❌ Calculator History መሰረዝ አልተቻለም።\\n\\n" +
                (error.message || error)
            );
        }
    }

    function clearHistory() {
        localStorage.removeItem(HISTORY_KEY);
        renderHistory();
    }

    if (historyList) {
        historyList.addEventListener("click", function (event) {
            const actionElement = event.target.closest(
                "[data-history-action]"
            );

            const card = event.target.closest(
                "[data-history-index]"
            );

            if (!card) return;

            const index = Number(
                card.dataset.historyIndex
            );

            const history = getHistory();
            const item = history[index];

            if (!item) return;

            if (actionElement) {
                const action =
                    actionElement.dataset.historyAction;

                expression = String(
                    item.expression || ""
                );

                if (action === "edit") {
                    editingHistoryId = item.id || null;
                    current = String(
                        item.result ?? "0"
                    );
                    justCalculated = false;

                    updateDisplay();
                    return;
                }

                if (action === "copy") {
                    editingHistoryId = null;
                    current = String(
                        item.result ?? "0"
                    );
                    justCalculated = false;

                    updateDisplay();
                    return;
                }

                if (action === "delete") {
                    deleteHistoryItem(index);
                    return;
                }

                return;
            }

            editingHistoryId = null;
            expression = String(
                item.expression || ""
            );
            current = String(
                item.result ?? "0"
            );
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

        // ⚡ Live Result
        if (expression) {
            try {
                const last = expression.charAt(expression.length - 1);

                // እንደ "12 +" ያለ incomplete expression አንስላም።
                if ("+-*/".includes(last)) {
                    showResult(current);
                    return;
                }

                const liveResult = evaluateExpression(expression);
                showResult(formatResult(liveResult));
            } catch (error) {
                showResult(current);
            }

            return;
        }

        showResult(current);
    }

    // -----------------------------------------
    // Input
    // -----------------------------------------

    function inputNumber(value) {
        lastCalculationValid = false;

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
        lastCalculationValid = false;
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

            if (editingHistoryId) {
                const history = getHistory();

                const sourceItem = history.find(
                    item => item.id === editingHistoryId
                );

                if (sourceItem) {
                    createHistoryVersion(
                        sourceItem,
                        expression,
                        formatted
                    );
                } else {
                    saveHistoryItem(
                        expression,
                        formatted
                    );
                }

                editingHistoryId = null;
            } else {
                saveHistoryItem(
                    expression,
                    formatted
                );
            }

            current = formatted;
            showExpression();
            showResult(formatted);

            justCalculated = true;
            lastCalculationValid = true;
        } catch (error) {
            expressionDisplay.textContent =
                expression || " ";

            showResult(error.message);

            current = "0";
            justCalculated = true;
            lastCalculationValid = false;
        }
    }

    function clear() {
        expression = "";
        current = "0";
        justCalculated = false;
        lastCalculationValid = false;

        updateDisplay();
    }

    function backspace() {
        lastCalculationValid = false;

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
    // Public Integration API
    // -----------------------------------------
    window.yamUniversalCalculator = {
        getCurrentValue: function () {
            return current;
        },

        getExpression: function () {
            return expression;
        },

        getLastResult: function () {
            return lastCalculationValid ? current : null;
        }
    };

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
