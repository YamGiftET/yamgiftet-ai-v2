"use strict";

(function () {
    const bridge = window.yamCostProfitCalculator;

    if (!bridge) {
        console.error(
            "❌ Yam Cost & Profit Browser Bridge አልተገኘም።"
        );
        return;
    }

    function getValue(id) {
        const element = document.getElementById(id);

        if (!element) {
            return 0;
        }

        return element.value;
    }

    function setText(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    }

    function formatNumber(value) {
        const number = Number(value);

        if (!Number.isFinite(number)) {
            return "0";
        }

        return number.toLocaleString("en-US", {
            maximumFractionDigits: 2
        });
    }

    function calculate() {
        const errorElement =
            document.getElementById("costProfitError");

        if (errorElement) {
            errorElement.textContent = "";
        }

        try {
            const result = bridge.calculateCostProfit({
                quantity: getValue("costProfitQuantity"),
                materialUnitCost:
                    getValue("costProfitMaterialUnitCost"),
                workCost: getValue("costProfitWorkCost"),
                otherCost: getValue("costProfitOtherCost"),
                sellingPrice: getValue("costProfitSellingPrice")
            });

            setText(
                "costProfitResultMaterialCost",
                formatNumber(result.materialCost)
            );

            setText(
                "costProfitResultTotalCost",
                formatNumber(result.totalCost)
            );

            setText(
                "costProfitResultSellingPrice",
                formatNumber(result.sellingPrice)
            );

            setText(
                "costProfitResultProfit",
                formatNumber(result.profit)
            );

            setText(
                "costProfitResultProfitPercent",
                `${formatNumber(result.profitPercent)}%`
            );

            setText(
                "costProfitResultMarginPercent",
                `${formatNumber(result.marginPercent)}%`
            );

            const resultBox =
                document.getElementById("costProfitResult");

            if (resultBox) {
                resultBox.hidden = false;
            }

            window.yamCostProfitUI = {
                getLastResult: function () {
                    return result;
                }
            };

            return result;
        } catch (error) {
            const resultBox =
                document.getElementById("costProfitResult");

            if (resultBox) {
                resultBox.hidden = true;
            }

            if (errorElement) {
                errorElement.textContent =
                    error.message ||
                    "የCost & Profit ስሌት አልተሳካም።";
            }

            window.yamCostProfitUI = {
                getLastResult: function () {
                    return null;
                }
            };

            return null;
        }
    }

    function bind() {
        document.addEventListener("click", function (event) {
            const button =
                event.target.closest("#costProfitCalculateButton");

            if (!button) {
                return;
            }

            event.preventDefault();
            calculate();
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bind);
    } else {
        bind();
    }

    console.log(
        "✅ Yam Cost & Profit UI Controller loaded"
    );
})();
