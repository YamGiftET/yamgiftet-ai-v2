// =====================================
// YamGiftET AI v2
// Frame Generator
// =====================================

const frameIdeas = {
  
  birthday: {
    
    title: "🎂 Birthday Frame",
    
    color: "Blue & Gold",
    
    message: "መልካም ልደት! ዕድሜና ጤና ይብዛልህ።"
    
  },
  
  love: {
    
    title: "❤️ Love Frame",
    
    color: "Red & White",
    
    message: "ፍቅራችሁ ለዘላለም ይኑር።"
    
  },
  
  wedding: {
    
    title: "💍 Wedding Frame",
    
    color: "White & Gold",
    
    message: "መልካም ትዳር ይሁንላችሁ።"
    
  },
  
  family: {
    
    title: "👨‍👩‍👧 Family Frame",
    
    color: "Brown & Cream",
    
    message: "ቤተሰብ ከሁሉ በላይ ሀብት ነው።"
    
  }
  
};

function generateFrame(type) {
  
  if (!frameIdeas[type]) {
    
    console.log("Frame Not Found");
    
    return;
    
  }
  
  const frame = frameIdeas[type];
  
  console.log("==========");
  
  console.log(frame.title);
  
  console.log("Color:", frame.color);
  
  console.log(frame.message);
  
  console.log("==========");
  
}