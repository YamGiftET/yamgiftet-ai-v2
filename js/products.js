// =====================================
// YamGiftET AI v2
// Product Knowledge Base
// =====================================

console.log("✅ YamGiftET Products loaded successfully");

var yamGiftProducts = [

  {
    id: "epoxy-30x40",
    name: "Custom Epoxy Frame 30x40",
    category: "frame",
    size: "30x40 cm",
    priceFrom: 2500,
    suitableFor: [
      "እናት",
      "አባት",
      "ፍቅረኛ",
      "ልጅ",
      "ጓደኛ"
    ],
    occasions: [
      "ልደት",
      "ፍቅር",
      "ሰርግ",
      "የእናቶች ቀን",
      "የአባቶች ቀን"
    ],
    description:
      "በደንበኛው ፎቶ እና በልዩ ዲዛይን የሚዘጋጅ Custom Epoxy Frame።"
  },

  {
    id: "epoxy-40x30",
    name: "Custom Epoxy Frame 40x30",
    category: "frame",
    size: "40x30 cm",
    priceFrom: 2500,
    suitableFor: [
      "እናት",
      "አባት",
      "ፍቅረኛ",
      "ልጅ",
      "ጓደኛ"
    ],
    occasions: [
      "ልደት",
      "ፍቅር",
      "ሰርግ",
      "ምርቃት"
    ],
    description:
      "ለቤት ወይም ለስጦታ የሚሆን ልዩ የEpoxy Frame ዲዛይን።"
  },

  {
    id: "love-frame",
    name: "Love & Couple Frame",
    category: "gift",
    priceFrom: 2500,
    suitableFor: [
      "ፍቅረኛ",
      "ባል",
      "ሚስት"
    ],
    occasions: [
      "ፍቅር",
      "ልደት",
      "Anniversary",
      "Valentine"
    ],
    description:
      "የጥንዶችን ፎቶ እና የፍቅር ጥቅስ የሚያካትት ልዩ የስጦታ ፍሬም።"
  },

  {
    id: "birthday-gift",
    name: "Personalized Birthday Gift",
    category: "gift",
    priceFrom: 2000,
    suitableFor: [
      "እናት",
      "አባት",
      "ፍቅረኛ",
      "ልጅ",
      "ጓደኛ"
    ],
    occasions: [
      "ልደት"
    ],
    description:
      "ስም፣ ፎቶ እና ልዩ መልዕክት የሚያካትት Personalized Gift።"
  }

];


// =====================================
// Find Products
// =====================================

function findYamGiftProducts(keyword) {

  const text = keyword.toLowerCase();

  return yamGiftProducts.filter(product => {

    const nameMatch =
      product.name.toLowerCase().includes(text);

    const categoryMatch =
      product.category.toLowerCase().includes(text);

    const sizeMatch =
      product.size &&
      product.size.toLowerCase().includes(text);

    const suitableMatch =
      product.suitableFor.some(person =>
        person.toLowerCase().includes(text)
      );

    const occasionMatch =
      product.occasions.some(occasion =>
        occasion.toLowerCase().includes(text)
      );

    return (
      nameMatch ||
      categoryMatch ||
      sizeMatch ||
      suitableMatch ||
      occasionMatch
    );

  });

}


// =====================================
// Get Product By ID
// =====================================

function getYamGiftProduct(id) {

  return yamGiftProducts.find(
    product => product.id === id
  );

}


// =====================================
// Get Products By Budget
// =====================================

function getYamGiftProductsByBudget(budget) {

  return yamGiftProducts.filter(
    product => product.priceFrom <= budget
  );

}
