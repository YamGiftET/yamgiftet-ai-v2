(function () {
    "use strict";

    function getCalculator() {
        return window.yamUniversalCalculator || null;
    }

    function getField(id) {
        return document.getElementById(id);
    }

    function getCalculatorValue() {
        const calculator = getCalculator();

        if (!calculator) {
            return null;
        }

        const value = calculator.getLastResult();

        if (value === null || value === undefined || value === "") {
            return null;
        }

        const number = Number(String(value).replace(/,/g, ""));

        return Number.isFinite(number) ? number : null;
    }

    function setFieldValue(id, value) {
        const field = getField(id);

        if (!field || value === null) {
            return false;
        }

        field.value = String(value);
        field.dispatchEvent(new Event("input", { bubbles: true }));
        field.dispatchEvent(new Event("change", { bubbles: true }));

        return true;
    }

    function fillSellPrice() {
        return setFieldValue(
            "productSellPrice",
            getCalculatorValue()
        );
    }

    function fillUnitCost() {
        return setFieldValue(
            "productUnitCost",
            getCalculatorValue()
        );
    }

      function handleCalculatorAction(action) {
          if (action === "sell-price") {
              if (fillSellPrice()) {
                  console.log("✅ Calculator result → የመሸጫ ዋጋ");
              }
              return;
          }

          if (action === "unit-cost") {
              if (fillUnitCost()) {
                  console.log("✅ Calculator result → የምርት ወጪ");
              }
          }
      }

      document
          .querySelectorAll("[data-self-product-calculator-action]")
          .forEach(function (button) {
              button.addEventListener("click", function () {
                  handleCalculatorAction(
                      button.dataset.selfProductCalculatorAction
                  );
              });
          });

    window.yamSelfProductsCalculator = {
        getCalculatorValue: getCalculatorValue,
        fillSellPrice: fillSellPrice,
        fillUnitCost: fillUnitCost
    };

    console.log("✅ Yam Self Products Calculator Integration loaded");
})();
