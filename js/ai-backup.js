// =====================================
// YamGiftET AI v2
// AI Assistant
// =====================================

const chatBox = document.getElementById("chatBox");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

function addMessage(sender, message){

chatBox.innerHTML += `
<p><strong>${sender}:</strong> ${message}</p>
`;

chatBox.scrollTop = chatBox.scrollHeight;

}

function aiReply(text){

text = text.toLowerCase();

if(text.includes("ሰላም")){

return "👋 ሰላም! እንዴት ልርዳዎ?";

}

if(text.includes("ዋጋ")){

return "💰 የኢፖክሲ ፍሬም ዋጋ ከ2500 ብር ጀምሮ ነው።";

}

if(text.includes("ልደት")){

return "🎂 ለልደት Custom Epoxy Frame እንመክራለን።";

}

if(text.includes("ሰርግ")){

return "💍 ለሰርግ Luxury Epoxy Frame ተስማሚ ነው።";

}

if(text.includes("ፍቅር")){

return "❤️ Love Frame እና Couple Gift እንመክራለን።";

}

return "🤖 ይቅርታ፣ ይህን ጥያቄ አሁን አልተረዳሁትም።";

}

if(sendBtn){

sendBtn.addEventListener("click",function(){

const message = userInput.value.trim();

if(message==="") return;

addMessage("😊 እርስዎ",message);

const reply = aiReply(message);

setTimeout(function(){

addMessage("🤖 AI",reply);

},500);

userInput.value="";

});

}
