// ================================
// YamGiftET AI v2
// Module 1
// ================================

console.log("YamGiftET AI v2 Started");

/* ===============================
   Welcome Message
=============================== */

window.onload = function() {
  
  console.log("Website Loaded");
  
};

/* ===============================
   Start Button
=============================== */

const startButton =
  document.getElementById("startBtn");

if (startButton) {
  
  startButton.addEventListener("click", function() {
    
    alert(
      
      "🎉 እንኳን ወደ YamGiftET AI v2 በደህና መጡ!"
      
    );
    
  });
  
}
/* ===============================
   AI Daily Quotes
=============================== */

const quotes = [
  
  "🌞 ዛሬ የምትጀምረው ትንሽ እርምጃ ነገ ትልቅ ስኬት ይሆናል።",
  
  "❤️ ፍቅር በልብ ይጀምራል፤ ስጦታ ግን ያሳየዋል።",
  
  "🎁 የዛሬ ስጦታ የነገ ትዝታ ነው።",
  
  "📖 በእግዚአብሔር ሁሉ ይቻላል።",
  
  "💼 ደንበኛን በደስታ ካገለገልክ ንግድህ ያድጋል።"
  
];

function showDailyQuote() {
  
  const random =
    Math.floor(Math.random() * quotes.length);
  
  alert(quotes[random]);
  
}

if (startButton) {
  
  startButton.addEventListener("dblclick", function() {
    
    showDailyQuote();
    
  });
  
}