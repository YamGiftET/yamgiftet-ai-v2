"use strict";

(function () {
    const ACTION_SELECTOR =
        "[data-business-health-calculator-action]";

    function getCalculator() {
        return window.yamUniversalCalculator || null;
    }

    function getCalculatorValue() {
        const calculator = getCalculator();

        if (
            !calculator ||
            typeof calculator.getLastResult !== "function"
        ) {
            return null;
        }

        const value = calculator.getLastResult();

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return null;
        }

        const number = Number(
            String(value).replace(/,/g, "")
        );

        return Number.isFinite(number) ? number : null;
    }

    function addAnalysisResult(value) {
        const advice =
            document.getElementById(
                "businessHealthAdvice"
            );

        if (!advice) {
            return false;
        }

        const item =
            document.createElement("div");

        item.className =
            "management-advice-item";

        const span =
            document.createElement("span");

        span.textContent = "🧮";

        const paragraph =
            document.createElement("p");

        paragraph.textContent =
            `Calculator ውጤት፦ ${value}`;

        item.appendChild(span);
        item.appendChild(paragraph);

        advice.appendChild(item);

        return true;
    }

    function handleAction(action) {
        if (action !== "analysis") {
            return;
        }

        const value = getCalculatorValue();

        if (value === null) {
            alert(
                "⚠️ ትክክለኛ የCalculator ውጤት የለም። መጀመሪያ ስሌቱን ያጠናቅቁ።"
            );
            return;
        }

        if (addAnalysisResult(value)) {
            console.log(
                "✅ Calculator result → Business Health Analysis"
            );
        } else {
            alert(
                "❌ የBusiness Health ትንተና ክፍል አልተገኘም።"
            );
        }
    }

    document
        .querySelectorAll(ACTION_SELECTOR)
        .forEach(function (button) {
            button.addEventListener(
                "click",
                function () {
                    handleAction(
                        button.dataset
                            .businessHealthCalculatorAction
                    );
                }
            );
        });

    window.yamBusinessHealthCalculator = {
        getCalculatorValue:
            getCalculatorValue,
        addAnalysisResult:
            addAnalysisResult
    };

    console.log(
        "✅ Yam Business Health Calculator Integration loaded"
    );
})();
