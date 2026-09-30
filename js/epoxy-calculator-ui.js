"use strict";

/*
 * YamGiftET AI v2
 * Browser-safe Epoxy Calculator UI
 *
 * UI layer only.
 * The CommonJS epoxy-calculator-engine.js remains untouched.
 */

(function () {
    const calculator = document.getElementById("epoxyCalculator");
    if (!calculator) return;

    const shape = document.getElementById("epoxyShape");
    const length = document.getElementById("epoxyLength");
    const width = document.getElementById("epoxyWidth");
    const diameter = document.getElementById("epoxyDiameter");
    const base = document.getElementById("epoxyBase");
    const height = document.getElementById("epoxyHeight");
    const thickness = document.getElementById("epoxyThickness");
    const wastePercent = document.getElementById("epoxyWastePercent");
    const resinRatio = document.getElementById("epoxyResinRatio");
    const hardenerRatio = document.getElementById("epoxyHardenerRatio");

    const lengthUnit = document.getElementById("epoxyLengthUnit");
    const widthUnit = document.getElementById("epoxyWidthUnit");
    const diameterUnit = document.getElementById("epoxyDiameterUnit");
    const baseUnit = document.getElementById("epoxyBaseUnit");
    const heightUnit = document.getElementById("epoxyHeightUnit");
    const thicknessUnit = document.getElementById("epoxyThicknessUnit");

    const resultArea = document.getElementById("epoxyResultArea");
    const resultVolume = document.getElementById("epoxyResultVolume");
    const resultTotal = document.getElementById("epoxyResultTotal");
    const resultResin = document.getElementById("epoxyResultResin");
    const resultHardener = document.getElementById("epoxyResultHardener");
    const errorBox = document.getElementById("epoxyCalculatorError");

    const EPOXY_HISTORY_KEY = "yamgiftet_epoxy_calculator_history";
    const epoxyHistoryList = document.getElementById("epoxyHistoryList");
    const epoxyHistorySearch = document.getElementById("epoxyHistorySearch");
    const clearEpoxyHistoryButton =
        document.getElementById("clearEpoxyHistory");

    const SHAPE_LABELS = {
        rectangle: "አራት ማዕዘን",
        square: "ካሬ",
        circle: "ክብ",
        oval: "ኦቫል",
        triangle: "ሦስት ማዕዘን"
    };

    let lastSavedEpoxySnapshot = "";
    let epoxyHistorySaveTimer = null;

    function scheduleEpoxyHistorySave() {
        if (epoxyHistorySaveTimer) {
            clearTimeout(epoxyHistorySaveTimer);
        }

        epoxyHistorySaveTimer = setTimeout(() => {
            epoxyHistorySaveTimer = null;
            saveCurrentEpoxyCalculation();
        }, 700);
    }

    function createEpoxyHistoryId() {
        return `epoxy-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 9)}`;
    }

    function getEpoxyHistory() {
        try {
            const raw = localStorage.getItem(EPOXY_HISTORY_KEY);
            if (!raw) return [];

            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.warn("Epoxy History read failed:", error);
            return [];
        }
    }

    function saveEpoxyHistory(history) {
        localStorage.setItem(
            EPOXY_HISTORY_KEY,
            JSON.stringify(history)
        );
    }

    function getEpoxyEthiopianDate(createdAt) {
        try {
            const date = new Date(createdAt);

            if (
                typeof gregorianToEthiopian !== "function" ||
                typeof formatEthiopianDate !== "function"
            ) {
                return "";
            }

            const ethiopian = gregorianToEthiopian(date);

            return formatEthiopianDate(
                ethiopian.year,
                ethiopian.month,
                ethiopian.day
            );
        } catch (error) {
            console.warn("Epoxy Ethiopian date failed:", error);
            return "";
        }
    }

    function getEpoxyTime(createdAt) {
        try {
            const date = new Date(createdAt);

            const time = date.toLocaleTimeString(
                "am-ET",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false
                }
            );

            const hour = date.getHours();

            let period = "ማታ";

            if (hour < 6) {
                period = "ሌሊት";
            } else if (hour < 12) {
                period = "ጥዋት";
            } else if (hour < 18) {
                period = "ከሰዓት";
            }

            return `${time} ${period}`;
        } catch (error) {
            return "";
        }
    }

    function readEpoxyInputSnapshot() {
        const createdAt = new Date().toISOString();
        const selectedShape =
            String(shape.value || "").toLowerCase();

        return {
            shape: selectedShape,
            shapeLabel:
                SHAPE_LABELS[selectedShape] || selectedShape,

            dimensions: {
                length: {
                    value: length.value,
                    unit: lengthUnit.value
                },
                width: {
                    value: width.value,
                    unit: widthUnit.value
                },
                diameter: {
                    value: diameter.value,
                    unit: diameterUnit.value
                },
                base: {
                    value: base.value,
                    unit: baseUnit.value
                },
                height: {
                    value: height.value,
                    unit: heightUnit.value
                },
                thickness: {
                    value: thickness.value,
                    unit: thicknessUnit.value
                }
            },

            wastePercent: wastePercent.value,
            resinRatio: resinRatio.value,
            hardenerRatio: hardenerRatio.value,

            createdAt,
            updatedAt: createdAt,

            ethiopianDate:
                getEpoxyEthiopianDate(createdAt),
            time: getEpoxyTime(createdAt)
        };
    }

    function getEpoxyResultSnapshot() {
        return {
            area: resultArea.textContent || "0.00",
            areaUnit: "cm²",
            volume: resultVolume.textContent || "0.00",
            volumeUnit: "cm³",
            totalEpoxy: resultTotal.textContent || "0.00",
            totalEpoxyUnit: "mL",
            resin: resultResin.textContent || "0.00",
            resinUnit: "mL",
            hardener: resultHardener.textContent || "0.00",
            hardenerUnit: "mL"
        };
    }

    function getEpoxySnapshotSignature(snapshot) {
        return JSON.stringify({
            shape: snapshot.shape,
            dimensions: snapshot.dimensions,
            wastePercent: snapshot.wastePercent,
            resinRatio: snapshot.resinRatio,
            hardenerRatio: snapshot.hardenerRatio,
            results: snapshot.results
        });
    }

    function saveCurrentEpoxyCalculation() {
        if (!epoxyHistoryList) return;

        const snapshot = readEpoxyInputSnapshot();
        snapshot.results = getEpoxyResultSnapshot();

        const signature =
            getEpoxySnapshotSignature(snapshot);

        if (signature === lastSavedEpoxySnapshot) {
            return;
        }

        const history = getEpoxyHistory();

        const item = {
            id: createEpoxyHistoryId(),
            ...snapshot,
            version: 1
        };

        history.unshift(item);
        saveEpoxyHistory(history);

        lastSavedEpoxySnapshot = signature;
        renderEpoxyHistory();
    }

    function escapeEpoxyHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatEpoxyDimension(label, dimension) {
        if (!dimension || dimension.value === "") {
            return `
                <div class="epoxy-history-detail">
                    <span>${escapeEpoxyHtml(label)}</span>
                    <strong>—</strong>
                </div>
            `;
        }

        return `
            <div class="epoxy-history-detail">
                <span>${escapeEpoxyHtml(label)}</span>
                <strong>
                    ${escapeEpoxyHtml(dimension.value)}
                    ${escapeEpoxyHtml(dimension.unit)}
                </strong>
            </div>
        `;
    }

    function renderEpoxyHistory(searchTerm = "") {
        if (!epoxyHistoryList) return;

        const history = getEpoxyHistory();
        const query = String(searchTerm || "")
            .trim()
            .toLowerCase();

        const filtered = history.filter((item) => {
            if (!query) return true;

            return JSON.stringify(item)
                .toLowerCase()
                .includes(query);
        });

        if (!filtered.length) {
            epoxyHistoryList.innerHTML = `
                <div class="epoxy-history-empty">
                    ${
                        history.length
                            ? "🔍 የፈለጉት የEpoxy ስሌት አልተገኘም።"
                            : "📭 እስካሁን የEpoxy ስሌት History የለም።"
                    }
                </div>
            `;
            return;
        }

        epoxyHistoryList.innerHTML = filtered
            .map((item) => {
                const dimensions =
                    item.dimensions || {};

                const results =
                    item.results || {};

                return `
                    <article
                        class="epoxy-history-item"
                        data-history-id="${escapeEpoxyHtml(item.id)}"
                    >
                        <h4 class="epoxy-history-item-title">
                            🧪 ${escapeEpoxyHtml(
                                item.shapeLabel ||
                                SHAPE_LABELS[item.shape] ||
                                item.shape ||
                                "Epoxy"
                            )}
                        </h4>

                        <div class="epoxy-history-item-meta">
                            <span>
                                📅 ${escapeEpoxyHtml(
                                    item.ethiopianDate || "—"
                                )}
                            </span>
                            <span>
                                🕒 ${escapeEpoxyHtml(
                                    item.time || "—"
                                )}
                            </span>
                            <span>
                                ♻️ Waste:
                                ${escapeEpoxyHtml(
                                    item.wastePercent || "0"
                                )}%
                            </span>
                            <span>
                                ⚗️ Ratio:
                                ${escapeEpoxyHtml(
                                    item.resinRatio || "—"
                                )}
                                :
                                ${escapeEpoxyHtml(
                                    item.hardenerRatio || "—"
                                )}
                            </span>
                        </div>

                        <div class="epoxy-history-item-details">
                            ${formatEpoxyDimension(
                                "ርዝመት",
                                dimensions.length
                            )}
                            ${formatEpoxyDimension(
                                "ስፋት",
                                dimensions.width
                            )}
                            ${formatEpoxyDimension(
                                "ዲያሜትር",
                                dimensions.diameter
                            )}
                            ${formatEpoxyDimension(
                                "መሠረት",
                                dimensions.base
                            )}
                            ${formatEpoxyDimension(
                                "ቁመት",
                                dimensions.height
                            )}
                            ${formatEpoxyDimension(
                                "ውፍረት",
                                dimensions.thickness
                            )}
                        </div>

                        <div class="epoxy-history-item-results">
                            <div class="epoxy-history-result">
                                <span>📐 Area</span>
                                <strong>
                                    ${escapeEpoxyHtml(
                                        results.area || "0.00"
                                    )}
                                    ${escapeEpoxyHtml(
                                        results.areaUnit || "cm²"
                                    )}
                                </strong>
                            </div>

                            <div class="epoxy-history-result">
                                <span>📦 Volume</span>
                                <strong>
                                    ${escapeEpoxyHtml(
                                        results.volume || "0.00"
                                    )}
                                    ${escapeEpoxyHtml(
                                        results.volumeUnit || "cm³"
                                    )}
                                </strong>
                            </div>

                            <div class="epoxy-history-result">
                                <span>🧪 Total</span>
                                <strong>
                                    ${escapeEpoxyHtml(
                                        results.totalEpoxy || "0.00"
                                    )}
                                    ${escapeEpoxyHtml(
                                        results.totalEpoxyUnit || "mL"
                                    )}
                                </strong>
                            </div>

                            <div class="epoxy-history-result">
                                <span>🔵 Resin</span>
                                <strong>
                                    ${escapeEpoxyHtml(
                                        results.resin || "0.00"
                                    )}
                                    ${escapeEpoxyHtml(
                                        results.resinUnit || "mL"
                                    )}
                                </strong>
                            </div>

                            <div class="epoxy-history-result">
                                <span>🟡 Hardener</span>
                                <strong>
                                    ${escapeEpoxyHtml(
                                        results.hardener || "0.00"
                                    )}
                                    ${escapeEpoxyHtml(
                                        results.hardenerUnit || "mL"
                                    )}
                                </strong>
                            </div>
                        </div>

                        <div class="epoxy-history-item-actions">
                            <button
                                type="button"
                                class="epoxy-history-action"
                                data-action="edit"
                                data-id="${escapeEpoxyHtml(item.id)}"
                            >
                                ✏️ አርትዕ
                            </button>

                            <button
                                type="button"
                                class="epoxy-history-action"
                                data-action="copy"
                                data-id="${escapeEpoxyHtml(item.id)}"
                            >
                                📋 ቅጂ
                            </button>

                            <button
                                type="button"
                                class="epoxy-history-action"
                                data-action="delete"
                                data-id="${escapeEpoxyHtml(item.id)}"
                            >
                                🗑️ ሰርዝ
                            </button>
                        </div>
                    </article>
                `;
            })
            .join("");
    }

    function restoreEpoxyHistoryItem(item) {
        if (!item) return;

        const dimensions =
            item.dimensions || {};

        shape.value = item.shape || "rectangle";

        length.value =
            dimensions.length?.value ?? "";
        lengthUnit.value =
            dimensions.length?.unit || "cm";

        width.value =
            dimensions.width?.value ?? "";
        widthUnit.value =
            dimensions.width?.unit || "cm";

        diameter.value =
            dimensions.diameter?.value ?? "";
        diameterUnit.value =
            dimensions.diameter?.unit || "cm";

        base.value =
            dimensions.base?.value ?? "";
        baseUnit.value =
            dimensions.base?.unit || "cm";

        height.value =
            dimensions.height?.value ?? "";
        heightUnit.value =
            dimensions.height?.unit || "cm";

        thickness.value =
            dimensions.thickness?.value ?? "";
        thicknessUnit.value =
            dimensions.thickness?.unit || "cm";

        wastePercent.value =
            item.wastePercent ?? "0";
        resinRatio.value =
            item.resinRatio ?? "1";
        hardenerRatio.value =
            item.hardenerRatio ?? "1";

        updateShapeFields();
        safeCalculate();

        lastSavedEpoxySnapshot = "";
    }

    async function copyEpoxyHistoryItem(item) {
        if (!item) return;

        const dimensions =
            item.dimensions || {};
        const results =
            item.results || {};

        const lines = [
            `🧪 ${item.shapeLabel || item.shape || "Epoxy"}`,
            `📅 ${item.ethiopianDate || ""}`,
            `🕒 ${item.time || ""}`,
            "",
            `ርዝመት: ${dimensions.length?.value || "—"} ${dimensions.length?.unit || ""}`,
            `ስፋት: ${dimensions.width?.value || "—"} ${dimensions.width?.unit || ""}`,
            `ዲያሜትር: ${dimensions.diameter?.value || "—"} ${dimensions.diameter?.unit || ""}`,
            `መሠረት: ${dimensions.base?.value || "—"} ${dimensions.base?.unit || ""}`,
            `ቁመት: ${dimensions.height?.value || "—"} ${dimensions.height?.unit || ""}`,
            `ውፍረት: ${dimensions.thickness?.value || "—"} ${dimensions.thickness?.unit || ""}`,
            `Waste: ${item.wastePercent || "0"}%`,
            `Ratio: ${item.resinRatio || "—"}:${item.hardenerRatio || "—"}`,
            "",
            `Area: ${results.area || "0.00"} ${results.areaUnit || "cm²"}`,
            `Volume: ${results.volume || "0.00"} ${results.volumeUnit || "cm³"}`,
            `Total Epoxy: ${results.totalEpoxy || "0.00"} ${results.totalEpoxyUnit || "mL"}`,
            `Resin: ${results.resin || "0.00"} ${results.resinUnit || "mL"}`,
            `Hardener: ${results.hardener || "0.00"} ${results.hardenerUnit || "mL"}`
        ].join("\n");

        try {
            await navigator.clipboard.writeText(lines);
            alert("የEpoxy History መረጃ ተቀድቷል።");
        } catch (error) {
            window.prompt(
                "የEpoxy History መረጃውን ቅዳ:",
                lines
            );
        }
    }

    function handleEpoxyHistoryAction(action, id) {
        const history = getEpoxyHistory();
        const item = history.find(
            (entry) => entry.id === id
        );

        if (!item) return;

        if (action === "edit") {
            restoreEpoxyHistoryItem(item);
            return;
        }

        if (action === "copy") {
            copyEpoxyHistoryItem(item);
            return;
        }

        if (action === "delete") {
            const nextHistory = history.filter(
                (entry) => entry.id !== id
            );

            saveEpoxyHistory(nextHistory);
            renderEpoxyHistory(
                epoxyHistorySearch?.value || ""
            );
        }
    }

    if (epoxyHistoryList) {
        epoxyHistoryList.addEventListener(
            "click",
            (event) => {
                const button =
                    event.target.closest(
                        "[data-action][data-id]"
                    );

                if (!button) return;

                handleEpoxyHistoryAction(
                    button.dataset.action,
                    button.dataset.id
                );
            }
        );
    }

    if (epoxyHistorySearch) {
        epoxyHistorySearch.addEventListener(
            "input",
            () => {
                renderEpoxyHistory(
                    epoxyHistorySearch.value
                );
            }
        );
    }

    const saveEpoxyHistoryButton =
        document.getElementById("saveEpoxyHistory");

    if (saveEpoxyHistoryButton) {
        saveEpoxyHistoryButton.addEventListener(
            "click",
            () => {
                try {
                    calculate();
                    saveCurrentEpoxyCalculation();
                } catch (error) {
                    // Do not save incomplete or invalid calculator states.
                }
            }
        );
    }

    if (clearEpoxyHistoryButton) {
        clearEpoxyHistoryButton.addEventListener(
            "click",
            () => {
                const history = getEpoxyHistory();

                if (!history.length) return;

                if (
                    !window.confirm(
                        "የEpoxy History ሁሉንም ማጥፋት ይፈልጋሉ?"
                    )
                ) {
                    return;
                }

                localStorage.removeItem(
                    EPOXY_HISTORY_KEY
                );

                lastSavedEpoxySnapshot = "";
                renderEpoxyHistory();
            }
        );
    }

    renderEpoxyHistory();


    function number(value, field) {
        const raw = String(value ?? "").trim();

        if (raw === "") {
            throw new Error(`${field} እስካሁን አልተሞላም።`);
        }

        const n = Number(raw);

        if (!Number.isFinite(n)) {
            throw new Error(`${field} ትክክለኛ ቁጥር መሆን አለበት።`);
        }

        return n;
    }

    function convertLength(value, unit) {
        const converter = window.yamUnitsConverter;

        if (
            !converter ||
            typeof converter.convert !== "function"
        ) {
            throw new Error(
                "የUnits Converter Engine አልተገኘም።"
            );
        }

        return converter.convert(
            value,
            unit,
            "cm",
            "length"
        );
    }

    function rectangleArea(l, w, lUnit, wUnit) {
        return (
            convertLength(number(l, "ርዝመት"), lUnit) *
            convertLength(number(w, "ስፋት"), wUnit)
        );
    }

    function squareArea(side, sideUnit) {
        const s = convertLength(
            number(side, "የካሬ ጎን"),
            sideUnit
        );

        return s * s;
    }

    function circleArea(d, dUnit) {
        const diameterValue = convertLength(
            number(d, "ዲያሜትር"),
            dUnit
        );

        if (diameterValue <= 0) {
            throw new Error(
                "ዲያሜትር ከዜሮ በላይ መሆን አለበት።"
            );
        }

        const radius = diameterValue / 2;

        return Math.PI * radius * radius;
    }

    function ovalArea(l, w, lUnit, wUnit) {
        const lengthCm = convertLength(
            number(l, "ርዝመት"),
            lUnit
        );

        const widthCm = convertLength(
            number(w, "ስፋት"),
            wUnit
        );

        return Math.PI * (lengthCm / 2) * (widthCm / 2);
    }

    function triangleArea(b, h, bUnit, hUnit) {
        const baseCm = convertLength(
            number(b, "መሠረት"),
            bUnit
        );

        const heightCm = convertLength(
            number(h, "ቁመት"),
            hUnit
        );

        return (baseCm * heightCm) / 2;
    }

    function calculate() {
        const selectedShape =
            String(shape.value).toLowerCase();

        const thicknessCm = convertLength(
            number(thickness.value, "ውፍረት"),
            thicknessUnit.value
        );

        const waste =
            number(wastePercent.value || 0, "Waste");

        const resin =
            number(resinRatio.value || 1, "Resin ratio");

        const hardener =
            number(
                hardenerRatio.value || 1,
                "Hardener ratio"
            );

        if (thicknessCm <= 0) {
            throw new Error(
                "ውፍረት ከዜሮ በላይ መሆን አለበት።"
            );
        }

        if (waste < 0) {
            throw new Error(
                "Waste % አሉታዊ መሆን አይችልም።"
            );
        }

        if (resin <= 0 || hardener <= 0) {
            throw new Error(
                "Resin እና Hardener ratio ከዜሮ በላይ መሆን አለባቸው።"
            );
        }

        let area;

        switch (selectedShape) {
            case "rectangle":
                area = rectangleArea(
                    length.value,
                    width.value,
                    lengthUnit.value,
                    widthUnit.value
                );
                break;

            case "square":
                area = squareArea(
                    length.value,
                    lengthUnit.value
                );
                break;

            case "circle":
                area = circleArea(
                    diameter.value,
                    diameterUnit.value
                );
                break;

            case "oval":
                area = ovalArea(
                    length.value,
                    width.value,
                    lengthUnit.value,
                    widthUnit.value
                );
                break;

            case "triangle":
                area = triangleArea(
                    base.value,
                    height.value,
                    baseUnit.value,
                    heightUnit.value
                );
                break;

            default:
                throw new Error(
                    "የEpoxy ቅርጽ ይምረጡ።"
                );
        }

        const volume = area * thicknessCm;
        const total =
            volume * (1 + waste / 100);

        const ratioTotal = resin + hardener;

        resultArea.textContent =
            area.toFixed(2);

        resultVolume.textContent =
            volume.toFixed(2);

        resultTotal.textContent =
            total.toFixed(2);

        resultResin.textContent =
            (total * resin / ratioTotal).toFixed(2);

        resultHardener.textContent =
            (total * hardener / ratioTotal).toFixed(2);

        errorBox.textContent = "";
        errorBox.hidden = true;
    }

    function clearResults() {
        resultArea.textContent = "0.00";
        resultVolume.textContent = "0.00";
        resultTotal.textContent = "0.00";
        resultResin.textContent = "0.00";
        resultHardener.textContent = "0.00";
        errorBox.textContent = "";
        errorBox.hidden = true;
    }

    function safeCalculate() {
        try {
            calculate();
        } catch (error) {
            if (epoxyHistorySaveTimer) {
                clearTimeout(epoxyHistorySaveTimer);
                epoxyHistorySaveTimer = null;
            }

            const message = error.message || "";

            if (
                message.includes("እስካሁን አልተሞላም")
            ) {
                clearResults();
                return;
            }

            errorBox.textContent = message;
            errorBox.hidden = false;
        }
    }

    const fields = [
        shape,
        length,
        width,
        diameter,
        base,
        height,
        thickness,
        wastePercent,
        resinRatio,
        hardenerRatio,
        lengthUnit,
        widthUnit,
        diameterUnit,
        baseUnit,
        heightUnit,
        thicknessUnit
    ];

    fields.forEach((field) => {
        if (!field) return;

        field.addEventListener(
            "input",
            safeCalculate
        );

        field.addEventListener(
            "change",
            safeCalculate
        );
    });

    function updateShapeFields() {
        const selected =
            String(shape.value).toLowerCase();

        const fieldsByShape = {
            rectangle: ["length", "width"],
            square: ["length"],
            circle: ["diameter"],
            oval: ["length", "width"],
            triangle: ["base", "height"]
        };

        const active =
            fieldsByShape[selected] || [];

        [
            ["epoxyLength", length, lengthUnit, "length"],
            ["epoxyWidth", width, widthUnit, "width"],
            ["epoxyDiameter", diameter, diameterUnit, "diameter"],
            ["epoxyBase", base, baseUnit, "base"],
            ["epoxyHeight", height, heightUnit, "height"]
        ].forEach(([id, field, unitField, key]) => {
            const wrapper =
                field.closest(".epoxy-field");

            if (wrapper) {
                wrapper.hidden =
                    !active.includes(key);
            }

            if (unitField) {
                unitField.disabled =
                    !active.includes(key);
            }
        });

        safeCalculate();
    }

    shape.addEventListener(
        "change",
        updateShapeFields
    );

    updateShapeFields();
})();
