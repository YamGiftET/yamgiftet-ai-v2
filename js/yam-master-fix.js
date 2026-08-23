/*
============================================================
 YamGiftET AI — MASTER FIX MODULE
 Safe additive module
 Does NOT replace dashboard.js
============================================================
*/

(function () {
    "use strict";

    console.log("🚀 YamGiftET Master Fix Module loading...");

    /* =====================================================
       1. MONEY HELPERS
    ===================================================== */

    function num(value) {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    }

    function money(value) {
        return Math.round(num(value));
    }

    function calculateOrderMoney(order) {
        order = order || {};

        const total =
            num(order.totalAmount) ||
            num(order.total) ||
            num(order.agreedPrice);

        const deposit =
            num(order.deposit) ||
            num(order.paid) ||
            num(order.paidAmount);

        const workCost =
            num(order.workCost) ||
            num(order.cost) ||
            num(order.expense);

        const remaining =
            Math.max(0, total - deposit);

        const profit =
            total - workCost;

        return {
            total: money(total),
            deposit: money(deposit),
            remaining: money(remaining),
            workCost: money(workCost),
            profit: money(profit)
        };
    }

    window.yamMasterCalculateMoney = calculateOrderMoney;


    /* =====================================================
       2. DELIVERY DETECTION
    ===================================================== */

    function isDelivered(order) {
        if (!order || typeof order !== "object") {
            return false;
        }

        const normalize = value =>
            String(value ?? "")
                .trim()
                .toLowerCase()
                .replace(/[።.]+$/g, "");

        const values = [
            order.status,
            order.deliveryStatus,
            order.orderStatus
        ].map(normalize);

        const delivered = new Set([
            "ተሰጥቷል",
            "ተረክቧል",
            "ተረከበ",
            "delivered",
            "delivery",
            "completed",
            "complete",
            "done",
            "delivered_order"
        ]);

        if (values.some(v => delivered.has(v))) {
            return true;
        }

        if (
            order.delivered === true ||
            order.isDelivered === true ||
            order.completed === true
        ) {
            return true;
        }

        if (
            order.deliveredAt ||
            order.deliveryDate ||
            order.deliveredDate
        ) {
            return true;
        }

        return false;
    }

    window.yamMasterIsDelivered = isDelivered;


    /* =====================================================
       3. SAFE DELIVERY ACTION
    ===================================================== */

    window.yamMasterDeliverOrder = async function (orderId) {

        if (!orderId) {
            alert("❌ የትዕዛዝ ID አልተገኘም።");
            return;
        }

        const ok = confirm(
            "📦 ይህ ስራ ለደንበኛው ተረክቧል?"
        );

        if (!ok) return;

        try {

            const response = await fetch(
                "/api/orders/" +
                encodeURIComponent(orderId),
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        status: "ተሰጥቷል",
                        deliveryStatus: "delivered",
                        delivered: true,
                        isDelivered: true,
                        deliveredAt:
                            new Date().toISOString()
                    })
                }
            );

            const result =
                await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    result.error ||
                    "የተረከበ ሁኔታ ማስቀመጥ አልተቻለም።"
                );
            }

            alert(
                "✅ ስራው እንደተረከበ ተመዝግቧል።"
            );

            location.reload();

        } catch (error) {

            console.error(
                "Yam Master Delivery Error:",
                error
            );

            alert(
                "❌ የተረከበ ሁኔታ ማስቀመጥ አልተቻለም።\n" +
                error.message
            );
        }
    };


    /* =====================================================
       4. DEPOSIT / REMAINING / PROFIT AUTO CALCULATION
    ===================================================== */

    function setupMoneyCalculation() {

        const total =
            document.getElementById("totalAmount") ||
            document.getElementById("orderTotal") ||
            document.getElementById("agreedPrice") ||
            document.querySelector(
                '[name="totalAmount"]'
            );

        const deposit =
            document.getElementById("deposit") ||
            document.getElementById("paidAmount") ||
            document.querySelector(
                '[name="deposit"]'
            );

        const cost =
            document.getElementById("workCost") ||
            document.getElementById("orderWorkCost") ||
            document.querySelector(
                '[name="workCost"]'
            );

        const remaining =
            document.getElementById("remaining") ||
            document.querySelector(
                '[name="remaining"]'
            );

        const profit =
            document.getElementById("profit") ||
            document.querySelector(
                '[name="profit"]'
            );

        if (!total && !deposit && !cost) {
            return;
        }

        function update() {

            const data =
                calculateOrderMoney({
                    totalAmount:
                        total ? total.value : 0,

                    deposit:
                        deposit ? deposit.value : 0,

                    workCost:
                        cost ? cost.value : 0
                });

            if (remaining) {
                remaining.value =
                    data.remaining;
                remaining.textContent =
                    data.remaining + " ብር";
            }

            if (profit) {
                profit.value =
                    data.profit;
                profit.textContent =
                    data.profit + " ብር";
            }
        }

        [
            total,
            deposit,
            cost
        ].forEach(input => {

            if (input) {
                input.addEventListener(
                    "input",
                    update
                );

                input.addEventListener(
                    "change",
                    update
                );
            }

        });

        update();
    }


    /* =====================================================
       5. DELIVERY COUNTDOWN
    ===================================================== */

    function getCountdown(dateValue) {

        if (!dateValue) {
            return {
                text: "ቀን አልተወሰነም",
                className: "delivery-unknown"
            };
        }

        const target =
            new Date(dateValue);

        if (Number.isNaN(target.getTime())) {
            return {
                text: "ቀን አልተለየም",
                className: "delivery-unknown"
            };
        }

        const now = new Date();

        const diff =
            target.getTime() -
            now.getTime();

        const day =
            24 * 60 * 60 * 1000;

        const days =
            Math.ceil(diff / day);

        if (days < 0) {
            return {
                text:
                    "⚠️ " +
                    Math.abs(days) +
                    " ቀን ዘግይቷል",
                className:
                    "delivery-overdue"
            };
        }

        if (days === 0) {
            return {
                text:
                    "🔥 ዛሬ ማስረከብ አለበት",
                className:
                    "delivery-today"
            };
        }

        if (days <= 2) {
            return {
                text:
                    "⏳ " +
                    days +
                    " ቀን ቀርቷል",
                className:
                    "delivery-warning"
            };
        }

        return {
            text:
                "📅 " +
                days +
                " ቀን ቀርቷል",
            className:
                "delivery-safe"
        };
    }

    window.yamMasterDeliveryCountdown =
        getCountdown;


    /* =====================================================
       6. REFRESH COUNTDOWNS
    ===================================================== */

    function refreshCountdowns() {

        document
            .querySelectorAll(
                "[data-pickup-date]"
            )
            .forEach(element => {

                const date =
                    element.getAttribute(
                        "data-pickup-date"
                    );

                const result =
                    getCountdown(date);

                element.textContent =
                    result.text;

                element.className =
                    "delivery-countdown " +
                    result.className;
            });
    }

    window.yamMasterRefreshCountdowns =
        refreshCountdowns;


    /* =====================================================
       7. STYLE
    ===================================================== */

    function addStyles() {

        if (
            document.getElementById(
                "yam-master-fix-style"
            )
        ) {
            return;
        }

        const style =
            document.createElement("style");

        style.id =
            "yam-master-fix-style";

        style.textContent = `
            .delivery-countdown {
                display: inline-block;
                padding: 5px 9px;
                border-radius: 8px;
                font-weight: 700;
                font-size: 13px;
                margin-top: 4px;
            }

            .delivery-safe {
                background: #e8f5e9;
                color: #176b2c;
            }

            .delivery-warning {
                background: #fff3cd;
                color: #856404;
            }

            .delivery-today {
                background: #ffe0b2;
                color: #a04b00;
            }

            .delivery-overdue {
                background: #ffebee;
                color: #b71c1c;
            }

            .delivery-unknown {
                background: #eeeeee;
                color: #555;
            }

            .yam-master-delivered {
                background: #e8f5e9;
                border-left: 4px solid #2e7d32;
            }
        `;

        document.head.appendChild(style);
    }


    /* =====================================================
       8. START
    ===================================================== */

    function start() {

        addStyles();

        setupMoneyCalculation();

        refreshCountdowns();

        setInterval(
            refreshCountdowns,
            60 * 1000
        );

        console.log(
            "✅ YamGiftET Master Fix loaded successfully."
        );

        console.log(
            "✅ Deposit / Remaining / Profit enabled."
        );

        console.log(
            "✅ Delivery countdown enabled."
        );

        console.log(
            "✅ Delivery detection enabled."
        );
    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            start
        );

    } else {

        start();

    }

})();
