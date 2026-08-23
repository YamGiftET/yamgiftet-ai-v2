const { db } = require("./firebase");

async function testProductsFirestore() {
    const snapshot = await db.collection("products").get();

    console.log("🔥 Firebase Products connection OK");
    console.log("📦 Products found:", snapshot.size);

    snapshot.forEach((doc) => {
        console.log(doc.id, doc.data());
    });
}

testProductsFirestore().catch((error) => {
    console.error("❌ Firebase Products Error:");
    console.error(error);
});
