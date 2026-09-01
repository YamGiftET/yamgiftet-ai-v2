const calculator = require("./universal-calculator");

/* =========================================================
   YAMGIFTET AI v2 — UNIVERSAL FINANCE
   CALCULATION CONTROL & ERROR DETECTION
   🇪🇹 Ethiopian Finance Standard
   ========================================================= */

function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function checkEqual(name, actual, expected, details = {}) {
    const a = toNumber(actual);
    const e = toNumber(expected);

    if (Math.abs(a - e) < 0.01) {
        return {
            status: "passed",
            severity: "info",
            calculation: name,
            actual: a,
            expected: e,
            ...details
        };
    }

    return {
        status: "error",
        severity: "error",
        calculation: name,
        actual: a,
        expected: e,
        difference: a - e,
        ...details
    };
}

function checkNonNegative(name, value, details = {}) {
    const amount = toNumber(value);

    if (amount >= 0) {
        return {
            status: "passed",
            severity: "info",
            calculation: name,
            actual: amount,
            ...details
        };
    }

    return {
        status: "error",
        severity: "error",
        calculation: name,
        actual: amount,
        location: details.location || name,
        problem: "የፋይናንስ መጠን ከዜሮ በታች ነው።",
        cause: "የተሳሳተ የገንዘብ መረጃ ወይም ስሌት ሊኖር ይችላል።",
        solution: "የዚህን መረጃ ምንጭ እና የስሌት ሂደቱን ይመርምሩ።",
        ...details
    };
}

function validateSummary(finance = {}) {
    const results = [];

    const sales = toNumber(finance.sales);
    const expenses = finance.expenses || {};
    const totalExpenses = toNumber(expenses.total);
    const reportedProfit = toNumber(finance.profit?.net);
    const reportedMargin = toNumber(finance.profit?.margin);
    const reportedCashFlow = toNumber(finance.cashFlow);
    const received = toNumber(finance.received);
    const receivable = toNumber(finance.receivable);

    const calculatedProfit =
        calculator.subtract(sales, totalExpenses);

    const calculatedMargin =
        sales > 0
            ? calculator.multiply(
                calculator.divide(calculatedProfit, sales),
                100
            )
            : 0;

    const calculatedCashFlow =
        calculator.subtract(received, totalExpenses);

    results.push(
        checkEqual(
            "ጠቅላላ ትርፍ",
            reportedProfit,
            calculatedProfit,
            {
                location: "Finance → Profit → Net Profit",
                problem: "የተዘገበው ትርፍ ከገቢ − ወጪ ጋር አይጣጣምም።",
                cause: "የገቢ ወይም የወጪ ስሌት ሊደገም/ሊጎድል ይችላል።",
                solution: "Sales እና Total Expenses ምንጮችን ይመርምሩ።"
            }
        )
    );

    results.push(
        checkEqual(
            "የትርፍ መጠን",
            reportedMargin,
            calculatedMargin,
            {
                location: "Finance → Profit → Profit Margin",
                problem: "የትርፍ መቶኛ ከNet Profit / Sales ጋር አይጣጣምም።",
                cause: "Profit Margin ስሌት ላይ ስህተት ሊኖር ይችላል።",
                solution: "Net Profit እና Sales በመጠቀም Margin እንደገና ያረጋግጡ።"
            }
        )
    );

    results.push(
        checkEqual(
            "Cash Flow",
            reportedCashFlow,
            calculatedCashFlow,
            {
                location: "Finance → Cash Flow",
                problem: "Cash Flow ከReceived − Total Expenses ጋር አይጣጣምም።",
                cause: "Payment ወይም Expense በስሌቱ ውስጥ ሊጎድል/ሊደገም ይችላል።",
                solution: "Received Payments እና Expenses ምንጮችን ይፈትሹ።"
            }
        )
    );

    results.push(
        checkNonNegative(
            "Sales",
            sales,
            { location: "Finance → Sales" }
        )
    );

    results.push(
        checkNonNegative(
            "Total Expenses",
            totalExpenses,
            { location: "Finance → Expenses → Total" }
        )
    );

    results.push(
        checkNonNegative(
            "Receivables",
            receivable,
            { location: "Finance → Receivables" }
        )
    );

    const errors = results.filter(r => r.status === "error");

    return {
        success: errors.length === 0,
        status: errors.length === 0 ? "passed" : "error",
        totalChecks: results.length,
        passed: results.filter(r => r.status === "passed").length,
        errors: errors.length,
        warnings: results.filter(r => r.severity === "warning").length,
        results
    };
}

/* Future Module Integration Hook */
function registerFinanceSource(name, validator) {
    if (!name || typeof validator !== "function") {
        throw new Error("Finance Integration Hook መረጃው ትክክል አይደለም።");
    }

    return {
        name,
        validator,
        registered: true
    };
}

module.exports = {
    toNumber,
    checkEqual,
    checkNonNegative,
    validateSummary,
    registerFinanceSource
};
