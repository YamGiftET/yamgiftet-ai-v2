"use strict";

(function () {
    function getLastResult() {
        if (
            !window.yamCostProfitUI ||
            typeof window.yamCostProfitUI.getLastResult !== "function"
        ) {
            return null;
        }

        return window.yamCostProfitUI.getLastResult();
    }

    function sendToRawMaterial() {
        const result = getLastResult();

        if (!result) {
            alert(
                "❌ መጀመሪያ Cost & Profit ስሌት ያስሉ።"
            );
            return false;
        }

        const quantity = Number(result.quantity);
        const unitCost = Number(result.materialUnitCost);

        if (
            !Number.isFinite(quantity) ||
            !Number.isFinite(unitCost) ||
            quantity <= 0 ||
            unitCost <= 0
        ) {
            alert(
                "❌ የQuantity ወይም Unit Cost ውጤት ትክክል አይደለም።"
            );
            return false;
        }

        const form =
            document.getElementById("yamPurchaseForm");

        if (!form) {
            alert(
                "❌ የጥሬ ዕቃ የግዢ መስኮት አልተከፈተም።\n" +
                "መጀመሪያ Purchase መስኮቱን ይክፈቱ።"
            );
            return false;
        }

        const quantityField =
            form.elements["quantity"];

        const unitCostField =
            form.elements["unitCost"];

        if (!quantityField || !unitCostField) {
            alert(
                "❌ Quantity ወይም Unit Cost መስክ አልተገኘም።"
            );
            return false;
        }

        quantityField.value = String(quantity);
        unitCostField.value = String(unitCost);

        quantityField.dispatchEvent(
            new Event("input", { bubbles: true })
        );

        quantityField.dispatchEvent(
            new Event("change", { bubbles: true })
        );

        unitCostField.dispatchEvent(
            new Event("input", { bubbles: true })
        );

        unitCostField.dispatchEvent(
            new Event("change", { bubbles: true })
        );

        alert(
            "✅ Cost & Profit ውጤቱ ወደ ጥሬ ዕቃ Purchase መስክ ገብቷል።\n\n" +
            "Quantity: " + quantity + "\n" +
            "Unit Cost: " + unitCost + "\n\n" +
            "እባክዎ መረጃውን ያረጋግጡና Save/Purchase ያድርጉ።"
        );

        return true;
    }

    function bind() {
        document.addEventListener("click", function (event) {
            const button =
                event.target.closest(
                    '[data-cost-profit-destination="raw-material"]'
                );

            if (!button) {
                return;
            }

            event.preventDefault();
            sendToRawMaterial();
        });
    }

    window.yamCostProfitRawMaterialIntegration = {
        sendToRawMaterial
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
        "✅ Cost & Profit → Raw Material Integration loaded"
    );
})();
