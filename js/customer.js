// =====================================
// YamGiftET AI v2
// Firebase Customer Manager
// =====================================
function formatBirr(amount) {
    return Number(amount || 0).toLocaleString("en-US") + " ብር";
}

function escapeHTML(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


console.log("👥 Firebase Customer Manager ተጀምሯል።");


// =====================================
// Firebase Orders → Customers
// =====================================

async function loadFirebaseCustomers() {

    try {

        const [ordersResponse, contactsResponse] = await Promise.all([
            fetch("/api/orders"),
            fetch("/api/contacts")
        ]);

        const data = await ordersResponse.json();
        const contactsData = await contactsResponse.json();

        if (!ordersResponse.ok || !data.success) {
            throw new Error(data.error || "የትዕዛዝ መረጃ ማምጣት አልተቻለም።");
        }

        if (!contactsResponse.ok || !contactsData.success) {
            throw new Error(contactsData.error || "የContact መረጃ ማምጣት አልተቻለም።");
        }

        const orders = data.orders || [];
        const contacts = contactsData.contacts || [];

        console.log(
            "📦 Firebase Orders:",
            orders.length
        );

        if (
            typeof buildCustomers === "function" &&
            typeof renderCustomers === "function"
        ) {

            customersData =
                buildCustomers(orders, contacts);

            renderCustomers(
                customersData
            );

        }

        return orders;

    } catch (error) {

        console.error(
            "❌ Firebase Customers Error:",
            error
        );

        return [];

    }

}


// =====================================
// Customer Search
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
                () => {

                    if (
                        typeof filterCustomers ===
                        "function"
                    ) {
                        filterCustomers();
                    }

                }
            );

        }

        loadFirebaseCustomers();

    }
);
let customersData = [];
let currentCustomerOrders = [];


// =====================================
// 👥 Customers ከ Orders መፍጠር
// =====================================

function normalizeCustomerPhone(value) {
  return String(value || "").replace(/[^0-9+]/g, "").replace(/^00/, "+");
}

function buildCustomers(orders, contacts = []) {

    const customers = new Map();

    (orders || []).forEach(order => {

        const phone = normalizeCustomerPhone(order.phone);

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

    (contacts || []).forEach(contact => {
        const phone = normalizeCustomerPhone(contact.phone);
        const name = String(contact.name || "").trim();
        if (!phone && !name) return;

        const key = phone || name.toLowerCase();

        if (!customers.has(key)) {
            customers.set(key, {
                name: name || "ያልተጠቀሰ",
                phone: phone || "-",
                orders: [],
                totalIncome: 0,
                totalRemaining: 0
            });
        } else {
            const customer = customers.get(key);
            if (name && customer.name === "ያልተጠቀሰ") {
                customer.name = name;
            }
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
  const tbody = document.getElementById("customerHistoryBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!orders || !orders.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">የትዕዛዝ ታሪክ የለም።</td>
      </tr>
    `;
    return;
  }

  orders.forEach(order => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td><strong>${escapeHTML(order.productName || "-")}</strong></td>
      <td>${escapeHTML(order.orderDate || order.createdAt || "-")}</td>
      <td>${formatBirr(order.totalAmount)}</td>
      <td>${formatBirr(order.deposit)}</td>
      <td>${formatBirr(order.remaining)}</td>
      <td>${formatBirr(order.profit)}</td>
      <td><span class="order-status">${escapeHTML(order.status || "አዲስ")}</span></td>
    `;

    tbody.appendChild(row);
  });
}


// =====================================
// ❌ Close Customer Details
// =====================================

window.openCustomerDetails = openCustomerDetails;

function closeCustomerDetails() {
window.closeCustomerDetails = closeCustomerDetails;

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
