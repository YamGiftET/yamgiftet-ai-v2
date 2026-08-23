// =====================================
// YamGiftET AI v2
// Firebase Business Dashboard
// =====================================

const dashboard = {

    orders: [],

    // =====================================
    // Firebase ላይ ያሉ ትዕዛዞችን አምጣ
    // =====================================

    async loadOrders() {

        try {

            const response =
                await fetch("/api/orders");

            const data =
                await response.json();

            if (!response.ok || !data.success) {

                throw new Error(
                    data.error ||
                    "ትዕዛዞችን ማምጣት አልተቻለም።"
                );

            }

            this.orders =
                data.orders || [];

            this.update();

            return this.orders;

        } catch (error) {

            console.error(
                "❌ Dashboard Orders Error:",
                error
            );

            this.orders = [];

            this.update();

            return [];

        }

    },


    // =====================================
    // Dashboard አሀዞች
    // =====================================

    calculate() {

        const orders =
            this.orders || [];


        const totalOrders =
            orders.length;


        const totalIncome =
            orders.reduce(
                (sum, order) =>
                    sum +
                    Number(order.totalAmount || 0),
                0
            );


        const totalDeposit =
            orders.reduce(
                (sum, order) =>
                    sum +
                    Number(order.deposit || 0),
                0
            );


        const totalRemaining =
            orders.reduce(
                (sum, order) =>
                    sum +
                    Number(order.remaining || 0),
                0
            );


        const totalWorkCost =
            orders.reduce(
                (sum, order) =>
                    sum +
                    Number(order.workCost || 0),
                0
            );


        const totalProfit =
            orders.reduce(
                (sum, order) =>
                    sum +
                    Number(order.profit || 0),
                0
            );


        const customers =
            new Set(
                orders
                    .map(order => order.phone)
                    .filter(Boolean)
            );


        return {

            totalOrders,

            totalCustomers:
                customers.size,

            totalIncome,

            totalDeposit,

            totalRemaining,

            totalWorkCost,

            totalProfit

        };

    },


    // =====================================
    // Dashboard UI Update
    // =====================================

    update() {

        const data =
            this.calculate();


        setDashboardValue(
            "dashboardOrders",
            data.totalOrders
        );


        setDashboardValue(
            "dashboardCustomers",
            data.totalCustomers
        );


        setDashboardValue(
            "dashboardIncome",
            formatBirr(data.totalIncome)
        );


        setDashboardValue(
            "dashboardDeposit",
            formatBirr(data.totalDeposit)
        );


        setDashboardValue(
            "dashboardRemaining",
            formatBirr(data.totalRemaining)
        );


        setDashboardValue(
            "dashboardCost",
            formatBirr(data.totalWorkCost)
        );


        setDashboardValue(
            "dashboardProfit",
            formatBirr(data.totalProfit)
        );


        renderOrdersTable(
            this.orders
        );

    }

};


// =====================================
// 📅 Order Delivery Countdown
// =====================================

function getDeliveryCountdown(pickupDate) {

    if (!pickupDate) {
        return {
            text: "—",
            days: null,
            className: "delivery-unknown"
        };
    }

    const target = new Date(pickupDate);

    if (Number.isNaN(target.getTime())) {
        return {
            text: "—",
            days: null,
            className: "delivery-unknown"
        };
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const difference =
        target.getTime() - today.getTime();

    const days =
        Math.ceil(
            difference / (1000 * 60 * 60 * 24)
        );

    if (days > 1) {
        return {
            text: "🟢 " + days + " ቀን ቀረ",
            days,
            className: "delivery-safe"
        };
    }

    if (days === 1) {
        return {
            text: "🟡 1 ቀን ቀረ",
            days,
            className: "delivery-warning"
        };
    }

    if (days === 0) {
        return {
            text: "🔴 ዛሬ መረከብ አለበት",
            days,
            className: "delivery-today"
        };
    }

    return {
        text:
            "⚠️ " +
            Math.abs(days) +
            " ቀን አልፏል",
        days,
        className: "delivery-overdue"
    };
}

// =====================================
// Dashboard Value Helper
// =====================================

function setDashboardValue(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (element) {

        element.textContent =
            value;

    }

}


// =====================================
// Birr Formatter
// =====================================

function formatBirr(
    amount
) {

    return (
        Number(amount || 0)
            .toLocaleString("en-US") +
        " ብር"
    );

}


// =====================================
// Orders Table
// =====================================

function renderOrdersTable(
    orders
) {

    const tbody =
        document.getElementById(
            "dashboardOrdersBody"
        );


    if (!tbody) {
        return;
    }


    tbody.innerHTML = "";


    if (!orders.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="10">
                    ምንም ትዕዛዝ አልተገኘም።
                </td>
            </tr>
        `;

        return;

    }


    orders.forEach(
        order => {

            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    ${escapeHTML(
                        order.customerName || ""
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        order.phone || ""
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        order.productName || ""
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        order.orderDate || ""
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        order.pickupDate || ""
                    )}
                </td>

                <td>
                    ${formatBirr(
                        order.totalAmount
                    )}
                </td>

                <td>
                    ${formatBirr(
                        order.deposit
                    )}
                </td>

                <td>
                    ${formatBirr(
                        order.remaining
                    )}
                </td>

                <td>
                    ${formatBirr(
                        order.profit
                    )}
                </td>

                <td>
                    <span class="order-status">
                        ${escapeHTML(
                            order.status || ""
                        )}
                    </span>
                </td>

                <td>
                    ${order.photoUrl
                        ? '<img src="' +
                          escapeHTML(order.photoUrl) +
                          '" class="dashboard-order-photo" alt="የትዕዛዝ ፎቶ" onclick="openOrderPhoto(\'' +
                          escapeHTML(order.photoUrl) +
                          '\')">'
                        : "—"}
                </td>

            `;


            tbody.appendChild(row);

        }
    );

}


// =====================================
// HTML Security
// =====================================

function escapeHTML(
    value
) {

    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// =====================================
// Dashboard ሲጀምር
// =====================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "📊 YamGiftET Firebase Dashboard ተጀምሯል።"
        );


        dashboard.loadOrders();


        // 30 seconds በኋላ እንደገና refresh
        setInterval(
            () => dashboard.loadOrders(),
            30000
        );

    }
);


// =====================================
// AI Business Tips
// =====================================

const businessTips = [

    "📈 ዛሬ Facebook ላይ አዲስ ምርት ለጥፍ።",

    "🎥 TikTok ቪዲዮ በየቀኑ አውጣ።",

    "💬 የቆዩ ደንበኞችህን እንደገና አነጋግር።",

    "🎁 የቅናሽ ፕሮግራም ጀምር።",

    "⭐ ከተጠናቀቀ ትዕዛዝ በኋላ የደንበኛ አስተያየት ጠይቅ።"

];


function showBusinessTip() {

    const random =
        Math.floor(
            Math.random() *
            businessTips.length
        );


    console.log(
        "🤖 AI Business Tip:"
    );

    console.log(
        businessTips[random]
    );

}

function showBusinessTipOnPage() {

    const element =
        document.getElementById("dashboardTip");

    if (!element) {
        return;
    }

    const random =
        Math.floor(
            Math.random() *
            businessTips.length
        );

    element.textContent =
        businessTips[random];

}

const oldShowBusinessTip =
    showBusinessTip;

showBusinessTip = function() {

    oldShowBusinessTip();

    showBusinessTipOnPage();

};


function openOrderPhoto(url) {

    if (!url) return;

    let modal =
        document.getElementById("orderPhotoModal");

    if (!modal) {

        modal =
            document.createElement("div");

        modal.id =
            "orderPhotoModal";

        modal.className =
            "order-photo-modal-backdrop";

        modal.innerHTML =
            '<div class="order-photo-modal-content">' +
            '<button type="button" class="order-photo-modal-close" onclick="closeOrderPhoto()">✕</button>' +
            '<img id="orderPhotoModalImage" src="" alt="የትዕዛዝ ፎቶ">' +
            '</div>';

        document.body.appendChild(modal);

        modal.addEventListener(
            "click",
            function(event) {

                if (event.target === modal) {
                    closeOrderPhoto();
                }

            }
        );

    }

    const image =
        document.getElementById(
            "orderPhotoModalImage"
        );

    if (image) {
        image.src = url;
    }

    modal.style.display = "flex";

}


function closeOrderPhoto() {

    const modal =
        document.getElementById(
            "orderPhotoModal"
        );

    if (modal) {
        modal.style.display = "none";
    }

}


// =====================================
// 👥 Customers Management
// =====================================

let customersData = [];
let currentCustomerOrders = [];


// =====================================
// 👥 Customers ከ Orders መፍጠር
// =====================================

function buildCustomers(orders) {

    const customers = new Map();

    (orders || []).forEach(order => {

        const phone =
            String(order.phone || "").trim();

        const name =
            String(order.customerName || "").trim();

        if (!phone && !name) {
            return;
        }

        const key =
            phone || name.toLowerCase();

        if (!customers.has(key)) {

            customers.set(key, {
                name: name || "ያልተጠቀሰ",
                phone: phone || "-",
                orders: [],
                totalIncome: 0,
                totalRemaining: 0
            });

        }

        const customer =
            customers.get(key);

        customer.orders.push(order);

        customer.totalIncome +=
            Number(order.totalAmount || 0);

        customer.totalRemaining +=
            Number(order.remaining || 0);

        if (
            name &&
            customer.name === "ያልተጠቀሰ"
        ) {
            customer.name = name;
        }

    });

    return Array.from(customers.values());

}


// =====================================
// 👥 Customers Table
// =====================================

function renderCustomers(customers) {

    const tbody =
        document.getElementById(
            "customersBody"
        );

    const totalElement =
        document.getElementById(
            "customersTotal"
        );

    if (!tbody) {
        return;
    }

    if (totalElement) {
        totalElement.textContent =
            customers.length;
    }

    tbody.innerHTML = "";

    if (!customers.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    ምንም ደንበኛ አልተገኘም።
                </td>
            </tr>
        `;

        return;
    }


    customers.forEach(customer => {

        const row =
            document.createElement("tr");

        const lastOrder =
            customer.orders.length
                ? customer.orders[0]
                : null;

        const lastDate =
            lastOrder
                ? (
                    lastOrder.orderDate ||
                    lastOrder.createdAt ||
                    "-"
                )
                : "-";


        row.innerHTML = `

            <td>
                <strong>
                    ${escapeHTML(customer.name)}
                </strong>
            </td>

            <td>
                ${escapeHTML(customer.phone)}
            </td>

            <td>
                ${customer.orders.length}
            </td>

            <td>
                ${formatBirr(
                    customer.totalIncome
                )}
            </td>

            <td>
                ${escapeHTML(lastDate)}
            </td>

            <td>

                <button
                    type="button"
                    class="customer-view-btn"
                    onclick='openCustomerDetails(
                        ${JSON.stringify(customer.phone)}
                    )'
                >
                    👁️ ዝርዝር
                </button>

            </td>

        `;

        tbody.appendChild(row);

    });

}


// =====================================
// 🔎 Customer Search
// =====================================

function filterCustomers() {

    const input =
        document.getElementById(
            "customerSearch"
        );

    const search =
        String(input?.value || "")
            .trim()
            .toLowerCase();


    if (!search) {

        renderCustomers(
            customersData
        );

        return;

    }


    const filtered =
        customersData.filter(customer => {

            const name =
                String(customer.name || "")
                    .toLowerCase();

            const phone =
                String(customer.phone || "")
                    .toLowerCase();

            return (
                name.includes(search) ||
                phone.includes(search)
            );

        });


    renderCustomers(filtered);

}


// =====================================
// 👤 Customer Details
// =====================================

function openCustomerDetails(phone) {

    const customer =
        customersData.find(
            item =>
                String(item.phone) ===
                String(phone)
        );


    if (!customer) {

        alert(
            "❌ ደንበኛው አልተገኘም።"
        );

        return;

    }


    currentCustomerOrders =
        customer.orders || [];


    const modal =
        document.getElementById(
            "customerDetailsModal"
        );


    const nameElement =
        document.getElementById(
            "customerDetailsName"
        );

    const phoneElement =
        document.getElementById(
            "customerDetailsPhone"
        );

    const ordersElement =
        document.getElementById(
            "customerDetailsOrders"
        );

    const incomeElement =
        document.getElementById(
            "customerDetailsIncome"
        );

    const remainingElement =
        document.getElementById(
            "customerDetailsRemaining"
        );


    if (nameElement) {
        nameElement.textContent =
            "👤 " + customer.name;
    }

    if (phoneElement) {
        phoneElement.textContent =
            "📞 " + customer.phone;
    }

    if (ordersElement) {
        ordersElement.textContent =
            customer.orders.length;
    }

    if (incomeElement) {
        incomeElement.textContent =
            formatBirr(
                customer.totalIncome
            );
    }

    if (remainingElement) {
        remainingElement.textContent =
            formatBirr(
                customer.totalRemaining
            );
    }


    renderCustomerHistory(
        customer.orders
    );


    if (modal) {

        modal.style.display =
            "flex";

    }

}


// =====================================
// 📦 Customer Order History
// =====================================

function renderCustomerHistory(orders) {

    const tbody =
        document.getElementById(
            "customerHistoryBody"
        );


    if (!tbody) {
        return;
    }


    tbody.innerHTML = "";


    if (!orders || !orders.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    የትዕዛዝ ታሪክ የለም።
                </td>
            </tr>
        `;

        return;

    }


    orders.forEach(order => {

        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>
                ${escapeHTML(
                    order.productName || "-"
                )}
            </td>

            <td>
                ${escapeHTML(
                    order.orderDate ||
                    order.createdAt ||
                    "-"
                )}
            </td>

            <td>
                ${formatBirr(
                    order.totalAmount
                )}
            </td>

            <td>
                ${formatBirr(
                    order.remaining
                )}
            </td>

            <td>
                <span class="order-status">
                    ${escapeHTML(
                        order.status || "አዲስ"
                    )}
                </span>
            </td>

        `;


        tbody.appendChild(row);

    });

}


// =====================================
// ❌ Close Customer Details
// =====================================

function closeCustomerDetails() {

    const modal =
        document.getElementById(
            "customerDetailsModal"
        );

    if (modal) {

        modal.style.display =
            "none";

    }

}


// =====================================
// 🖱️ Modal ውጭ ሲጫን
// =====================================

document.addEventListener(
    "click",
    event => {

        const modal =
            document.getElementById(
                "customerDetailsModal"
            );

        if (
            modal &&
            event.target === modal
        ) {

            closeCustomerDetails();

        }

    }
);


// =====================================
// 🔎 Search Event
// =====================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const search =
            document.getElementById(
                "customerSearch"
            );

        if (search) {

            search.addEventListener(
                "input",
                filterCustomers
            );

        }

    }
);


// =====================================
// 🔄 Update Customers
// =====================================

function updateCustomersFromOrders() {

    customersData =
        buildCustomers(
            dashboard.orders || []
        );

    renderCustomers(
        customersData
    );

}


// =====================================
// 🔗 Dashboard Update ላይ Customers
// =====================================

const originalDashboardUpdate =
    dashboard.update.bind(dashboard);


dashboard.update =
    function() {

        originalDashboardUpdate();

        updateCustomersFromOrders();

    };



/* =========================================================
   YamGiftET AI v2
   ORDER ACTIONS
   ✏️ Edit
   🗑️ Delete
   📦 Delivered
   ========================================================= */

(function () {

    console.log("🚀 YamGiftET Order Actions loaded");


    /* =====================================================
       Helpers
       ===================================================== */

    function yamGetOrders() {
        return Array.isArray(window.dashboard?.orders)
            ? window.dashboard.orders
            : [];
    }


    function yamFormatDate(date) {

        if (!date) return "-";

        const d = new Date(date);

        if (Number.isNaN(d.getTime())) {
            return String(date);
        }

        return d.toLocaleDateString("am-ET", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        });
    }



    /* =====================================================
       FIREBASE ORDER HELPER
       ===================================================== */

    async function yamFetchOrderById(orderId) {

        try {

            const response =
                await fetch(
                    "/api/orders/" +
                    encodeURIComponent(orderId)
                );

            if (!response.ok) {
                return null;
            }

            const result =
                await response.json();

            if (
                result &&
                result.success &&
                result.order
            ) {
                return result.order;
            }

            if (
                result &&
                result.success &&
                result.data
            ) {
                return result.data;
            }

            return null;

        } catch (error) {

            console.error(
                "Order fetch error:",
                error
            );

            return null;
        }
    }


    /* =====================================================
       EDIT ORDER
       ===================================================== */

    window.editYamOrder = async function (orderId) {

        let order = await yamFetchOrderById(orderId);

        if (!order) {

            const orders = yamGetOrders();

            order =
                orders.find(
                    item =>
                        String(item.id) ===
                        String(orderId)
                );
        }

        if (!order) {

            alert("❌ ትዕዛዙ አልተገኘም።");

            return;
        }


        const oldModal =
            document.getElementById(
                "yamOrderEditModal"
            );

        if (oldModal) {
            oldModal.remove();
        }


        const modal =
            document.createElement("div");

        modal.id =
            "yamOrderEditModal";

        modal.innerHTML = `

            <div class="yam-order-modal-overlay">

                <div class="yam-order-modal">

                    <div class="yam-order-modal-header">

                        <h3>
                            ✏️ ትዕዛዝ ማስተካከያ
                        </h3>

                        <button
                            type="button"
                            onclick="document.getElementById('yamOrderEditModal').remove()"
                        >
                            ✕
                        </button>

                    </div>


                    <div class="yam-order-form">

                        <label>
                            👤 የደንበኛ ስም
                            <input
                                id="yamEditCustomerName"
                                value="${escapeHTML(order.customerName || "")}"
                            >
                        </label>


                        <label>
                            📱 ስልክ
                            <input
                                id="yamEditPhone"
                                value="${escapeHTML(order.phone || "")}"
                            >
                        </label>


                        <label>
                            🎁 ምርት
                            <input
                                id="yamEditProduct"
                                value="${escapeHTML(order.productName || "")}"
                            >
                        </label>


                        <label>
                            📝 የትዕዛዝ መረጃ
                            <textarea id="yamEditOrderInfo">${escapeHTML(order.orderInfo || "")}</textarea>
                        </label>


                        <label>
                            💰 ጠቅላላ ዋጋ
                            <input
                                type="number"
                                id="yamEditTotal"
                                value="${Number(order.totalAmount || 0)}"
                            >
                        </label>


                        <label>
                            💵 የተከፈለ
                            <input
                                type="number"
                                id="yamEditDeposit"
                                value="${Number(order.deposit || 0)}"
                            >
                        </label>


                        <label>
                            🛠️ የሥራ ወጪ
                            <input
                                type="number"
                                id="yamEditCost"
                                value="${Number(order.workCost || 0)}"
                            >
                        </label>


                        <label>
                            📅 የትዕዛዝ ቀን
                            <input
                                type="date"
                                id="yamEditOrderDate"
                                value="${String(order.orderDate || "").slice(0,10)}"
                            >
                        </label>


                        <label>
                            📦 የመረከቢያ ቀን
                            <input
                                type="date"
                                id="yamEditPickupDate"
                                value="${String(order.pickupDate || "").slice(0,10)}"
                            >
                        </label>


                        <label>
                            🔄 ሁኔታ

                            <select id="yamEditStatus">

                                <option value="አዲስ">
                                    አዲስ
                                </option>

                                <option value="በሥራ ላይ">
                                    በሥራ ላይ
                                </option>

                                <option value="ተጠናቋል">
                                    ተጠናቋል
                                </option>

                                <option value="ተሰጥቷል">
                                    📦 ተሰጥቷል
                                </option>

                                <option value="ተሰርዟል">
                                    ❌ ተሰርዟል
                                </option>

                            </select>

                        </label>


                        <label>
                            📝 ማስታወሻ
                            <textarea id="yamEditNotes">${escapeHTML(order.notes || "")}</textarea>
                        </label>


                        <div class="yam-order-modal-actions">

                            <button
                                type="button"
                                class="yam-save-edit"
                                onclick="saveYamOrderEdit('${String(order.id)}')"
                            >
                                💾 አስቀምጥ
                            </button>


                            <button
                                type="button"
                                class="yam-cancel-edit"
                                onclick="document.getElementById('yamOrderEditModal').remove()"
                            >
                                መሰረዝ
                            </button>

                        </div>

                    </div>

                </div>

            </div>
        `;


        document.body.appendChild(modal);


        const status =
            document.getElementById(
                "yamEditStatus"
            );

        if (status) {
            status.value =
                order.status || "አዲስ";
        }

    };


    /* =====================================================
       SAVE EDIT
       ===================================================== */

    window.saveYamOrderEdit = async function (orderId) {

        const total =
            Number(
                document.getElementById(
                    "yamEditTotal"
                )?.value || 0
            );

        const deposit =
            Number(
                document.getElementById(
                    "yamEditDeposit"
                )?.value || 0
            );

        const cost =
            Number(
                document.getElementById(
                    "yamEditCost"
                )?.value || 0
            );


        const data = {

            customerName:
                document.getElementById(
                    "yamEditCustomerName"
                )?.value.trim(),

            phone:
                document.getElementById(
                    "yamEditPhone"
                )?.value.trim(),

            productName:
                document.getElementById(
                    "yamEditProduct"
                )?.value.trim(),

            orderInfo:
                document.getElementById(
                    "yamEditOrderInfo"
                )?.value || "",

            totalAmount: total,

            deposit: deposit,

            workCost: cost,

            orderDate:
                document.getElementById(
                    "yamEditOrderDate"
                )?.value || "",

            pickupDate:
                document.getElementById(
                    "yamEditPickupDate"
                )?.value || "",

            status:
                document.getElementById(
                    "yamEditStatus"
                )?.value || "አዲስ",

            notes:
                document.getElementById(
                    "yamEditNotes"
                )?.value || ""

        };


        if (
            !data.customerName ||
            !data.phone ||
            !data.productName
        ) {

            alert(
                "⚠️ የደንበኛ ስም፣ ስልክ እና ምርት ያስፈልጋሉ።"
            );

            return;
        }


        try {

            const response =
                await fetch(
                    "/api/orders/" +
                    encodeURIComponent(orderId),
                    {

                        method: "PATCH",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(data)

                    }
                );


            const result =
                await response.json();


            if (!response.ok || !result.success) {

                throw new Error(
                    result.error ||
                    "Update failed"
                );

            }


            alert(
                "✅ የትዕዛዙ መረጃ ተስተካክሏል።"
            );


            document
                .getElementById(
                    "yamOrderEditModal"
                )
                ?.remove();


            if (
                typeof window.dashboard?.loadOrders ===
                "function"
            ) {

                await window.dashboard.loadOrders();

            } else {

                location.reload();

            }


        } catch (error) {

            console.error(
                "Edit Order Error:",
                error
            );

            alert(
                "❌ ትዕዛዙን ማስተካከል አልተቻለም።"
            );

        }

    };



    /* =====================================================
       📦 MARK ORDER AS DELIVERED
       ===================================================== */

    window.markYamOrderDelivered = async function(orderId) {

        const id = String(orderId ?? "").trim();

        if (!id) {
            alert("❌ የትዕዛዝ ID አልተገኘም።");
            return;
        }

        const confirmed = window.confirm(
            "📦 ይህ ስራ ለደንበኛው ተረክቧል?"
        );

        if (!confirmed) {
            return;
        }

        try {

            const response = await fetch(
                "/api/orders/" + encodeURIComponent(id),
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        status: "ተሰጥቷል"
                    })
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.error ||
                    "Delivered update failed"
                );
            }

            alert(
                "✅ ስራው ተረክቧል።\n\n" +
                "📦 ወደ የተረከቡ ስራዎች ተዛውሯል።"
            );

            if (
                window.dashboard &&
                typeof window.dashboard.loadOrders === "function"
            ) {
                await window.dashboard.loadOrders();
            } else {
                window.location.reload();
            }

        } catch (error) {

            console.error(
                "❌ Mark Delivered Error:",
                error
            );

            alert(
                "❌ ስራውን እንደተረከበ ማስመዝገብ አልተቻለም።\n\n" +
                (error.message || error)
            );
        }
    };

    /* =====================================================
       DELETE ORDER
       ===================================================== */

    window.deleteYamOrder = async function (orderId) {

        const orders = yamGetOrders();

        const order =
            orders.find(
                item =>
                    String(item.id) ===
                    String(orderId)
            );


        if (!order) {

            alert(
                "❌ ትዕዛዙ አልተገኘም።"
            );

            return;
        }


        const confirmed =
            confirm(
                "⚠️ እርግጠኛ ነዎት?\n\n" +
                "ደንበኛ: " +
                (order.customerName || "-") +
                "\n" +
                "ምርት: " +
                (order.productName || "-") +
                "\n\n" +
                "ይህ ትዕዛዝ ከFirebase ይሰረዛል።"
            );


        if (!confirmed) {
            return;
        }


        try {

            const response =
                await fetch(
                    "/api/orders/" +
                    encodeURIComponent(orderId),
                    {
                        method: "DELETE"
                    }
                );


            const result =
                await response.json();


            if (!response.ok || !result.success) {

                throw new Error(
                    result.error ||
                    "Delete failed"
                );

            }


            alert(
                "🗑️ ትዕዛዙ ተሰርዟል።"
            );


            if (
                typeof window.dashboard?.loadOrders ===
                "function"
            ) {

                await window.dashboard.loadOrders();

            } else {

                location.reload();

            }


        } catch (error) {

            console.error(
                "Delete Order Error:",
                error
            );

            alert(
                "❌ ትዕዛዙን መሰረዝ አልተቻለም።"
            );

        }

    };


    /* =====================================================
       REPLACE ORDERS TABLE
       ===================================================== */

    const originalRenderOrdersTable =
        window.renderOrdersTable;


    window.renderOrdersTable =
        function (orders) {

            orders =
                Array.isArray(orders)
                ? orders
                : [];


            const activeOrders = orders;


            const tbody =
                document.getElementById(
                    "dashboardOrdersBody"
                );


            if (tbody) {

                tbody.innerHTML = "";


                if (!activeOrders.length) {

                    tbody.innerHTML = `

                        <tr>

                            <td colspan="12">
                                🎉 ሁሉም ትዕዛዞች ተረክበዋል።
                            </td>

                        </tr>

                    `;

                } else {

                    activeOrders.forEach(order => {

                        const row =
                            document.createElement("tr");


                        row.innerHTML = `

                            <td>
                                ${escapeHTML(
                                    order.customerName || ""
                                )}
                            </td>

                            <td>

                                <a
                                    href="tel:${escapeHTML(order.phone || "")}"
                                >
                                    ${escapeHTML(
                                        order.phone || ""
                                    )}
                                </a>

                            </td>

                            <td>
                                ${escapeHTML(
                                    order.productName || ""
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    order.orderDate || ""
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    order.pickupDate || ""
                                )}
                            </td>

                            <td>
                                ${formatBirr(
                                    order.totalAmount
                                )}
                            </td>

                            <td>
                                ${formatBirr(
                                    order.deposit
                                )}
                            </td>

                            <td>
                                ${formatBirr(
                                    order.remaining
                                )}
                            </td>

                            <td>
                                ${formatBirr(
                                    order.profit
                                )}
                            </td>

                            <td>
                                <span class="order-status">
                                    ${escapeHTML(
                                        order.status || ""
                                    )}
                                </span>
                            </td>

                            <td>

                                ${
                                    order.photoUrl
                                    ? `
                                        <img
                                            src="${escapeHTML(order.photoUrl)}"
                                            class="dashboard-order-photo"
                                            alt="የትዕዛዝ ፎቶ"
                                        >
                                    `
                                    : "—"
                                }

                            </td>


                            <td>

                                <div class="yam-order-actions">

                                    <button
                                        type="button"
                                        onclick="editYamOrder('${String(order.id)}')"
                                        title="ማስተካከያ"
                                    >
                                        ✏️
                                    </button>


                                    


                                    <button
                                        type="button"
                                        onclick="markYamOrderDelivered('${String(order.id)}')"
                                        title="ተረክቧል"
                                    >
                                        📦
                                    </button>

                                    <button
                                        type="button"
                                        onclick="deleteYamOrder('${String(order.id)}')"
                                        title="ሰርዝ"
                                    >
                                        🗑️
                                    </button>

                                </div>

                            </td>

                        `;


                        tbody.appendChild(row);

                    });

                }

            }


        };


    /* =====================================================
       ADD ACTION HEADER
       ===================================================== */

    function addYamActionHeader() {

        const header =
            document.querySelector(
                ".dashboard-orders-table thead tr"
            );


        if (!header) return;


        if (
            header.querySelector(
                ".yam-actions-header"
            )
        ) {
            return;
        }


        const th =
            document.createElement("th");

        th.className =
            "yam-actions-header";

        th.textContent =
            "⚙️ ተግባር";


        header.appendChild(th);

    }


    /* =====================================================
       CSS
       ===================================================== */

    function addYamOrderStyles() {

        if (
            document.getElementById(
                "yam-order-actions-style"
            )
        ) {
            return;
        }


        const style =
            document.createElement("style");

        style.id =
            "yam-order-actions-style";


        style.textContent = `

            .yam-order-actions {
                display: flex;
                gap: 6px;
                justify-content: center;
                align-items: center;
            }


            .yam-order-actions button {
                border: none;
                border-radius: 8px;
                padding: 7px 9px;
                cursor: pointer;
                font-size: 15px;
                background: #f1f1f1;
            }


            .yam-order-actions button:hover {
                transform: scale(1.08);
            }


            .yam-order-modal-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,.55);
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 15px;
            }


            .yam-order-modal {
                width: min(650px, 100%);
                max-height: 90vh;
                overflow-y: auto;
                background: white;
                border-radius: 18px;
                padding: 20px;
                box-shadow: 0 20px 60px rgba(0,0,0,.3);
            }


            .yam-order-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }


            .yam-order-modal-header button {
                border: none;
                background: transparent;
                font-size: 22px;
                cursor: pointer;
            }


            .yam-order-form {
                display: grid;
                gap: 12px;
            }


            .yam-order-form label {
                display: grid;
                gap: 5px;
                font-weight: 600;
            }


            .yam-order-form input,
            .yam-order-form textarea,
            .yam-order-form select {
                width: 100%;
                box-sizing: border-box;
                padding: 11px;
                border: 1px solid #ddd;
                border-radius: 9px;
                font: inherit;
            }


            .yam-order-form textarea {
                min-height: 80px;
                resize: vertical;
            }


            .yam-order-modal-actions {
                display: flex;
                gap: 10px;
                margin-top: 10px;
            }


            .yam-save-edit,
            .yam-cancel-edit {
                flex: 1;
                border: none;
                padding: 12px;
                border-radius: 10px;
                cursor: pointer;
                font-weight: bold;
            }


            .yam-save-edit {
                background: #0f3d2e;
                color: white;
            }


            .yam-cancel-edit {
                background: #eee;
            }


        `;


        document.head.appendChild(style);

    }


    /* =====================================================
       INIT
       ===================================================== */

    function yamInitOrderActions() {

        addYamOrderStyles();

        addYamActionHeader();


    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            yamInitOrderActions
        );

    } else {

        yamInitOrderActions();

    }


})();

/* =====================================================
   DELIVERY COUNTDOWN REFRESH
   ===================================================== */

(function () {
    "use strict";

    function refreshCountdowns() {

        const orders =
            window.dashboard?.orders || [];

        if (!Array.isArray(orders)) {
            return;
        }

        orders.forEach(order => {

            const element =
                document.querySelector(
                    '[data-pickup-date="' +
                    CSS.escape(String(order.id)) +
                    '"]'
                );

            if (!element) {
                return;
            }

            const countdown =
                getDeliveryCountdown(
                    order.pickupDate
                );

            element.textContent =
                countdown.text;

            element.className =
                "delivery-countdown " +
                countdown.className;
        });
    }

    /*
     * Refresh every minute.
     */
    setInterval(
        refreshCountdowns,
        60000
    );

})();


console.log(
    "✅ YamGiftET Delivery Module loaded successfully."
);


/* ============================================================
   YAMGIFTET MASTER ACTION FIX v2
   Fixes:
   - Delete "order not found"
   - Delivered "order not found"
   - Uses backend/Firebase document ID
   - Refreshes dashboard after actions
   - Keeps existing Edit system untouched
   - Refreshes delivery countdown
   ============================================================ */

(function () {
    "use strict";

    console.log("🔧 YamGiftET Master Action Fix v2 loading...");

    async function yamMasterFetchOrders() {
        const response = await fetch("/api/orders", {
            method: "GET",
            headers: {
                "Accept": "application/json"
            },
            cache: "no-store"
        });

        let data = {};

        try {
            data = await response.json();
        } catch (e) {
            throw new Error("Backend JSON response አልተነበበም።");
        }

        if (!response.ok) {
            throw new Error(
                data.error ||
                data.message ||
                "Orders ከserver ማምጣት አልተቻለም።"
            );
        }

        return Array.isArray(data.orders)
            ? data.orders
            : [];
    }

    function yamMasterGetId(order) {
        if (!order || typeof order !== "object") {
            return "";
        }

        return String(
            order.id ??
            order._id ??
            order.orderId ??
            ""
        ).trim();
    }

    async function yamMasterFindServerOrder(orderId) {
        const wanted = String(orderId ?? "").trim();

        if (!wanted) {
            return null;
        }

        const orders = await yamMasterFetchOrders();

        return (
            orders.find(order =>
                yamMasterGetId(order) === wanted
            ) || null
        );
    }

    async function yamMasterRefresh() {
        try {
            if (
                window.dashboard &&
                typeof window.dashboard.loadOrders === "function"
            ) {
                await window.dashboard.loadOrders();
                return;
            }

            if (
                typeof window.loadOrders === "function"
            ) {
                await window.loadOrders();
                return;
            }

            window.location.reload();

        } catch (error) {
            console.error(
                "Master refresh error:",
                error
            );

            window.location.reload();
        }
    }

    /* =========================================================
       DELETE
       ========================================================= */

    window.deleteYamOrder = async function (orderId) {

        const id = String(orderId ?? "").trim();

        if (!id) {
            alert("❌ የትዕዛዙ ID አልተገኘም።");
            return;
        }

        const confirmed = window.confirm(
            "🗑️ ይህን ትዕዛዝ ለመሰረዝ እርግጠኛ ነህ?"
        );

        if (!confirmed) {
            return;
        }

        try {

            /* Always verify against Firebase/backend */
            const serverOrder =
                await yamMasterFindServerOrder(id);

            if (!serverOrder) {
                alert(
                    "❌ ትዕዛዙ በFirebase ላይ አልተገኘም።\n\nID: " +
                    id
                );
                return;
            }

            const realId =
                yamMasterGetId(serverOrder);

            const response =
                await fetch(
                    "/api/orders/" +
                    encodeURIComponent(realId),
                    {
                        method: "DELETE",
                        headers: {
                            "Accept":
                                "application/json"
                        }
                    }
                );

            let result = {};

            try {
                result =
                    await response.json();
            } catch (e) {
                result = {};
            }

            if (!response.ok) {
                throw new Error(
                    result.error ||
                    result.message ||
                    "Delete failed"
                );
            }

            alert(
                "✅ ትዕዛዙ ተሰርዟል።"
            );

            await yamMasterRefresh();

        } catch (error) {

            console.error(
                "❌ YamGiftET Delete Error:",
                error
            );

            alert(
                "❌ ትዕዛዙን መሰረዝ አልተቻለም።\n\n" +
                error.message
            );
        }
    };


    /* =========================================================
       DELIVERED
       ========================================================= */
;


    /* =========================================================
       COUNTDOWN
       ========================================================= */

    function yamMasterCountdownText(
        pickupDate
    ) {

        if (!pickupDate) {
            return "";
        }

        const target =
            new Date(pickupDate);

        if (
            Number.isNaN(
                target.getTime()
            )
        ) {
            return "";
        }

        const now =
            new Date();

        const diff =
            target.getTime() -
            now.getTime();

        const day =
            24 * 60 * 60 * 1000;

        const days =
            Math.ceil(diff / day);

        if (days > 1) {
            return "🟢 " +
                days +
                " ቀን ቀረ";
        }

        if (days === 1) {
            return "🟡 1 ቀን ቀረ";
        }

        if (days === 0) {
            return "🟠 ዛሬ ነው";
        }

        return "🔴 " +
            Math.abs(days) +
            " ቀን አልፏል";
    }


    window.yamMasterRefreshCountdowns =
        function () {

        try {

            const nodes =
                document.querySelectorAll(
                    "[data-pickup-date]"
                );

            nodes.forEach(node => {

                const pickupDate =
                    node.getAttribute(
                        "data-pickup-date"
                    );

                const text =
                    yamMasterCountdownText(
                        pickupDate
                    );

                if (text) {
                    node.textContent = text;
                }
            });

        } catch (error) {

            console.error(
                "Countdown error:",
                error
            );
        }
    };


    /* =========================================================
       AUTO REFRESH COUNTDOWN
       ========================================================= */

    setInterval(
        function () {

            try {

                if (
                    typeof window
                        .yamMasterRefreshCountdowns ===
                    "function"
                ) {
                    window
                        .yamMasterRefreshCountdowns();
                }

            } catch (e) {
                console.error(
                    "Countdown refresh error:",
                    e
                );
            }

        },
        60 * 1000
    );


    console.log(
        "✅ YamGiftET Master Action Fix v2 loaded."
    );

})();


/* YAMGIFET DIRECT BACKEND ACTION FIX */

/* =========================================================
   YAMGIFET DIRECT BACKEND ACTION FIX
   Delete + Delivered use Firestore document ID directly.
   ========================================================= */
;


window.deleteYamOrder = async function(orderId) {

    const id = String(orderId || "").trim();

    if (!id) {
        alert("❌ የትዕዛዝ ID የለም።");
        return;
    }

    const confirmed = confirm(
        "⚠️ ይህን ትዕዛዝ በእርግጥ ማጥፋት ይፈልጋሉ?"
    );

    if (!confirmed) {
        return;
    }

    try {

        const response = await fetch(
            "/api/orders/" + encodeURIComponent(id),
            {
                method: "DELETE"
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.error || "Delete failed"
            );
        }

        alert(
            "✅ ትዕዛዙ ተሰርዟል።"
        );

        if (
            window.dashboard &&
            typeof window.dashboard.loadOrders === "function"
        ) {
            await window.dashboard.loadOrders();
        } else {
            location.reload();
        }

    } catch (error) {

        console.error(
            "YamGiftET Delete Error:",
            error
        );

        alert(
            "❌ ትዕዛዙን ማጥፋት አልተቻለም።\\n" +
            error.message
        );
    }
};

console.log(
    "✅ YamGiftET Direct Backend Action Fix loaded."
);



/* =========================================================
   📦 YAMGIFET AI — DELIVERED ORDERS DASHBOARD
   ========================================================= */

(function () {

    "use strict";

    let yamDeliveredOrders = [];

    /* =====================================================
       LOAD DELIVERED ORDERS
       ===================================================== */

    async function loadYamDeliveredOrders() {

        try {

            const response = await fetch(
                "/api/delivered-orders"
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.error ||
                    "Delivered orders load failed"
                );
            }

            yamDeliveredOrders =
                Array.isArray(data.orders)
                    ? data.orders
                    : [];

            renderYamDeliveredDashboard();

        } catch (error) {

            console.error(
                "❌ Delivered Orders Load Error:",
                error
            );

            renderYamDeliveredError(
                error.message ||
                "የተረከቡ ስራዎችን ማምጣት አልተቻለም።"
            );
        }
    }


    /* =====================================================
       CREATE SECTION
       ===================================================== */

    function getYamDeliveredSection() {

        let section =
            document.getElementById(
                "yamDeliveredDashboardSection"
            );

        if (section) {
            return section;
        }

        section =
            document.createElement("section");

        section.id =
            "yamDeliveredDashboardSection";

        section.className =
            "yam-delivered-dashboard-section";

        const ordersTable =
            document.querySelector(
                ".dashboard-orders-table"
            );

        const ordersSection =
            ordersTable
                ? ordersTable.closest("section")
                : null;

        if (ordersSection) {

            ordersSection.insertAdjacentElement(
                "afterend",
                section
            );

        } else {

            document.body.appendChild(section);

        }

        return section;
    }


    /* =====================================================
       RENDER
       ===================================================== */

    function renderYamDeliveredDashboard() {

        const section =
            getYamDeliveredSection();

        const orders =
            Array.isArray(yamDeliveredOrders)
                ? yamDeliveredOrders
                : [];

        let totalSales = 0;
        let totalCost = 0;
        let totalProfit = 0;

        orders.forEach(order => {

            totalSales +=
                Number(order.totalAmount || 0);

            totalCost +=
                Number(order.workCost || 0);

            totalProfit +=
                Number(order.profit || 0);

        });


        section.innerHTML = `

            <div class="yam-delivered-dashboard-header">

                <div>

                    <h2>
                        📦 የተረከቡ ስራዎች
                    </h2>

                    <p>
                        ለደንበኞች የተረከቡ ስራዎች
                        እና የገንዘብ ሪፖርት
                    </p>

                </div>

                <div class="yam-delivered-count">
                    ${orders.length} ስራ
                </div>

            </div>


            <div class="yam-delivered-dashboard-stats">

                <div class="yam-delivered-stat">

                    <span>📦</span>

                    <strong>
                        ${orders.length}
                    </strong>

                    <small>
                        ጠቅላላ የተረከቡ ስራዎች
                    </small>

                </div>


                <div class="yam-delivered-stat">

                    <span>💰</span>

                    <strong>
                        ${formatBirr(totalSales)}
                    </strong>

                    <small>
                        ጠቅላላ ሽያጭ
                    </small>

                </div>


                <div class="yam-delivered-stat">

                    <span>🛠️</span>

                    <strong>
                        ${formatBirr(totalCost)}
                    </strong>

                    <small>
                        ጠቅላላ ወጪ
                    </small>

                </div>


                <div class="yam-delivered-stat">

                    <span>📈</span>

                    <strong>
                        ${formatBirr(totalProfit)}
                    </strong>

                    <small>
                        ጠቅላላ ትርፍ
                    </small>

                </div>

            </div>


            <div class="yam-delivered-table-wrapper">

                <table class="yam-delivered-table">

                    <thead>

                        <tr>

                            <th>#</th>

                            <th>ደንበኛ</th>

                            <th>ስልክ</th>

                            <th>ምርት</th>

                            <th>ፎቶ</th>

                            <th>የትዕዛዝ ቀን</th>

                            <th>የተረከበበት</th>

                            <th>ሽያጭ</th>

                            <th>ወጪ</th>

                            <th>ትርፍ</th>

                            <th>እርምጃ</th>

                        </tr>

                    </thead>


                    <tbody>

                        ${
                            orders.length

                            ? orders.map(
                                (order, index) => {

                                    const photo =
                                        order.photoUrl
                                            ? `
                                                <img
                                                    src="${escapeHTML(order.photoUrl)}"
                                                    class="yam-delivered-photo"
                                                    alt="የተረከበ ስራ"
                                                >
                                              `
                                            : "—";


                                    const deliveredDate =
                                        order.deliveredAt
                                            ? new Date(
                                                order.deliveredAt
                                            ).toLocaleDateString(
                                                "en-GB"
                                            )
                                            : "-";


                                    return `

                                        <tr>

                                            <td>
                                                ${index + 1}
                                            </td>


                                            <td>
                                                ${escapeHTML(
                                                    order.customerName || "-"
                                                )}
                                            </td>


                                            <td>

                                                ${
                                                    order.phone
                                                    ? `
                                                        <a
                                                            href="tel:${escapeHTML(order.phone)}"
                                                        >
                                                            ${escapeHTML(order.phone)}
                                                        </a>
                                                      `
                                                    : "-"
                                                }

                                            </td>


                                            <td>
                                                ${escapeHTML(
                                                    order.productName || "-"
                                                )}
                                            </td>


                                            <td>
                                                ${photo}
                                            </td>


                                            <td>
                                                ${escapeHTML(
                                                    order.orderDate || "-"
                                                )}
                                            </td>


                                            <td>
                                                ${escapeHTML(
                                                    deliveredDate
                                                )}
                                            </td>


                                            <td>
                                                ${formatBirr(
                                                    order.totalAmount
                                                )}
                                            </td>


                                            <td>
                                                ${formatBirr(
                                                    order.workCost
                                                )}
                                            </td>


                                            <td class="yam-profit-cell">
                                                ${formatBirr(
                                                    order.profit
                                                )}
                                            </td>


                                            <td>

                                                <button
                                                    type="button"
                                                    class="yam-delivered-delete-btn"
                                                    onclick="deleteYamDeliveredOrder('${String(order.id)}')"
                                                    title="የተረከበውን ስራ ሰርዝ"
                                                >
                                                    🗑️
                                                </button>

                                            </td>

                                        </tr>

                                    `;

                                }
                            ).join("")

                            :

                            `

                                <tr>

                                    <td
                                        colspan="11"
                                        class="yam-delivered-empty"
                                    >
                                        📦 እስካሁን የተረከበ ስራ የለም።
                                    </td>

                                </tr>

                            `
                        }

                    </tbody>

                </table>

            </div>

        `;
    }


    /* =====================================================
       ERROR
       ===================================================== */

    function renderYamDeliveredError(message) {

        const section =
            getYamDeliveredSection();

        section.innerHTML = `

            <div class="yam-delivered-error">

                ❌ ${escapeHTML(message)}

                <button
                    type="button"
                    onclick="loadYamDeliveredOrders()"
                >
                    🔄 እንደገና ሞክር
                </button>

            </div>

        `;
    }


    /* =====================================================
       DELETE DELIVERED ORDER
       ===================================================== */

    window.deleteYamDeliveredOrder =
        async function (orderId) {

            const id =
                String(orderId ?? "").trim();

            if (!id) {

                alert(
                    "❌ Delivered Order ID የለም።"
                );

                return;
            }


            const confirmed =
                window.confirm(
                    "🗑️ ይህን የተረከበ ስራ ለማጥፋት እርግጠኛ ነህ?"
                );


            if (!confirmed) {
                return;
            }


            try {

                const response =
                    await fetch(
                        "/api/delivered-orders/" +
                        encodeURIComponent(id),
                        {
                            method: "DELETE"
                        }
                    );


                const data =
                    await response.json();


                if (
                    !response.ok ||
                    !data.success
                ) {

                    throw new Error(
                        data.error ||
                        "Delete failed"
                    );

                }


                alert(
                    "✅ የተረከበው ስራ ተሰርዟል።"
                );


                await loadYamDeliveredOrders();

            } catch (error) {

                console.error(
                    "❌ Delivered Delete Error:",
                    error
                );

                alert(
                    "❌ የተረከበውን ስራ መሰረዝ አልተቻለም።\n\n" +
                    (error.message || error)
                );

            }

        };


    /* =====================================================
       PUBLIC LOAD
       ===================================================== */

    window.loadYamDeliveredOrders =
        loadYamDeliveredOrders;


    /* =====================================================
       CSS
       ===================================================== */

    function addYamDeliveredStyles() {

        if (
            document.getElementById(
                "yam-delivered-dashboard-style"
            )
        ) {
            return;
        }


        const style =
            document.createElement("style");

        style.id =
            "yam-delivered-dashboard-style";


        style.textContent = `

            .yam-delivered-dashboard-section {

                margin-top: 30px;

                padding: 22px;

                background: #ffffff;

                border-radius: 18px;

                box-shadow:
                    0 8px 30px
                    rgba(0,0,0,.08);

                overflow: hidden;
            }


            .yam-delivered-dashboard-header {

                display: flex;

                justify-content:
                    space-between;

                align-items:
                    center;

                gap: 15px;

                margin-bottom: 20px;
            }


            .yam-delivered-dashboard-header h2 {

                margin: 0 0 6px;

                font-size: 22px;
            }


            .yam-delivered-dashboard-header p {

                margin: 0;

                opacity: .65;

                font-size: 14px;
            }


            .yam-delivered-count {

                padding: 10px 16px;

                border-radius: 25px;

                background: #e8f5e9;

                font-weight: 700;

                white-space: nowrap;
            }


            .yam-delivered-dashboard-stats {

                display: grid;

                grid-template-columns:
                    repeat(4, minmax(0, 1fr));

                gap: 12px;

                margin-bottom: 20px;
            }


            .yam-delivered-stat {

                padding: 16px;

                border-radius: 14px;

                background: #f7f8f8;

                display: grid;

                gap: 5px;
            }


            .yam-delivered-stat span {

                font-size: 22px;
            }


            .yam-delivered-stat strong {

                font-size: 18px;
            }


            .yam-delivered-stat small {

                opacity: .65;
            }


            .yam-delivered-table-wrapper {

                width: 100%;

                overflow-x: auto;
            }


            .yam-delivered-table {

                width: 100%;

                min-width: 1050px;

                border-collapse:
                    collapse;
            }


            .yam-delivered-table th,
            .yam-delivered-table td {

                padding: 11px 10px;

                border-bottom:
                    1px solid #eeeeee;

                text-align: left;

                vertical-align: middle;
            }


            .yam-delivered-table th {

                background: #f5f5f5;

                font-weight: 700;

                white-space: nowrap;
            }


            .yam-delivered-table tbody tr:hover {

                background: #fafafa;
            }


            .yam-delivered-photo {

                width: 55px;

                height: 55px;

                object-fit: cover;

                border-radius: 9px;

                display: block;
            }


            .yam-profit-cell {

                font-weight: 700;
            }


            .yam-delivered-delete-btn {

                border: none;

                border-radius: 8px;

                padding: 8px 10px;

                cursor: pointer;

                background: #fce8e6;

                font-size: 15px;
            }


            .yam-delivered-delete-btn:hover {

                transform: scale(1.08);
            }


            .yam-delivered-empty {

                text-align: center !important;

                padding: 35px !important;

                opacity: .65;
            }


            .yam-delivered-error {

                padding: 20px;

                text-align: center;

                color: #b00020;
            }


            .yam-delivered-error button {

                margin-left: 10px;

                padding: 8px 14px;

                border: none;

                border-radius: 8px;

                cursor: pointer;
            }


            @media (max-width: 800px) {

                .yam-delivered-dashboard-section {

                    padding: 15px;

                }


                .yam-delivered-dashboard-header {

                    flex-direction:
                        column;

                    align-items:
                        flex-start;

                }


                .yam-delivered-dashboard-stats {

                    grid-template-columns:
                        repeat(2, minmax(0, 1fr));

                }

            }


            @media (max-width: 480px) {

                .yam-delivered-dashboard-stats {

                    grid-template-columns:
                        1fr;

                }

            }

        `;


        document.head.appendChild(style);

    }


    /* =====================================================
       INIT
       ===================================================== */

    function initYamDeliveredDashboard() {

        addYamDeliveredStyles();

        loadYamDeliveredOrders();

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initYamDeliveredDashboard
        );

    } else {

        initYamDeliveredDashboard();

    }



/* =====================================================
   YAM SELF PRODUCTS DASHBOARD
   ===================================================== */

async function loadYamSelfProductsDashboard() {

    const old = document.getElementById("yamSelfProductsDashboard");

    if (old) {
        old.remove();
    }

    const section = document.createElement("section");

    section.id = "yamSelfProductsDashboard";

    section.style.cssText = `
        margin:25px 0;
        padding:20px;
        background:#ffffff;
        border-radius:18px;
        box-shadow:0 4px 18px rgba(0,0,0,.08);
    `;

    section.innerHTML = `
        <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:10px;
            flex-wrap:wrap;
            margin-bottom:20px;
        ">

            <div>
                <h2 style="margin:0;">
                    🏭 ያለ ትዕዛዝ የሰራናቸው ምርቶች
                </h2>

                <p style="margin:6px 0 0;color:#666;">
                    ራሳችን የሰራናቸው ምርቶች፣ Stock እና የትርፍ መረጃ
                </p>
            </div>

            <a
                href="self-products.html"
                style="
                    display:inline-block;
                    padding:10px 16px;
                    border-radius:10px;
                    text-decoration:none;
                    background:#0f3d2e;
                    color:#fff;
                "
            >
                ➕ ምርት መመዝገብ
            </a>

        </div>

        <div id="yamSelfProductsContent">
            ⏳ ምርቶች እየተጫኑ ነው...
        </div>
    `;

    const main =
        document.querySelector("main") ||
        document.body;

    main.appendChild(section);

    try {

        const response =
            await fetch("/api/self-products");

        const data =
            await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.error ||
                "Self products load failed"
            );
        }

        const products =
            Array.isArray(data.products)
                ? data.products
                : [];

        const container =
            document.getElementById(
                "yamSelfProductsContent"
            );

        if (!products.length) {

            container.innerHTML = `
                <div style="
                    padding:25px;
                    text-align:center;
                    background:#f7f7f7;
                    border-radius:14px;
                ">
                    📦 እስካሁን ያለ ትዕዛዝ የተሰራ ምርት የለም።

                    <br><br>

                    <a href="self-products.html">
                        ➕ የመጀመሪያ ምርት መመዝገብ
                    </a>
                </div>
            `;

            return;
        }

        let totalStock = 0;
        let totalSales = 0;
        let totalProfit = 0;

        const productsWithSales = await Promise.all(
            products.map(async product => {
                try {
                    const response =
                        await fetch(
                            "/api/self-products/" +
                            encodeURIComponent(product.id) +
                            "/sales"
                        );

                    const data = await response.json();

                    const summary =
                        response.ok && data.success
                            ? (data.summary || {})
                            : {};

                    return {
                        ...product,
                        actualSales:
                            Number(summary.totalSales || 0),
                        actualCost:
                            Number(summary.totalCost || 0),
                        actualProfit:
                            Number(summary.totalProfit || 0),
                        soldQuantity:
                            Number(summary.quantity || 0)
                    };

                } catch (error) {
                    console.error(
                        "Self product sales summary error:",
                        product.id,
                        error
                    );

                    return {
                        ...product,
                        actualSales: 0,
                        actualCost: 0,
                        actualProfit: 0,
                        soldQuantity: 0
                    };
                }
            })
        );

        totalStock = productsWithSales.reduce(
            (sum, product) =>
                sum + Number(product.stock || 0),
            0
        );

        totalSales = productsWithSales.reduce(
            (sum, product) =>
                sum + Number(product.actualSales || 0),
            0
        );

        totalProfit = productsWithSales.reduce(
            (sum, product) =>
                sum + Number(product.actualProfit || 0),
            0
        );

        const money = value =>
            Number(value || 0)
                .toLocaleString("en-US") +
            " ብር";

        container.innerHTML = `

            <div style="
                display:grid;
                grid-template-columns:
                    repeat(auto-fit,minmax(170px,1fr));
                gap:12px;
                margin-bottom:20px;
            ">

                <div style="
                    padding:16px;
                    border-radius:14px;
                    background:#f5f8f6;
                ">
                    <strong>📦 Total Stock</strong>
                    <div style="
                        font-size:24px;
                        font-weight:bold;
                        margin-top:6px;
                    ">
                        ${totalStock}
                    </div>
                </div>

                <div style="
                    padding:16px;
                    border-radius:14px;
                    background:#f5f8f6;
                ">
                    <strong>💰 ጠቅላላ ሽያጭ</strong>
                    <div style="
                        font-size:20px;
                        font-weight:bold;
                        margin-top:6px;
                    ">
                        ${money(totalSales)}
                    </div>
                </div>

                <div style="
                    padding:16px;
                    border-radius:14px;
                    background:#f5f8f6;
                ">
                    <strong>📈 ጠቅላላ ትርፍ</strong>
                    <div style="
                        font-size:20px;
                        font-weight:bold;
                        margin-top:6px;
                    ">
                        ${money(totalProfit)}
                    </div>
                </div>

            </div>

            <div style="
                display:grid;
                grid-template-columns:
                    repeat(auto-fit,minmax(250px,1fr));
                gap:15px;
            ">

                ${productsWithSales.map(product => `

                    <div style="
                        border:1px solid #eee;
                        border-radius:15px;
                        padding:15px;
                        background:#fff;
                    ">

                        ${
                            product.photoUrl
                                ? `
                                    <img
                                        src="${String(
                                            product.photoUrl
                                        ).replace(/"/g,"&quot;")}"
                                        style="
                                            width:100%;
                                            height:170px;
                                            object-fit:cover;
                                            border-radius:12px;
                                            margin-bottom:10px;
                                        "
                                    >
                                  `
                                : ""
                        }

                        <h3 style="margin:5px 0 10px;">
                            ${String(
                                product.productName || "-"
                            )}
                        </h3>

                        <p>
                            📦 Stock:
                            <strong>
                                ${Number(product.stock || 0)}
                            </strong>
                        </p>

                        <p>
                            💵 የመሸጫ ዋጋ:
                            <strong>
                                ${money(product.sellPrice)}
                            </strong>
                        </p>

                        <p>
                            💸 የአንድ እቃ ወጪ:
                            <strong>
                                ${money(product.unitCost)}
                            </strong>
                        </p>

                        <p>
                            📈 የአንድ እቃ ትርፍ:
                            <strong>
                                ${money(product.unitProfit)}
                            </strong>
                        </p>

                        <p>
                            🛒 የተሸጠ ብዛት:
                            <strong>
                                ${Number(product.soldQuantity || 0)}
                            </strong>
                        </p>

                        <p>
                            💰 እውነተኛ ሽያጭ:
                            <strong>
                                ${money(product.actualSales)}
                            </strong>
                        </p>

                        <p>
                            🛠️ እውነተኛ ወጪ:
                            <strong>
                                ${money(product.actualCost)}
                            </strong>
                        </p>

                        <p>
                            📈 እውነተኛ ትርፍ:
                            <strong>
                                ${money(product.actualProfit)}
                            </strong>
                        </p>

                    </div>

                `).join("")}

            </div>
        `;

    } catch (error) {

        console.error(
            "Self Products Dashboard Error:",
            error
        );

        const container =
            document.getElementById(
                "yamSelfProductsContent"
            );

        if (container) {

            container.innerHTML = `
                <div style="
                    padding:20px;
                    border-radius:12px;
                    background:#fff1f1;
                    color:#b00020;
                ">
                    ❌ የራስ ምርቶችን ማምጣት አልተቻለም።
                    <br>
                    <small>
                        ${error.message}
                    </small>
                </div>
            `;
        }
    }
}

window.loadYamSelfProductsDashboard =
    loadYamSelfProductsDashboard;

document.addEventListener(
    "DOMContentLoaded",
    () => {
        loadYamSelfProductsDashboard();
    }
);

})();
