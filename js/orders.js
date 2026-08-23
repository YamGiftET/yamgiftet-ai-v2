// =====================================================
// YamGiftET AI v2 — NEW ORDER SYSTEM
// =====================================================

(function () {
    "use strict";

    function el(id) {
        return document.getElementById(id);
    }

    function num(id) {
        return Number(el(id)?.value || 0);
    }

    // -------------------------------------------------
    // 💰 Calculate money
    // -------------------------------------------------
    function calculateOrderAmounts() {
        const total = Math.max(num("orderTotalAmount"), 0);
        const deposit = Math.max(num("orderDeposit"), 0);
        const workCost = Math.max(num("orderWorkCost"), 0);

        const remaining = Math.max(total - deposit, 0);
        const profit = total - workCost;

        if (el("orderRemaining")) {
            el("orderRemaining").value = remaining.toFixed(2);
        }

        if (el("orderProfit")) {
            el("orderProfit").value = profit.toFixed(2);
        }

        return {
            totalAmount: total,
            deposit,
            remaining,
            workCost,
            profit
        };
    }

    // -------------------------------------------------
    // 📸 Photo preview
    // -------------------------------------------------
    function previewOrderPhoto() {
        const input = el("orderPhoto");
        const preview = el("orderPhotoPreview");

        if (!input || !preview) return;

        const file = input.files?.[0];

        if (!file) {
            preview.src = "";
            preview.style.display = "none";
            return;
        }

        if (!file.type.startsWith("image/")) {
            alert("እባክዎ የምስል ፋይል ብቻ ይምረጡ።");
            input.value = "";
            return;
        }

        const reader = new FileReader();

        reader.onload = function (event) {
            preview.src = event.target.result;
            preview.style.display = "block";
        };

        reader.readAsDataURL(file);
    }

    // -------------------------------------------------
    // 📅 Ethiopian date
    // -------------------------------------------------
    function getDate(prefix) {
        if (typeof getEthiopianDate === "function") {
            return getEthiopianDate(prefix);
        }

        const y = el(prefix + "Year")?.value || "";
        const m = el(prefix + "Month")?.value || "";
        const d = el(prefix + "Day")?.value || "";

        if (!y || !m || !d) return "";

        return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }

    function getGregorianDate(prefix) {
        if (typeof ethiopianDateToISO === "function") {
            return ethiopianDateToISO(prefix);
        }

        return "";
    }

    // -------------------------------------------------
    // 📸 Upload + save order
    // -------------------------------------------------
    async function submitOrderForm(event) {
        event.preventDefault();

        const submitButton = event.submitter;

        try {
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = "⏳ በማስቀመጥ ላይ...";
            }

            const customerName =
                el("orderCustomerName")?.value.trim() || "";

            const phone =
                el("orderPhone")?.value.trim() || "";

            const productName =
                el("orderProductName")?.value.trim() || "";

            const orderInfo =
                el("orderInfo")?.value.trim() || "";

            const notes =
                el("orderNotes")?.value.trim() || "";

            if (!customerName || !phone || !productName) {
                throw new Error(
                    "የደንበኛ ስም፣ ስልክ እና ምርት መሙላት አለባቸው።"
                );
            }

            const money = calculateOrderAmounts();

            const orderDate = getDate("orderDate");
            const pickupDate = getDate("pickupDate");

            const orderDateGregorian =
                getGregorianDate("orderDate");

            const pickupDateGregorian =
                getGregorianDate("pickupDate");

            const status =
                el("orderStatus")?.value || "አዲስ";

            const photoInput = el("orderPhoto");
            const photoFile = photoInput?.files?.[0] || null;

            const formData = new FormData();

            formData.append("customerName", customerName);
            formData.append("phone", phone);
            formData.append("productName", productName);
            formData.append("productId", "");
            formData.append("orderInfo", orderInfo);

            formData.append(
                "totalAmount",
                String(money.totalAmount)
            );

            formData.append(
                "deposit",
                String(money.deposit)
            );

            formData.append(
                "remaining",
                String(money.remaining)
            );

            formData.append(
                "workCost",
                String(money.workCost)
            );

            formData.append(
                "profit",
                String(money.profit)
            );

            formData.append("orderDate", orderDate);
            formData.append(
                "orderDateGregorian",
                orderDateGregorian
            );

            formData.append("pickupDate", pickupDate);
            formData.append(
                "pickupDateGregorian",
                pickupDateGregorian
            );

            formData.append("status", status);
            formData.append("notes", notes);

            if (photoFile) {
                formData.append("photo", photoFile);
            }

            console.log("📦 ትዕዛዝ እየተላከ ነው...");

            const response = await fetch("/api/orders", {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.error ||
                    "ትዕዛዙን ማስቀመጥ አልተቻለም።"
                );
            }

            console.log(
                "✅ Order saved:",
                data.orderId
            );

            alert(
                "✅ ትዕዛዙ በትክክል ተመዝግቧል።\n\n" +
                "🆔 Order ID: " +
                data.orderId
            );

            const form = el("orderForm");

            if (form) {
                form.reset();
            }

            const preview = el("orderPhotoPreview");

            if (preview) {
                preview.src = "";
                preview.style.display = "none";
            }

            calculateOrderAmounts();

            // Refresh dashboard if available
            if (typeof window.loadOrders === "function") {
                try {
                    await window.loadOrders();
                } catch (e) {
                    console.warn(
                        "Dashboard refresh skipped:",
                        e
                    );
                }
            }

        } catch (error) {
            console.error(
                "❌ Order Save Error:",
                error
            );

            alert(
                "❌ ትዕዛዙ አልተመዘገበም።\n\n" +
                error.message
            );

        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent =
                    "💾 ትዕዛዙን አስቀምጥ";
            }
        }
    }

    // -------------------------------------------------
    // 🚀 Initialize
    // -------------------------------------------------
    document.addEventListener(
        "DOMContentLoaded",
        function () {

            const form = el("orderForm");

            if (form) {
                form.addEventListener(
                    "submit",
                    submitOrderForm
                );
            }

            const photoInput = el("orderPhoto");

            if (photoInput) {
                photoInput.addEventListener(
                    "change",
                    previewOrderPhoto
                );
            }

            [
                "orderTotalAmount",
                "orderDeposit",
                "orderWorkCost"
            ].forEach(function (id) {
                const input = el(id);

                if (input) {
                    input.addEventListener(
                        "input",
                        calculateOrderAmounts
                    );
                }
            });

            calculateOrderAmounts();

            console.log(
                "✅ NEW YamGiftET Order System initialized"
            );
        }
    );

    // Make available globally
    window.calculateOrderAmounts =
        calculateOrderAmounts;

    window.previewOrderPhoto =
        previewOrderPhoto;

    window.submitOrderForm =
        submitOrderForm;

})();
