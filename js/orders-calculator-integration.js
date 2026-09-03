"use strict";

(function () {
    const buttons = document.querySelectorAll(
        "[data-order-calculator-target]"
    );

    if (!buttons.length) {
        return;
    }

    const targetMap = {
        total: "orderTotalAmount",
        deposit: "orderDeposit",
        workCost: "orderWorkCost"
    };

    buttons.forEach(function (button) {
        button.addEventListener("click", function () {
            const calculator =
                window.yamUniversalCalculator;

            if (
                !calculator ||
                typeof calculator.getLastResult !== "function"
            ) {
                alert(
                    "🧮 Calculator አልተገኘም።"
                );
                return;
            }

            const result =
                calculator.getLastResult();

            if (result === null) {
                alert(
                    "⚠️ ትክክለኛ የCalculator ውጤት የለም። መጀመሪያ ስሌቱን ያጠናቅቁ።"
                );
                return;
            }

            const target =
                targetMap[
                    button.dataset.orderCalculatorTarget
                ];

            if (!target) {
                return;
            }

            const input =
                document.getElementById(target);

            if (!input) {
                alert(
                    "❌ የOrder መስኮቱ አልተገኘም።"
                );
                return;
            }

            const numericResult = Number(result);

            if (!Number.isFinite(numericResult)) {
                alert(
                    "⚠️ Calculator ውጤቱ ትክክለኛ ቁጥር አይደለም።"
                );
                return;
            }

            input.value = String(numericResult);

            input.dispatchEvent(
                new Event("input", {
                    bubbles: true
                })
            );
        });
    });
})();
