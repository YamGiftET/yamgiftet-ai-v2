"use strict";

(function () {
    function sendToSelfProduct() {
        if (
            !window.yamCostProfitUI ||
            typeof window.yamCostProfitUI.getLastResult !== "function"
        ) {
            alert("❌ Cost & Profit ውጤት አልተገኘም።");
            return false;
        }

        const result =
            window.yamCostProfitUI.getLastResult();

        if (!result) {
            alert("❌ መጀመሪያ Cost & Profit ስሌት ያስሉ።");
            return false;
        }

        const sellingPrice = Number(result.sellingPrice);
        const quantity = Number(result.quantity);
        const totalCost = Number(result.totalCost);

        if (
            !Number.isFinite(sellingPrice) ||
            !Number.isFinite(quantity) ||
            !Number.isFinite(totalCost) ||
            quantity <= 0
        ) {
            alert("❌ የCost & Profit ውጤቱ ትክክል አይደለም።");
            return false;
        }

        const sellPriceInput =
            document.getElementById("productSellPrice");

        const unitCostInput =
            document.getElementById("productUnitCost");

        if (!sellPriceInput || !unitCostInput) {
            alert(
                "❌ Self Product የመሸጫ ዋጋ ወይም የምርት ወጪ መስክ አልተገኘም።"
            );
            return false;
        }

        const unitCost = totalCost / quantity;

        sellPriceInput.value = String(sellingPrice);
        unitCostInput.value = String(unitCost);

        sellPriceInput.dispatchEvent(
            new Event("input", { bubbles: true })
        );

        sellPriceInput.dispatchEvent(
            new Event("change", { bubbles: true })
        );

        unitCostInput.dispatchEvent(
            new Event("input", { bubbles: true })
        );

        unitCostInput.dispatchEvent(
            new Event("change", { bubbles: true })
        );

        alert(
            "✅ Cost & Profit ውጤቱ ወደ Self Product ገብቷል።\n\n" +
            "እባክዎ መረጃውን ያረጋግጡና Save ያድርጉ።"
        );

        return true;
    }

    function bind() {
        document.addEventListener("click", function (event) {
            const button =
                event.target.closest(
                    '[data-cost-profit-destination="self-product"]'
                );

            if (!button) {
                return;
            }

            event.preventDefault();
            sendToSelfProduct();
        });
    }

    window.yamCostProfitSelfProductsIntegration = {
        sendToSelfProduct
    };

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            bind
        );
    } else {
        bind();
    }

    console.log(
        "✅ Cost & Profit → Self Product Integration loaded"
    );
})();
