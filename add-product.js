const { db } = require("./firebase");

async function addProduct() {
    const product = {
        name: "Epoxy Frame",
        nameAm: "ኢፖክሲ ፍሬም",
        category: "ፍሬም",
        description: "የግል ፎቶን በሚያምር መልኩ የሚያስቀምጥ የኢፖክሲ ፍሬም።",
        price: 0,
        currency: "ETB",
        available: true,
        createdAt: new Date().toISOString()
    };

    const doc = await db.collection("products").add(product);

    console.log("✅ Product added to Firebase");
    console.log("🆔 Product ID:", doc.id);
}

addProduct().catch((error) => {
    console.error("❌ Error adding product:");
    console.error(error);
});
