"use strict";

(function () {
    function getLastCostProfitResult() {
        const calculator = window.yamCostProfitUI;

        if (
            !calculator ||
            typeof calculator.getLastResult !== "function"
        ) {
            alert(
                "💰 Cost & Profit ካልኩሌተሩ አልተገኘም።"
            );
            return null;
        }

        const result = calculator.getLastResult();

        if (!result) {
            alert(
                "⚠️ ትክክለኛ Cost & Profit ውጤት የለም። መጀመሪያ ስሌቱን ያጠናቅቁ።"
            );
            return null;
        }

        return result;
    }

    function setInputValue(id, value) {
        const input = document.getElementById(id);

        if (!input) {
            alert(
                "❌ የOrder መስኮቱ አልተገኘም።"
            );
            return false;
        }

        const number = Number(value);

        if (!Number.isFinite(number)) {
            alert(
                "⚠️ Cost & Profit ውጤቱ ትክክለኛ ቁጥር አይደለም።"
            );
            return false;
        }

        input.value = String(number);

        input.dispatchEvent(
            new Event("input", {
                bubbles: true
            })
        );

        input.dispatchEvent(
            new Event("change", {
                bubbles: true
            })
        );

        return true;
    }

    function sendToOrder() {
        const result = getLastCostProfitResult();

        if (!result) {
            return;
        }

        const sellingPrice = Number(result.sellingPrice);
        const workCost = Number(result.workCost);

        if (
            !Number.isFinite(sellingPrice) ||
            !Number.isFinite(workCost)
        ) {
            alert(
                "⚠️ Cost & Profit ውጤቱ ትክክለኛ አይደለም።"
            );
            return;
        }

        const totalUpdated = setInputValue(
            "orderTotalAmount",
            sellingPrice
        );

        if (!totalUpdated) {
            return;
        }

        const workCostUpdated = setInputValue(
            "orderWorkCost",
            workCost
        );

        if (!workCostUpdated) {
            return;
        }

        if (typeof window.calculateOrderAmounts === "function") {
            window.calculateOrderAmounts();
        }

        alert(
            "✅ Cost & Profit ውጤት ወደ Order ተላከ።\n\n" +
            "• መሸጫ ዋጋ → Total Amount\n" +
            "• የሥራ ወጪ → Work Cost\n\n" +
            "አሁን Order መረጃውን ይመልከቱና Save ያድርጉ።"
        );
    }

    function bind() {
        const button = document.querySelector(
            '[data-cost-profit-destination="order"]'
        );

        if (!button) {
            return;
        }

        button.addEventListener(
            "click",
            sendToOrder
        );

        console.log(
            "✅ Cost & Profit → Orders Integration loaded"
        );
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            bind
        );
    } else {
        bind();
    }

    window.yamCostProfitOrdersIntegration = {
        sendToOrder
    };
})();
