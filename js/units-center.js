"use strict";

(function () {
    const category =
        document.getElementById("unitsCategory");

    const value =
        document.getElementById("unitsValue");

    const from =
        document.getElementById("unitsFrom");

    const to =
        document.getElementById("unitsTo");

    const button =
        document.getElementById("unitsConvertButton");

    const result =
        document.getElementById("unitsResult");

    const resultText =
        document.getElementById("unitsResultText");

    const error =
        document.getElementById("unitsError");

    if (
        !category ||
        !value ||
        !from ||
        !to ||
        !button ||
        !result ||
        !resultText ||
        !error
    ) {
        return;
    }

    const units = {
        volume: [
            ["ml", "mL"],
            ["l", "L"]
        ],

        weight: [
            ["g", "g"],
            ["kg", "kg"]
        ],

        length: [
            ["cm", "cm"],
            ["m", "m"],
            ["inch", "inch"]
        ]
    };

    function showError(message) {
        error.textContent = message;
        error.hidden = false;
        result.hidden = true;
    }

    function clearError() {
        error.textContent = "";
        error.hidden = true;
    }

    function populateUnits() {
        const selected =
            category.value;

        const available =
            units[selected] || [];

        from.innerHTML = "";
        to.innerHTML = "";

        available.forEach(function (unit) {
            const fromOption =
                document.createElement("option");

            fromOption.value = unit[0];
            fromOption.textContent = unit[1];

            from.appendChild(fromOption);

            const toOption =
                document.createElement("option");

            toOption.value = unit[0];
            toOption.textContent = unit[1];

            to.appendChild(toOption);
        });

        if (available.length > 1) {
            to.selectedIndex = 1;
        }
    }

    function formatNumber(number) {
        return Number(number).toLocaleString(
            "en-US",
            {
                maximumFractionDigits: 6
            }
        );
    }

    function convertUnits() {
        clearError();

        try {
            const converter =
                window.yamUnitsConverter ||
                window.UnitsConverter ||
                null;

            const converterFunction =
                converter &&
                typeof converter.convert === "function"
                    ? converter.convert
                    : null;

            if (!converterFunction) {
                throw new Error(
                    "የUnits Converter Engine አልተገኘም።"
                );
            }

            const numericValue =
                Number(value.value);

            if (!Number.isFinite(numericValue)) {
                throw new Error(
                    "መጠኑ ትክክለኛ ቁጥር መሆን አለበት።"
                );
            }

            const converted =
                converterFunction(
                    numericValue,
                    from.value,
                    to.value,
                    category.value
                );

            resultText.textContent =
                `${formatNumber(numericValue)} ${from.options[from.selectedIndex].textContent} = ${formatNumber(converted)} ${to.options[to.selectedIndex].textContent}`;

            result.hidden = false;

        } catch (err) {
            showError(
                err.message ||
                "የመቀየሪያ ስህተት ተፈጥሯል።"
            );
        }
    }

    category.addEventListener(
        "change",
        populateUnits
    );

    button.addEventListener(
        "click",
        convertUnits
    );

    populateUnits();

    window.yamUnitsCenter = {
        convertUnits: convertUnits,
        populateUnits: populateUnits
    };

    console.log(
        "✅ Yam Units Center loaded"
    );
})();
