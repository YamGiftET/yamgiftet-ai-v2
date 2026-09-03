(function () {
    "use strict";

    function getCalculatorValue() {
        const calculator =
            window.yamUniversalCalculator || null;

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

        const number =
            Number(String(value).replace(/,/g, ""));

        return Number.isFinite(number)
            ? number
            : null;
    }

    function setPurchaseField(name, value) {
        const form =
            document.getElementById("yamPurchaseForm");

        if (!form) {
            alert(
                "❌ የግዢ መስኮቱ አልተገኘም።"
            );
            return;
        }

        const field = form.elements[name];

        if (!field) {
            alert(
                "❌ የግዢ መስኩ አልተገኘም።"
            );
            return;
        }

        field.value = String(value);

        field.dispatchEvent(
            new Event("input", {
                bubbles: true
            })
        );

        field.dispatchEvent(
            new Event("change", {
                bubbles: true
            })
        );
    }

    document.addEventListener(
        "click",
        function (event) {
            const button =
                event.target.closest(
                    "[data-raw-material-calculator-action]"
                );

            if (!button) {
                return;
            }

            const value = getCalculatorValue();

            if (value === null) {
                alert(
                    "⚠️ ትክክለኛ የCalculator ውጤት የለም። መጀመሪያ ስሌቱን ያጠናቅቁ።"
                );
                return;
            }

            const action =
                button.dataset
                    .rawMaterialCalculatorAction;

            if (action === "quantity") {
                if (value <= 0) {
                    alert(
                        "⚠️ የግዢ ብዛት ከ 0 በላይ መሆን አለበት።"
                    );
                    return;
                }

                setPurchaseField(
                    "quantity",
                    value
                );

                return;
            }

            if (action === "unit-cost") {
                if (value <= 0) {
                    alert(
                        "⚠️ የአንድ እቃ ዋጋ ከ 0 በላይ መሆን አለበት።"
                    );
                    return;
                }

                setPurchaseField(
                    "unitCost",
                    value
                );
            }
        }
    );

    window.yamRawMaterialCalculator = {
        getCalculatorValue: getCalculatorValue
    };

    console.log(
        "✅ Yam Raw Material Calculator Integration loaded"
    );
})();
