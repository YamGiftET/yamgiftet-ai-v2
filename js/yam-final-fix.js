(function () {
    "use strict";

    console.log("🚀 YamGiftET Final Delivery + Countdown Fix loading...");

    /* =========================================================
       HELPERS
       ========================================================= */

    function clean(value) {
        return String(value ?? "").trim();
    }

    function delivered(order) {
        if (!order || typeof order !== "object") {
            return false;
        }

        const values = [
            order.status,
            order.deliveryStatus,
            order.orderStatus
        ]
            .map(v => clean(v).toLowerCase());

        const deliveredValues = [
            "ተሰጥቷል",
            "ተረክቧል",
            "ተረክቧል።",
            "ተረከበ",
            "delivered",
            "delivery",
            "completed",
            "complete",
            "done",
            "delivered_order"
        ];

        if (values.some(v => deliveredValues.includes(v))) {
            return true;
        }

        if (
            order.delivered === true ||
            order.isDelivered === true ||
            order.completed === true
        ) {
            return true;
        }

        return !!(
            order.deliveredAt ||
            order.deliveryDate ||
            order.deliveredDate
        );
    }

    function money(value) {
        return (
            Number(value || 0)
                .toLocaleString("en-US") + " ብር"
        );
    }

    function getOrdersFromAPI() {
        return fetch("/api/orders", {
            method: "GET",
            cache: "no-store"
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error("Orders API failed: " + response.status);
                }

                return response.json();
            })
            .then(data => {
                return Array.isArray(data.orders)
                    ? data.orders
                    : [];
            });
    }

    /* =========================================================
       1. DELIVERY ACTION
       ========================================================= */

    window.markYamOrderDelivered = async function (orderId) {
        try {
            const orders = await getOrdersFromAPI();

            const order = orders.find(
                item =>
                    String(item.id) === String(orderId)
            );

            if (!order) {
                alert("❌ ትዕዛዙ አልተገኘም።");
                return;
            }

            const confirmed = confirm(
                "📦 ይህ ስራ ለደንበኛው ተረክቧል?"
            );

            if (!confirmed) {
                return;
            }

            const now = new Date().toISOString();

            const updatedOrder = {
                ...order,

                status: "ተሰጥቷል",

                deliveryStatus: "delivered",

                orderStatus: "ተሰጥቷል",

                delivered: true,

                isDelivered: true,

                completed: true,

                deliveredAt: now,

                deliveryDate: now,

                deliveredDate: now
            };

            const response = await fetch(
                "/api/orders/" +
                encodeURIComponent(orderId),
                {
                    method: "PATCH",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify(
                        updatedOrder
                    )
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.error ||
                    "Delivery update failed"
                );
            }

            alert(
                "✅ ስራው ተረክቧል።\n\n" +
                "📦 ወደ 'የተረከቡ ስራዎች' ይገባል።"
            );

            /*
             * እዚህ reload እናደርጋለን።
             * Firebase/API ላይ የተመዘገበውን
             * አዲስ status እንዲያነብ።
             */
            window.location.reload();

        } catch (error) {

            console.error(
                "❌ FINAL DELIVERY ERROR:",
                error
            );

            alert(
                "❌ ተረክቧል ሁኔታን ማስቀመጥ አልተቻለም።\n\n" +
                error.message
            );
        }
    };


    /* =========================================================
       2. DELIVERED ORDERS RENDER
       ========================================================= */

    async function renderFinalDeliveredOrders() {
        try {

            const orders =
                await getOrdersFromAPI();

            const deliveredOrders =
                orders.filter(delivered);

            /*
             * የተረከቡ ስራዎች heading ፈልግ
             */
            const headings =
                Array.from(
                    document.querySelectorAll(
                        "h1,h2,h3,h4,h5,h6"
                    )
                );

            const heading =
                headings.find(el =>
                    clean(el.textContent)
                        .includes("የተረከቡ ስራዎች")
                );

            if (!heading) {
                console.warn(
                    "⚠️ Delivered section heading not found."
                );
                return;
            }

            /*
             * Heading ከኋላ ያለውን table ፈልግ
             */
            let container =
                heading.parentElement;

            let table =
                container &&
                container.querySelector("table");

            if (!table) {
                table =
                    heading.nextElementSibling &&
                    heading.nextElementSibling
                        .querySelector("table");
            }

            if (!table) {
                table =
                    heading.parentElement.parentElement
                        ?.querySelector("table");
            }

            if (!table) {
                console.warn(
                    "⚠️ Delivered table not found."
                );
                return;
            }

            let tbody =
                table.querySelector("tbody");

            if (!tbody) {
                tbody =
                    document.createElement("tbody");

                table.appendChild(tbody);
            }

            /*
             * Clear old rows
             */
            tbody.innerHTML = "";

            if (!deliveredOrders.length) {

                const row =
                    document.createElement("tr");

                row.innerHTML = `
                    <td
                        colspan="8"
                        style="
                            text-align:center;
                            padding:20px;
                        "
                    >
                        እስካሁን የተረከበ ስራ የለም።
                    </td>
                `;

                tbody.appendChild(row);

            } else {

                deliveredOrders.forEach(order => {

                    const row =
                        document.createElement("tr");

                    const deliveredAt =
                        order.deliveredAt ||
                        order.deliveryDate ||
                        order.deliveredDate ||
                        "-";

                    let readableDate = "-";

                    if (deliveredAt !== "-") {

                        const date =
                            new Date(deliveredAt);

                        if (
                            !Number.isNaN(
                                date.getTime()
                            )
                        ) {
                            readableDate =
                                date.toLocaleDateString(
                                    "en-CA"
                                );
                        }
                    }

                    row.innerHTML = `
                        <td>
                            ${clean(order.customerName || "-")}
                        </td>

                        <td>
                            ${clean(order.phone || "-")}
                        </td>

                        <td>
                            ${clean(
                                order.product ||
                                order.productName ||
                                "-"
                            )}
                        </td>

                        <td>
                            ${clean(
                                order.orderDate ||
                                "-"
                            )}
                        </td>

                        <td>
                            ${readableDate}
                        </td>

                        <td>
                            ${money(order.totalAmount)}
                        </td>

                        <td>
                            ${money(order.workCost)}
                        </td>

                        <td>
                            ${money(
                                order.profit ??
                                (
                                    Number(
                                        order.totalAmount || 0
                                    ) -
                                    Number(
                                        order.workCost || 0
                                    )
                                )
                            )}
                        </td>
                    `;

                    tbody.appendChild(row);
                });
            }

            /*
             * Summary
             */
            const totalSales =
                deliveredOrders.reduce(
                    (sum, order) =>
                        sum +
                        Number(
                            order.totalAmount || 0
                        ),
                    0
                );

            const totalCost =
                deliveredOrders.reduce(
                    (sum, order) =>
                        sum +
                        Number(
                            order.workCost || 0
                        ),
                    0
                );

            const totalProfit =
                deliveredOrders.reduce(
                    (sum, order) =>
                        sum +
                        Number(
                            order.profit ??
                            (
                                Number(
                                    order.totalAmount || 0
                                ) -
                                Number(
                                    order.workCost || 0
                                )
                            )
                        ),
                    0
                );

            /*
             * Section ውስጥ summary text ላይ
             * በቀጥታ አስቀምጥ
             */
            const sectionText =
                heading.parentElement;

            if (sectionText) {

                const summary =
                    sectionText.querySelector(
                        ".yam-final-delivered-summary"
                    );

                const summaryHTML = `
                    <div
                        class="yam-final-delivered-summary"
                        style="
                            display:flex;
                            flex-wrap:wrap;
                            gap:10px;
                            margin:12px 0;
                        "
                    >
                        <span>
                            📦 <b>${deliveredOrders.length}</b>
                            ስራ
                        </span>

                        <span>
                            💰 <b>${money(totalSales)}</b>
                            ጠቅላላ ሽያጭ
                        </span>

                        <span>
                            🛠️ <b>${money(totalCost)}</b>
                            የሥራ ወጪ
                        </span>

                        <span>
                            📈 <b>${money(totalProfit)}</b>
                            ትርፍ
                        </span>
                    </div>
                `;

                if (summary) {
                    summary.outerHTML =
                        summaryHTML;
                } else {
                    heading.insertAdjacentHTML(
                        "afterend",
                        summaryHTML
                    );
                }
            }

            console.log(
                "✅ Delivered orders rendered:",
                deliveredOrders.length
            );

        } catch (error) {

            console.error(
                "❌ Delivered render error:",
                error
            );
        }
    }


    /* =========================================================
       3. DELIVERY COUNTDOWN
       ========================================================= */

    function parsePickupDate(value) {

        if (!value) {
            return null;
        }

        const raw =
            clean(value);

        /*
         * ከ Ethiopian calendar helper ጋር
         * ከተመዘገበ መጀመሪያ ሞክር
         */
        try {

            if (
                typeof window
                    .ethiopianDateToISO ===
                "function"
            ) {

                const converted =
                    window.ethiopianDateToISO(
                        raw
                    );

                if (converted) {

                    const d =
                        new Date(converted);

                    if (
                        !Number.isNaN(
                            d.getTime()
                        )
                    ) {
                        return d;
                    }
                }
            }

        } catch (e) {
            console.warn(
                "Ethiopian date conversion skipped:",
                e
            );
        }

        /*
         * ISO / normal date fallback
         */
        const direct =
            new Date(raw);

        if (
            !Number.isNaN(
                direct.getTime()
            )
        ) {
            return direct;
        }

        return null;
    }


    function countdownText(pickupDate) {

        const target =
            parsePickupDate(
                pickupDate
            );

        if (!target) {
            return {
                text: "📅 ቀን የለም",
                className:
                    "yam-countdown-unknown"
            };
        }

        const now =
            new Date();

        /*
         * የቀኑን ክፍል ብቻ ለመነጻጸር
         */
        const today =
            new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate()
            );

        const targetDay =
            new Date(
                target.getFullYear(),
                target.getMonth(),
                target.getDate()
            );

        const diff =
            Math.round(
                (
                    targetDay.getTime() -
                    today.getTime()
                ) /
                86400000
            );

        if (diff > 1) {

            return {
                text:
                    `⏳ ${diff} ቀን ቀርቷል`,
                className:
                    "yam-countdown-safe"
            };
        }

        if (diff === 1) {

            return {
                text:
                    "⏳ 1 ቀን ቀርቷል",
                className:
                    "yam-countdown-warning"
            };
        }

        if (diff === 0) {

            return {
                text:
                    "🔥 ዛሬ ነው",
                className:
                    "yam-countdown-today"
            };
        }

        if (diff === -1) {

            return {
                text:
                    "⚠️ 1 ቀን አልፏል",
                className:
                    "yam-countdown-overdue"
            };
        }

        return {
            text:
                `🚨 ${Math.abs(diff)} ቀን አልፏል`,
            className:
                "yam-countdown-overdue"
        };
    }


    function addCountdownStyles() {

        if (
            document.getElementById(
                "yam-final-countdown-style"
            )
        ) {
            return;
        }

        const style =
            document.createElement("style");

        style.id =
            "yam-final-countdown-style";

        style.textContent = `
            .yam-final-countdown {
                display:inline-block;
                margin-top:5px;
                padding:4px 8px;
                border-radius:7px;
                font-size:12px;
                font-weight:700;
                white-space:nowrap;
            }

            .yam-countdown-safe {
                background:#e8f5e9;
                color:#1b5e20;
            }

            .yam-countdown-warning {
                background:#fff8e1;
                color:#e65100;
            }

            .yam-countdown-today {
                background:#fff3e0;
                color:#e65100;
            }

            .yam-countdown-overdue {
                background:#ffebee;
                color:#b71c1c;
            }

            .yam-countdown-unknown {
                background:#eeeeee;
                color:#555;
            }
        `;

        document.head.appendChild(style);
    }


    async function renderCountdowns() {

        try {

            addCountdownStyles();

            const orders =
                await getOrdersFromAPI();

            /*
             * Main orders table
             */
            const tables =
                Array.from(
                    document.querySelectorAll(
                        "table"
                    )
                );

            const mainTable =
                tables.find(table =>
                    clean(
                        table.textContent
                    ).includes("የመረከቢያ ቀን")
                );

            if (!mainTable) {

                console.warn(
                    "⚠️ Main orders table not found."
                );

                return;
            }

            const rows =
                Array.from(
                    mainTable.querySelectorAll(
                        "tbody tr"
                    )
                );

            rows.forEach(row => {

                const cells =
                    Array.from(
                        row.querySelectorAll("td")
                    );

                if (!cells.length) {
                    return;
                }

                /*
                 * customer name ከ order ጋር
                 * ለመያያዝ id በbutton onclick
                 * ወይም row data እንፈልጋለን።
                 */
                const deliveryButton =
                    row.querySelector(
                        '[onclick*="markYamOrderDelivered"]'
                    );

                if (!deliveryButton) {
                    return;
                }

                const match =
                    clean(
                        deliveryButton
                            .getAttribute("onclick")
                    ).match(
                        /markYamOrderDelivered\(['"]([^'"]+)['"]\)/
                    );

                if (!match) {
                    return;
                }

                const orderId =
                    match[1];

                const order =
                    orders.find(
                        item =>
                            String(item.id) ===
                            String(orderId)
                    );

                if (!order) {
                    return;
                }

                if (delivered(order)) {
                    return;
                }

                const pickupDate =
                    order.pickupDate;

                const result =
                    countdownText(
                        pickupDate
                    );

                /*
                 * የመረከቢያ ቀን cell
                 */
                let pickupCell =
                    cells.find(cell =>
                        clean(
                            cell.textContent
                        ).includes(
                            clean(
                                pickupDate
                            )
                        )
                    );

                /*
                 * fallback:
                 * የ order row ውስጥ ቀን ያለበት cell
                 */
                if (!pickupCell) {

                    pickupCell =
                        cells.find(cell =>
                            /\d{4}-\d{1,2}-\d{1,2}/
                                .test(
                                    clean(
                                        cell.textContent
                                    )
                                )
                        );
                }

                if (!pickupCell) {
                    return;
                }

                let badge =
                    pickupCell.querySelector(
                        ".yam-final-countdown"
                    );

                if (!badge) {

                    badge =
                        document.createElement(
                            "div"
                        );

                    badge.className =
                        "yam-final-countdown";

                    pickupCell.appendChild(
                        badge
                    );
                }

                badge.className =
                    "yam-final-countdown " +
                    result.className;

                badge.textContent =
                    result.text;
            });

            console.log(
                "✅ Delivery countdown rendered."
            );

        } catch (error) {

            console.error(
                "❌ Countdown error:",
                error
            );
        }
    }


    /* =========================================================
       4. RUN AFTER DASHBOARD LOAD
       ========================================================= */

    async function finalFixRun() {

        /*
         * Dashboard እንዲጀምር ትንሽ ጊዜ
         */
        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    1200
                )
        );

        await renderFinalDeliveredOrders();

        await renderCountdowns();
    }


    /*
     * DOM ready
     */
    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            finalFixRun
        );

    } else {

        finalFixRun();
    }


    /*
     * Dashboard reload ከሆነ
     * እንደገና render
     */
    setTimeout(
        finalFixRun,
        3000
    );

    setTimeout(
        finalFixRun,
        6000
    );


    console.log(
        "✅ YamGiftET Final Delivery + Countdown Fix loaded."
    );

})();
