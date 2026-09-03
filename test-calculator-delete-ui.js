"use strict";

const fs = require("fs");
const vm = require("vm");

console.log("===== 🗑️ CALCULATOR DELETE UI TEST =====");

const source = fs.readFileSync(
    "js/universal-calculator-ui.js",
    "utf8"
);

const listeners = {};
const elements = {};

function createElement(id) {
    return {
        id,
        value: "",
        textContent: "",
        innerHTML: "",
        className: "",
        parentNode: {
            insertBefore() {}
        },
        dataset: {},
        addEventListener(type, handler) {
            listeners[`${id}:${type}`] = handler;
        },
        querySelector() {
            return null;
        },
        querySelectorAll() {
            return [];
        }
    };
}

elements.universalCalculatorDisplay =
    createElement("universalCalculatorDisplay");

elements.universalCalculator =
    createElement("universalCalculator");

elements.universalCalculatorExpression =
    createElement("universalCalculatorExpression");

elements.universalCalculatorHistory =
    createElement("universalCalculatorHistory");

elements.calculatorHistoryList =
    createElement("calculatorHistoryList");

const documentMock = {
    getElementById(id) {
        return elements[id] || null;
    },

    createElement(tag) {
        return createElement(tag);
    },

    querySelector() {
        return null;
    },

    querySelectorAll() {
        return [];
    }
};

const storage = {};

const localStorageMock = {
    getItem(key) {
        return Object.prototype.hasOwnProperty.call(storage, key)
            ? storage[key]
            : null;
    },

    setItem(key, value) {
        storage[key] = String(value);
    },

    removeItem(key) {
        delete storage[key];
    }
};

let fetchMode = "success";
let fetchCalls = [];

async function fetchMock(url, options) {
    fetchCalls.push({
        url,
        options
    });

    if (fetchMode === "failure") {
        return {
            ok: false,
            async json() {
                return {
                    success: false,
                    error: "TEST API FAILURE"
                };
            }
        };
    }

    return {
        ok: true,
        async json() {
            return {
                success: true,
                trashId: "test-trash-id"
            };
        }
    };
}

const context = {
    document: documentMock,
    localStorage: localStorageMock,
    fetch: fetchMock,

    confirm() {
        return true;
    },

    alert(message) {
        console.log("ALERT:", message);
    },

    console,

    Date,
    Math,
    JSON,
    Number,
    String,
    Boolean,
    Object,
    Array,
    Error,
    RegExp,
    parseInt,
    parseFloat,

    gregorianToEthiopian() {
        return {
            year: 2018,
            month: 13,
            day: 1
        };
    },

    formatEthiopianDate(year, month, day) {
        return `${day}/${month}/${year}`;
    }
};

vm.createContext(context);

vm.runInContext(source, context);

console.log("✅ UI script loaded");
console.log("===== TEST HARNESS CREATED =====");
console.log("Next: run the test file");

console.log("===== DELETE TEST SETUP =====");

const HISTORY_KEY =
    "yamgiftet_universal_calculator_history";

const testItem = {
    id: "calc-delete-test-001",
    title: "Delete Test Calculation",
    expression: "100+50",
    result: "150",
    calculationType: "arithmetic",
    inputs: {
        expression: "100+50"
    },
    version: 1,
    versionOf: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ethiopianDate: "1/13/2018"
};

localStorageMock.setItem(
    HISTORY_KEY,
    JSON.stringify([testItem])
);

console.log("✅ Test history record inserted");

const clickHandler =
    listeners["calculatorHistoryList:click"];

if (typeof clickHandler !== "function") {
    throw new Error(
        "❌ History click handler was not registered"
    );
}

console.log("✅ History click handler found");

function makeEvent() {
    const actionElement = {
        dataset: {
            historyAction: "delete"
        }
    };

    const card = {
        dataset: {
            historyIndex: "0"
        }
    };

    return {
        target: {
            closest(selector) {
                if (
                    selector ===
                    "[data-history-action]"
                ) {
                    return actionElement;
                }

                if (
                    selector ===
                    "[data-history-index]"
                ) {
                    return card;
                }

                return null;
            }
        }
    };
}

(async () => {
    console.log("===== API SUCCESS TEST =====");

    fetchMode = "success";
    fetchCalls = [];

    clickHandler(makeEvent());

    await new Promise(resolve =>
        setTimeout(resolve, 50)
    );

    const successHistory =
        JSON.parse(
            localStorageMock.getItem(HISTORY_KEY) ||
            "[]"
        );

    if (fetchCalls.length !== 1) {
        throw new Error(
            "❌ API was not called exactly once"
        );
    }

    if (
        fetchCalls[0].url !==
        "https://yamgiftet-ai-v2-backend.onrender.com/api/universal-trash/calculator-history"
    ) {
        throw new Error(
            "❌ Wrong Calculator Trash API URL"
        );
    }

    if (
        fetchCalls[0].options.method !==
        "POST"
    ) {
        throw new Error(
            "❌ Calculator Trash API method is not POST"
        );
    }

    if (successHistory.length !== 0) {
        throw new Error(
            "❌ History record was not removed after API success"
        );
    }

    console.log(
        "✅ API success → History removed"
    );

    console.log("===== API FAILURE TEST =====");

    localStorageMock.setItem(
        HISTORY_KEY,
        JSON.stringify([testItem])
    );

    fetchMode = "failure";
    fetchCalls = [];

    clickHandler(makeEvent());

    await new Promise(resolve =>
        setTimeout(resolve, 50)
    );

    const failureHistory =
        JSON.parse(
            localStorageMock.getItem(HISTORY_KEY) ||
            "[]"
        );

    if (failureHistory.length !== 1) {
        throw new Error(
            "❌ History was removed even though API failed"
        );
    }

    console.log(
        "✅ API failure → History preserved"
    );

    console.log(
        "🎉 CALCULATOR DELETE UI TEST PASSED"
    );
})();
