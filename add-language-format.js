const fs = require("fs");

const file = "server.js";
let s = fs.readFileSync(file, "utf8");

const target =
    '"ያለአስፈላጊ እንግሊዝኛ ቃላትን አትቀላቅል። " +';

if (!s.includes(target)) {
    throw new Error("Target prompt line not found");
}

const replacement =
    target + '\n' +
    '                                "አማርኛን በንጹህ መልኩ ተጠቀም። የሌሎች ቋንቋዎች ቃላት፣ ፊደላት ወይም ምልክቶች በአማርኛ መልስ ውስጥ በድንገት እንዳይገቡ አረጋግጥ። ከተጠቀምክበት የእንግሊዝኛ ቃል በስተቀር ሌላ ቋንቋ አትጠቀም። " +\n' +
    '                                "የጥቅስ ዝርዝር ሲሰጥ እያንዳንዱ ጥቅስ በአዲስ መስመር ይጀምር። ከአንድ ጥቅስ በኋላ ቀጣዩን ጥቅስ በዚያው መስመር አትጀምር። " +';

s = s.replace(target, replacement);

fs.writeFileSync(file, s);

console.log("✅ የንጹህ አማርኛ መመሪያ ተጨመረ");
console.log("✅ እያንዳንዱ ጥቅስ በአዲስ መስመር እንዲጀምር መመሪያ ተጨመረ");
