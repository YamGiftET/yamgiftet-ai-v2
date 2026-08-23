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

        const response =
            await fetch("/api/orders");

        const data =
            await response.json();

        if (!response.ok || !data.success) {

            throw new Error(
                data.error ||
                "የደንበኞችን መረጃ ማምጣት አልተቻለም።"
            );

        }

        const orders =
            data.orders || [];

        console.log(
            "📦 Firebase Orders:",
            orders.length
        );

        if (
            typeof buildCustomers === "function" &&
            typeof renderCustomers === "function"
        ) {

            customersData =
                buildCustomers(orders);

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
