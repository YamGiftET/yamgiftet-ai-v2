// =====================================
// YamGiftET AI v2
// Firebase Customer Manager
// =====================================

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
