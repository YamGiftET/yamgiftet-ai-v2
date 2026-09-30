(() => {
    "use strict";

    const API = "/api/self-products";

    const form = document.getElementById("selfProductForm");

    const name = document.getElementById("productName");
    const type = document.getElementById("productType");
    const description = document.getElementById("productDescription");
    const quantity = document.getElementById("productQuantity");
    const stock = document.getElementById("productStock");
    const productUnit = document.getElementById("productUnit");
    const productAreaFields = document.getElementById("productAreaFields");
    const productLength = document.getElementById("productLength");
    const productWidth = document.getElementById("productWidth");
    const productDimensionUnit = document.getElementById("productDimensionUnit");
    const productThickness = document.getElementById("productThickness");
    const productThicknessUnit = document.getElementById("productThicknessUnit");
    const productArea = document.getElementById("productArea");
    const productAreaUnit = document.getElementById("productAreaUnit");
    const sellPrice = document.getElementById("productSellPrice");
    const unitCost = document.getElementById("productUnitCost");
    const date = document.getElementById("productDate");
    const photo = document.getElementById("productPhoto");
    const preview = document.getElementById("productPhotoPreview");

    const unitProfit = document.getElementById("unitProfit");
    const totalSales = document.getElementById("totalSales");
    const totalCost = document.getElementById("totalCost");
    const totalProfit = document.getElementById("totalProfit");

    let editingId = null;

    function number(value) {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    }

    function formatEthiopianDate(dateInput) {
        if (!dateInput) return "-";

        const date = new Date(dateInput);

        if (Number.isNaN(date.getTime())) {
            return String(dateInput);
        }

        const year = date.getUTCFullYear();
        const month = date.getUTCMonth() + 1;
        const day = date.getUTCDate();

        let ethYear;
        let ethMonth;
        let ethDay;

        if (month > 9 || (month === 9 && day >= 11)) {
            ethYear = year - 7;
        } else {
            ethYear = year - 8;
        }

        const newYear = new Date(Date.UTC(
            ethYear + 7,
            8,
            11
        ));

        const diffDays = Math.floor(
            (Date.UTC(year, month - 1, day) - newYear.getTime())
            / 86400000
        );

        ethMonth = Math.floor(diffDays / 30) + 1;
        ethDay = (diffDays % 30) + 1;

        if (ethMonth > 13) {
            ethMonth = 1;
            ethYear++;
        }

        const months = [
            "መስከረም",
            "ጥቅምት",
            "ኅዳር",
            "ታኅሣሥ",
            "ጥር",
            "የካቲት",
            "መጋቢት",
            "ሚያዝያ",
            "ግንቦት",
            "ሰኔ",
            "ሐምሌ",
            "ነሐሴ",
            "ጳጉሜን"
        ];

        return `${ethDay} ${months[ethMonth - 1]} ${ethYear}`;
    }

    function money(value) {
        return `${Number(value || 0).toLocaleString("en-US")} ብር`;
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function isAreaUnit(unit) {
        return ["mm2", "cm2", "m2"].includes(String(unit || "").toLowerCase());
    }

    function updateAreaUI() {
        const selectedUnit = String(productUnit?.value || "pcs").toLowerCase();
        const areaMode = isAreaUnit(selectedUnit);

        if (productAreaFields) {
            productAreaFields.style.display = areaMode ? "" : "none";
        }

        if (!areaMode) {
            if (productArea) productArea.textContent = "0";
            if (productAreaUnit) productAreaUnit.textContent = selectedUnit || "pcs";
            return;
        }

        const length = Math.max(0, number(productLength?.value));
        const width = Math.max(0, number(productWidth?.value));
        const dimensionUnit = String(productDimensionUnit?.value || "cm");

        const toMm = {
            mm: 1,
            cm: 10,
            m: 1000
        };

        const factor = toMm[dimensionUnit] || 10;
        const areaMm2 = length * factor * width * factor;

        let area = areaMm2;
        if (selectedUnit === "cm2") area = areaMm2 / 100;
        if (selectedUnit === "m2") area = areaMm2 / 1000000;

        if (productArea) {
            productArea.textContent = Number.isFinite(area)
                ? area.toLocaleString("en-US", { maximumFractionDigits: 6 })
                : "0";
        }

        if (productAreaUnit) {
            productAreaUnit.textContent = selectedUnit;
        }
    }

    function calculate() {
        updateAreaUI();
        const q = Math.max(0, number(quantity?.value));
        const price = Math.max(0, number(sellPrice?.value));
        const cost = Math.max(0, number(unitCost?.value));

        const profit = price - cost;

        if (unitProfit) unitProfit.textContent = money(profit);
        if (totalSales) totalSales.textContent = money(price * q);
        if (totalCost) totalCost.textContent = money(cost * q);
        if (totalProfit) totalProfit.textContent = money(profit * q);
    }

    [
        quantity,
        stock,
        sellPrice,
        unitCost,
        productUnit,
        productLength,
        productWidth,
        productDimensionUnit,
        productThickness,
        productThicknessUnit
    ].forEach(input => {
        if (input) {
            input.addEventListener("input", calculate);
        }
    });

    if (photo && preview) {
        photo.addEventListener("change", () => {
            const file = photo.files?.[0];

            if (!file) {
                preview.innerHTML = "";
                return;
            }

            if (!file.type.startsWith("image/")) {
                preview.innerHTML =
                    "<span>❌ የምስል ፋይል ብቻ ይምረጡ።</span>";
                return;
            }

            const url = URL.createObjectURL(file);

            preview.innerHTML = `
                <img
                    src="${url}"
                    alt="Product preview"
                    style="
                        max-width:180px;
                        max-height:180px;
                        border-radius:12px;
                        margin-top:10px;
                        object-fit:cover;
                    "
                >
            `;
        });
    }

    function getProductsContainer() {
        let container = document.getElementById("selfProductsList");

        if (!container) {
            container = document.createElement("div");
            container.id = "selfProductsList";

            container.style.marginTop = "25px";

            if (form && form.parentNode) {
                form.parentNode.appendChild(container);
            } else {
                document.body.appendChild(container);
            }
        }

        return container;
    }

    async function loadProducts() {
        const container = getProductsContainer();

        container.innerHTML = `
            <div style="padding:20px;text-align:center;">
                ⏳ የራስ ምርቶች እየተጫኑ ነው...
            </div>
        `;

        try {
            const response = await fetch(API);

            if (!response.ok) {
                throw new Error("API request failed");
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || "Products could not be loaded");
            }

            renderProducts(data.products || []);

        } catch (error) {
            console.error("Self Products Load Error:", error);

            container.innerHTML = `
                <div style="
                    padding:20px;
                    border-radius:12px;
                    background:#fff1f1;
                    color:#b00020;
                    text-align:center;
                ">
                    ❌ ምርቶቹን ማምጣት አልተቻለም።
                    <br>
                    <small>${escapeHtml(error.message)}</small>
                </div>
            `;
        }
    }

    function renderProducts(products) {
        const container = getProductsContainer();

        if (!products.length) {
            container.innerHTML = `
                <div style="
                    padding:25px;
                    text-align:center;
                    border-radius:15px;
                    background:#f7f7f7;
                ">
                    📦 እስካሁን የተመዘገበ የራስ ምርት የለም።
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <h2 style="margin-bottom:15px;">
                📦 የራስ ምርቶች
            </h2>

            <div style="
                display:grid;
                grid-template-columns:repeat(auto-fit,minmax(280px,1fr));
                gap:15px;
            ">
                ${products.map(product => `
                    <div style="
                        background:#fff;
                        border-radius:16px;
                        padding:16px;
                        box-shadow:0 4px 15px rgba(0,0,0,.08);
                        border:1px solid #eee;
                    ">

                        ${
                            product.photoUrl
                            ? `
                                <img
                                    src="${escapeHtml(product.photoUrl)}"
                                    alt="${escapeHtml(product.productName)}"
                                    style="
                                        width:100%;
                                        height:180px;
                                        object-fit:cover;
                                        border-radius:12px;
                                        margin-bottom:12px;
                                    "
                                >
                            `
                            : ""
                        }

                        <h3>
                            ${escapeHtml(product.productName)}
                        </h3>

                        <p>
                            <strong>ዓይነት:</strong>
                            ${escapeHtml(product.productType || "-")}
                        </p>

                        <p>
                            <strong>📅 የተመረተበት:</strong>
                            ${formatEthiopianDate(product.productionDate)}
                        </p>

                        <p>
                            <strong>ብዛት:</strong>
                            ${product.quantity || 0} ${product.unit || "pcs"}
                        </p>

                        <p>
                            <strong>ክምችት:</strong>
                            ${product.stock || 0} ${product.unit || "pcs"}
                        </p>
                        ${isAreaUnit(product.unit) ? `
                        <div style="
                            margin:10px 0;
                            padding:10px;
                            border-radius:10px;
                            background:#f7f9fc;
                            border:1px solid #e6eaf0;
                        ">
                            <p style="margin:4px 0;">
                                <strong>📐 መጠን:</strong>
                                ${product.length ?? "—"} × ${product.width ?? "—"}
                                ${escapeHtml(product.dimensionUnit || "")}
                            </p>
                            <p style="margin:4px 0;">
                                <strong>⬛ ስፋት:</strong>
                                ${product.area ?? "—"} ${escapeHtml(product.areaUnit || product.unit || "")}
                            </p>
                            <p style="margin:4px 0;">
                                <strong>📏 Thickness:</strong>
                                ${product.thickness === null || product.thickness === undefined || product.thickness === ""
                                    ? "—"
                                    : `${product.thickness} ${escapeHtml(product.thicknessUnit || "")}`}
                            </p>
                        </div>
                        ` : ""}

                        <p>
                            <strong>የመሸጫ ዋጋ:</strong>
                            ${money(product.sellPrice)}
                        </p>

                        <p>
                            <strong>የአንድ እቃ ወጪ:</strong>
                            ${money(product.unitCost)}
                        </p>

                        <p>
                            <strong>የአንድ እቃ ትርፍ:</strong>
                            ${money(product.unitProfit)}
                        </p>

                        <p>
                            <strong>ጠቅላላ ሽያጭ:</strong>
                            ${money(product.totalSales)}
                        </p>

                        <p>
                            <strong>ጠቅላላ ወጪ:</strong>
                            ${money(product.totalCost)}
                        </p>

                        <p>
                            <strong>ጠቅላላ ትርፍ:</strong>
                            ${money(product.totalProfit)}
                        </p>

                        <div style="
                            display:flex;
                            gap:8px;
                            margin-top:15px;
                        ">

                            <button
                                type="button"
                                onclick="editSelfProduct('${product.id}')"
                                style="
                                    flex:1;
                                    padding:10px;
                                    border:0;
                                    border-radius:10px;
                                    cursor:pointer;
                                "
                            >
                                ✏️ Edit
                            </button>

                            <button
                                type="button"
                                onclick="sellSelfProduct('${product.id}')"
                                style="
                                    flex:1;
                                    padding:10px;
                                    border:0;
                                    border-radius:10px;
                                    cursor:pointer;
                                    background:#e8f5e9;
                                    color:#176b2c;
                                    font-weight:bold;
                                "
                            >
                                🛒 ሸጥ
                            </button>

                            <button
                                type="button"
                                onclick="showSelfProductSales('${product.id}')"
                                style="
                                    flex:1;
                                    padding:10px;
                                    border:0;
                                    border-radius:10px;
                                    cursor:pointer;
                                    background:#e8f0ff;
                                    color:#174a9c;
                                    font-weight:bold;
                                "
                            >
                                📋 ሽያጭ
                            </button>

                            <button
                                type="button"
                                onclick="deleteSelfProduct('${product.id}')"
                                style="
                                    flex:1;
                                    padding:10px;
                                    border:0;
                                    border-radius:10px;
                                    cursor:pointer;
                                    background:#ffe5e5;
                                "
                            >
                                🗑️ Delete
                            </button>

                        </div>
                    </div>
                `).join("")}
            </div>
        `;
    }


    /* =========================================================
       SELF PRODUCT SALES UI
       ========================================================= */

    window.sellSelfProduct = async function(id) {
        try {
            const product = await getProduct(id);

            const currentStock = Number(product.stock || 0);

            if (currentStock <= 0) {
                alert("❌ ይህ ምርት Stock ላይ የለም።");
                return;
            }

            window.currentSellingProductId = id;
            window.currentSellingProduct = product;

            const modal = document.getElementById("salesModal");

            if (!modal) {
                alert("❌ የሽያጭ Modal አልተገኘም።");
                return;
            }

            const productName =
                document.getElementById("salesModalProductName");

            const stockEl =
                document.getElementById("salesModalStock");

            const dateEl =
                document.getElementById("salesModalDate");

            const dateEthEl =
                document.getElementById("salesModalDateEth");

            const quantityEl =
                document.getElementById("salesModalQuantity");

            const priceEl =
                document.getElementById("salesModalPrice");

            const totalSalesEl =
                document.getElementById("salesModalTotalSales");

            const totalCostEl =
                document.getElementById("salesModalTotalCost");

            const profitEl =
                document.getElementById("salesModalProfit");

            const remainingStockEl =
                document.getElementById("salesModalRemainingStock");

            if (productName) {
                productName.textContent =
                    product.productName || "-";
            }

            const productUnit =
                product.unit || "pcs";

            if (stockEl) {
                stockEl.textContent =
                    currentStock + " " + productUnit;
            }

            if (dateEl) {
                dateEl.value =
                    new Date().toISOString().slice(0, 10);
            }

            if (dateEthEl) {
                dateEthEl.textContent =
                    formatEthiopianDate(dateEl?.value);
            }

            const quantityUnitEl =
                document.getElementById("salesModalQuantityUnit");

            if (quantityUnitEl) {
                quantityUnitEl.textContent =
                    productUnit;
            }

            if (quantityEl) {
                quantityEl.value = 1;
                quantityEl.max = currentStock;
            }

            if (priceEl) {
                priceEl.value =
                    Number(product.sellPrice || 0);
            }

            const receivedEl =
                document.getElementById("salesModalReceived");

            if (receivedEl) {
                receivedEl.value =
                    Number(product.sellPrice || 0) *
                    Number(quantityEl?.value || 1);
            }

            updateSalesModalCalculation();

            modal.setAttribute("aria-hidden", "false");
            modal.classList.add("active");

        } catch (error) {
            console.error(
                "Open Self Product Sale Modal Error:",
                error
            );

            alert(
                "❌ የሽያጭ መስኮቱን መክፈት አልተቻለም።\\n" +
                error.message
            );
        }
    };

    function updateSalesModalCalculation() {
        const product =
            window.currentSellingProduct;

        if (!product) return;

        const stock =
            Number(product.stock || 0);

        const quantityEl =
            document.getElementById("salesModalQuantity");

        const priceEl =
            document.getElementById("salesModalPrice");

        const totalSalesEl =
            document.getElementById("salesModalTotalSales");

        const totalCostEl =
            document.getElementById("salesModalTotalCost");

        const profitEl =
            document.getElementById("salesModalProfit");

        const receivedEl =
            document.getElementById("salesModalReceived");

        const receivedDisplayEl =
            document.getElementById("salesModalReceivedDisplay");

        const receivableEl =
            document.getElementById("salesModalReceivable");

        const remainingStockEl =
            document.getElementById("salesModalRemainingStock");

        const quantity =
            Math.max(
                0,
                Number(quantityEl?.value || 0)
            );

        const salePrice =
            Math.max(
                0,
                Number(priceEl?.value || 0)
            );

        const unitCost =
            Math.max(
                0,
                Number(product.unitCost || 0)
            );



        const totalSales =
            salePrice * quantity;

        const totalCost =
            unitCost * quantity;

        const totalProfit =
            totalSales - totalCost;

        const received =
            Math.min(
                totalSales,
                Math.max(
                    0,
                    Number(receivedEl?.value || 0)
                )
            );

        const receivable =
            totalSales - received;

        const remainingStock =
            stock - quantity;

        if (totalSalesEl) {
            totalSalesEl.textContent =
                money(totalSales);
        }

        if (totalCostEl) {
            totalCostEl.textContent =
                money(totalCost);
        }

        if (receivedDisplayEl) {
            receivedDisplayEl.textContent =
                money(received);
        }

        if (receivableEl) {
            receivableEl.textContent =
                money(receivable);
        }

        if (profitEl) {
            profitEl.textContent =
                money(totalProfit);
        }

        if (remainingStockEl) {
            const productUnit =
                product.unit || "pcs";

            remainingStockEl.textContent =
                Math.max(0, remainingStock).toLocaleString("en-US", {
                    maximumFractionDigits: 6
                }) +
                " " +
                productUnit;
        }
    }

    function updateSalesModalDate() {
        const dateEl =
            document.getElementById("salesModalDate");

        const dateEthEl =
            document.getElementById("salesModalDateEth");

        if (dateEthEl) {
            dateEthEl.textContent =
                formatEthiopianDate(dateEl?.value);
        }
    }
    
    const salesDateInput = document.getElementById("salesModalDate");

    if (salesDateInput) {
        salesDateInput.addEventListener("change", updateSalesModalDate);
        salesDateInput.addEventListener("input", updateSalesModalDate);
    }


    window.closeSalesModal = function() {
        window.closeSelfProductSalesModal();
    };

    window.closeSelfProductSalesModal = function() {
        const modal =
            document.getElementById("salesModal");

        if (!modal) return;

        modal.setAttribute("aria-hidden", "true");
        modal.classList.remove("active");

        window.currentSellingProductId = null;
        window.currentSellingProduct = null;
    };

    window.confirmSelfProductSale = async function() {
        try {
            const id =
                window.currentSellingProductId;

            const product =
                window.currentSellingProduct;

            const requestId =
                typeof crypto !== "undefined" &&
                typeof crypto.randomUUID === "function"
                    ? crypto.randomUUID()
                    : `sale-${Date.now()}-${Math.random().toString(36).slice(2)}`;

            if (!id || !product) {
                alert("❌ የሚሸጠው ምርት አልተመረጠም።");
                return;
            }

            const dateEl =
                document.getElementById("salesModalDate");

            const quantityEl =
                document.getElementById("salesModalQuantity");

            const priceEl =
                document.getElementById("salesModalPrice");

            const quantity =
                Number(quantityEl?.value || 0);

            const salePrice =
                Number(priceEl?.value || 0);

            const saleDate =
                dateEl?.value ||
                new Date().toISOString().slice(0, 10);

            const currentStock =
                Number(product.stock || 0);

            const unitCost =
                Number(product.unitCost || 0);

            if (!saleDate) {
                alert("❌ የሽያጭ ቀን ያስገቡ።");
                return;
            }

            if (
                !Number.isFinite(quantity) ||
                quantity <= 0
            ) {
                alert("❌ ትክክለኛ የሽያጭ ብዛት ያስገቡ።");
                return;
            }

            if (quantity > currentStock) {
                alert(
                    "❌ በStock ላይ " +
                    currentStock +
                    " ብቻ አለ።"
                );
                return;
            }

            if (
                !Number.isFinite(salePrice) ||
                salePrice < 0
            ) {
                alert("❌ ትክክለኛ የመሸጫ ዋጋ ያስገቡ።");
                return;
            }

            const totalSales =
                salePrice * quantity;

            const totalCost =
                unitCost * quantity;

            const totalProfit =
                totalSales - totalCost;

            const receivedEl =
                document.getElementById("salesModalReceived");

            const received =
                Math.max(
                    0,
                    Number(receivedEl?.value || 0)
                );

            if (received > totalSales) {
                alert(
                    "❌ የተቀበለው ክፍያ ከጠቅላላ ሽያጭ መብለጥ አይችልም።"
                );
                return;
            }

            const receivable =
                totalSales - received;

            const confirmButton =
                document.getElementById(
                    "salesModalConfirm"
                );

            if (confirmButton) {
                confirmButton.disabled = true;
                confirmButton.textContent =
                    "⏳ በመመዝገብ ላይ...";
            }

            const response = await fetch(
                API + "/" +
                encodeURIComponent(id) +
                "/sales",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        requestId,
saleDate,
                        quantity,
                        salePrice,
                        unitCost,
                        received
                    })
                }
            );

            const data =
                await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.error ||
                    "ሽያጩን መመዝገብ አልተቻለም።"
                );
            }

            closeSelfProductSalesModal();

            alert(
                "✅ ሽያጩ በትክክል ተመዝግቧል።\\n\\n" +
                "🎁 ምርት: " +
                (product.productName || "-") +
                "\\n" +
                "📅 ቀን: " +
                formatEthiopianDate(saleDate) +
                "\\n" +
                "🔢 ብዛት: " +
                quantity +
                "\\n" +
                "💵 ጠቅላላ ሽያጭ: " +
                money(totalSales) +
                "\\n" +
                "🛠️ ጠቅላላ ወጪ: " +
                money(totalCost) +
                "\\n" +
                "📈 ትርፍ: " +
                money(totalProfit) +
                "\\n" +
                "💵 የተቀበለ: " +
                money(received) +
                "\\n" +
                "💳 ቀሪ: " +
                money(receivable) +
                "\\n" +
                "📦 የቀረ ክምችት: " +
                data.stock.remaining +
                " " +
                (product.unit || "pcs")
            );

            await loadProducts();

        } catch (error) {
            console.error(
                "Confirm Self Product Sale Error:",
                error
            );

            alert(
                "❌ ሽያጩን መመዝገብ አልተቻለም።\\n" +
                error.message
            );

        } finally {
            const confirmButton =
                document.getElementById(
                    "salesModalConfirm"
                );

            if (confirmButton) {
                confirmButton.disabled = false;
                confirmButton.textContent =
                    "✅ ሽያጩን መመዝገብ";
            }
        }
    };

    document.addEventListener("DOMContentLoaded", () => {
        const quantityEl =
            document.getElementById("salesModalQuantity");

        const priceEl =
            document.getElementById("salesModalPrice");

        const dateEl =
            document.getElementById("salesModalDate");

        if (quantityEl) {
            quantityEl.addEventListener(
                "input",
                updateSalesModalCalculation
            );
        }

        if (priceEl) {
            priceEl.addEventListener(
                "input",
                updateSalesModalCalculation
            );
        }

        const receivedEl =
            document.getElementById("salesModalReceived");

        if (receivedEl) {
            receivedEl.addEventListener(
                "input",
                updateSalesModalCalculation
            );
        }

        if (dateEl) {
            dateEl.addEventListener(
                "change",
                updateSalesModalDate
            );
        }

        updateSalesModalDate();
    });

    window.showSelfProductSales = async function(id) {
    try {
        const response = await fetch(
            API + "/" + encodeURIComponent(id) + "/sales"
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.error || "የሽያጭ ታሪኩን ማምጣት አልተቻለም።"
            );
        }

        if (!data.sales || !data.sales.length) {
            alert("📋 እስካሁን የተመዘገበ ሽያጭ የለም።");
            return;
        }

        let modal = document.getElementById("salesHistoryModal");

        if (!modal) {
            modal = document.createElement("div");
            modal.id = "salesHistoryModal";
            modal.className = "sales-modal";

            modal.innerHTML = `
                <div
                    class="sales-modal-overlay"
                    onclick="closeSalesHistoryModal()"
                ></div>

                <div class="sales-modal-box history-modal-box">

                    <button
                        type="button"
                        class="sales-modal-close"
                        onclick="closeSalesHistoryModal()"
                        aria-label="Close"
                    >×</button>

                    <div class="sales-modal-header">
                        <div class="sales-modal-icon">📋</div>

                        <div>
                            <h2>የሽያጭ ታሪክ</h2>
                            <p id="salesHistoryProductName">ምርት</p>
                        </div>
                    </div>

                    <div
                        id="salesHistorySummary"
                        class="history-summary"
                    ></div>

                    <div
                        id="salesHistoryList"
                        class="history-list"
                    ></div>

                    <div class="sales-modal-actions">
                        <button
                            type="button"
                            class="sales-cancel-btn"
                            onclick="closeSalesHistoryModal()"
                        >
                            ✖️ ዝጋ
                        </button>
                    </div>

                </div>
            `;

            document.body.appendChild(modal);
        }

        const productNameEl =
            document.getElementById("salesHistoryProductName");

        const summaryEl =
            document.getElementById("salesHistorySummary");

        const listEl =
            document.getElementById("salesHistoryList");

        let historyProductUnit = "pcs";

        if (productNameEl) {
            try {
                const product = await getProduct(id);

                historyProductUnit =
                    product.unit || "pcs";

                productNameEl.textContent =
                    "🎁 " + (product.productName || "ምርት");

            } catch (e) {
                productNameEl.textContent =
                    "🎁 የምርት ሽያጭ";
            }
        }

        const summary = data.summary || {};

        if (summaryEl) {
            summaryEl.innerHTML = `
                <div class="history-summary-title">
                    📊 ጠቅላላ ማጠቃለያ
                </div>

                <div class="history-summary-grid">

                    <div class="history-summary-item">
                        <span>🔢 ብዛት</span>
                        <strong>${summary.quantity || 0} ${historyProductUnit}</strong>
                    </div>

                    <div class="history-summary-item">
                        <span>💵 ሽያጭ</span>
                        <strong>${money(summary.totalSales || 0)}</strong>
                    </div>

                    <div class="history-summary-item">
                        <span>🛠️ ወጪ</span>
                        <strong>${money(summary.totalCost || 0)}</strong>
                    </div>

                    <div class="history-summary-item profit">
                        <span>📈 ትርፍ</span>
                        <strong>${money(summary.totalProfit || 0)}</strong>
                    </div>

                </div>
            `;
        }

        if (listEl) {
            listEl.innerHTML = data.sales.map((sale, index) => `
                <div class="history-sale-card">

                    <div class="history-sale-top">
                        <div class="history-sale-number">
                            #${index + 1}
                        </div>

                        <div class="history-sale-date">
                            📅 ${formatEthiopianDate(sale.saleDate)}
                        </div>
                    </div>

                    <div class="history-sale-details">

                        <div>
                            <span>🔢 ብዛት</span>
                            <strong>${sale.quantity || 0} ${sale.unit || historyProductUnit}</strong>
                        </div>

                        ${isAreaUnit(sale.unit) ? `
                        <div style="
                            grid-column:1/-1;
                            margin:8px 0;
                            padding:8px;
                            border-radius:8px;
                            background:#f7f9fc;
                            border:1px solid #e6eaf0;
                        ">
                            <div>📐 መጠን: ${sale.length ?? "—"} × ${sale.width ?? "—"} ${escapeHtml(sale.dimensionUnit || "")}</div>
                            <div>⬛ ስፋት: ${sale.area ?? "—"} ${escapeHtml(sale.areaUnit || sale.unit || "")}</div>
                            <div>📏 Thickness: ${
                                sale.thickness === null ||
                                sale.thickness === undefined ||
                                sale.thickness === ""
                                    ? "—"
                                    : `${sale.thickness} ${escapeHtml(sale.thicknessUnit || "")}`
                            }</div>
                        </div>
                        ` : ""}
                        <div>
                            <span>💰 ሽያጭ</span>
                            <strong>${money(sale.totalSales || 0)}</strong>
                        </div>

                        <div>
                            <span>🛠️ ወጪ</span>
                            <strong>${money(sale.totalCost || 0)}</strong>
                        </div>

                        <div class="history-profit">
                            <span>📈 ትርፍ</span>
                            <strong>${money(sale.totalProfit || 0)}</strong>
                        </div>

                    </div>

                </div>
            `).join("");
        }

        modal.setAttribute("aria-hidden", "false");
        modal.classList.add("active");

    } catch (error) {

        console.error(
            "Self Product Sales History Error:",
            error
        );

        alert(
            "❌ የሽያጭ ታሪኩን ማምጣት አልተቻለም።\n" +
            error.message
        );
    }
};

window.closeSalesHistoryModal = function() {

    const modal =
        document.getElementById("salesHistoryModal");

    if (!modal) return;

    modal.setAttribute("aria-hidden", "true");
    modal.classList.remove("active");
};

async function getProduct(id) {
        const response = await fetch(`${API}/${encodeURIComponent(id)}`);

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.error || "ምርቱ አልተገኘም።"
            );
        }

        return data.product;
    }

    window.editSelfProduct = async function(id) {
        try {
            const product = await getProduct(id);

            editingId = id;

            if (name) name.value = product.productName || "";
            if (type) type.value = product.productType || "";
            if (description) {
                description.value =
                    product.productDescription || "";
            }

            if (productUnit) productUnit.value = product.unit || "pcs";
            if (productLength) productLength.value = product.length ?? 0;
            if (productWidth) productWidth.value = product.width ?? 0;
            if (productDimensionUnit) productDimensionUnit.value = product.dimensionUnit || "cm";
            if (productThickness) productThickness.value = product.thickness ?? "";
            if (productThicknessUnit) productThicknessUnit.value = product.thicknessUnit || "";
            if (quantity) quantity.value = product.quantity ?? 0;
            if (stock) stock.value = product.stock ?? 0;
            if (sellPrice) sellPrice.value = product.sellPrice ?? 0;
            if (unitCost) unitCost.value = product.unitCost ?? 0;
            if (date) date.value = product.productionDate || "";

            calculate();

            const submitButton =
                form?.querySelector('button[type="submit"]');

            if (submitButton) {
                submitButton.textContent =
                    "💾 የተሻሻለውን አስቀምጥ";
            }

            window.scrollTo({
                top: form?.offsetTop || 0,
                behavior: "smooth"
            });

        } catch (error) {
            console.error(error);
            alert(
                "❌ ምርቱን ማምጣት አልተቻለም።\n" +
                error.message
            );
        }
    };

    window.deleteSelfProduct = async function(id) {
        const ok = confirm(
            "ይህን ምርት ለመሰረዝ እርግጠኛ ነዎት?"
        );

        if (!ok) return;

        try {
            const response = await fetch(
                `${API}/${encodeURIComponent(id)}`,
                {
                    method: "DELETE"
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.error || "Delete failed"
                );
            }

            alert("✅ ምርቱ ተሰርዟል።");

            await loadProducts();

        } catch (error) {
            console.error(error);

            alert(
                "❌ ምርቱን መሰረዝ አልተቻለም።\n" +
                error.message
            );
        }
    };

    if (form) {
        form.addEventListener("submit", async event => {
            event.preventDefault();

            const product = {
                productName: name?.value || "",
                productType: type?.value || "",
                productDescription: description?.value || "",
                quantity: number(quantity?.value),
                stock: number(stock?.value),
                sellPrice: number(sellPrice?.value),
                unitCost: number(unitCost?.value),
                unit: productUnit?.value || "pcs",
                length: number(productLength?.value),
                width: number(productWidth?.value),
                dimensionUnit: productDimensionUnit?.value || "cm",
                thickness: productThickness?.value === "" ? undefined : number(productThickness?.value),
                thicknessUnit: productThickness?.value === "" ? "" : (productThicknessUnit?.value || ""),
                productionDate: date?.value || "",
                photoUrl: ""
            };

            if (!product.productName.trim()) {
                alert("❌ የምርት ስም ያስፈልጋል።");
                return;
            }

            const submitButton =
                form.querySelector('button[type="submit"]');

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = "⏳ እየተቀመጠ...";
            }

            try {
                const url = editingId
                    ? `${API}/${encodeURIComponent(editingId)}`
                    : API;

                const method = editingId
                    ? "PATCH"
                    : "POST";

                const response = await fetch(url, {
                    method,
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(product)
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(
                        data.error ||
                        "ምርቱን ማስቀመጥ አልተቻለም።"
                    );
                }

                alert(
                    editingId
                        ? "✅ ምርቱ ተስተካክሏል።"
                        : "✅ ምርቱ Firebase ላይ ተቀምጧል።"
                );

                editingId = null;

                form.reset();

                if (submitButton) {
                    submitButton.textContent =
                        "💾 ምርቱን አስቀምጥ";
                }

                calculate();

                if (preview) {
                    preview.innerHTML = "";
                }

                await loadProducts();

            } catch (error) {
                console.error(
                    "Self Product Save Error:",
                    error
                );

                alert(
                    "❌ ምርቱን ማስቀመጥ አልተቻለም።\n" +
                    error.message
                );

            } finally {
                if (submitButton) {
                    submitButton.disabled = false;

                    if (editingId) {
                        submitButton.textContent =
                            "💾 የተሻሻለውን አስቀምጥ";
                    } else {
                        submitButton.textContent =
                            "💾 ምርቱን አስቀምጥ";
                    }
                }
            }
        });
    }

    calculate();
    loadProducts();

})();
