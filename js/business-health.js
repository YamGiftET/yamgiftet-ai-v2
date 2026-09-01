/* =========================================================
   YamGiftET AI v2
   BUSINESS HEALTH CENTER
   ========================================================= */

(() => {
  "use strict";

  const API = "/api";

  const $ = id => document.getElementById(id);

  async function getJSON(url) {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
      throw new Error(data.error || "መረጃ ማምጣት አልተቻለም።");
    }

    return data;
  }

  const money = value =>
    Number(value || 0).toLocaleString("am-ET") + " ብር";

  async function loadBusinessHealth() {

    $("healthStatus").textContent =
      "የቢዝነሱ መረጃ እየተሰበሰበ ነው...";

    try {

      const results = await Promise.allSettled([
        getJSON(`${API}/finance/summary`),
        getJSON(`${API}/orders`),
        getJSON(`${API}/raw-materials`),
        getJSON(`${API}/self-products`)
      ]);

      const finance =
        results[0].status === "fulfilled"
          ? results[0].value
          : null;

      const orders =
        results[1].status === "fulfilled"
          ? results[1].value.orders || []
          : [];

      const materials =
        results[2].status === "fulfilled"
          ? results[2].value.materials || []
          : [];

      const products =
        results[3].status === "fulfilled"
          ? results[3].value.products || []
          : [];

      const sales = Number(
        finance?.sales?.total || 0
      );

      const expenses = Number(
        finance?.expenses?.total || 0
      );

      const profit = Number(
        finance?.profit?.estimatedNetProfit ||
        finance?.profit?.net ||
        0
      );

      const lowStock = materials.filter(material => {
        const stock = Number(material.stock || 0);
        const minimum = Number(material.minimumStock || 0);

        return minimum > 0 && stock <= minimum;
      }).length;

      const pendingOrders = orders.filter(order =>
        !order.delivered &&
        !order.isDelivered
      ).length;

      $("healthFinance").textContent =
        `ሽያጭ ${money(sales)} • ትርፍ ${money(profit)}`;

      $("healthOrders").textContent =
        `${orders.length} ትዕዛዞች • ${pendingOrders} በሂደት`;

      $("healthMaterials").textContent =
        `${materials.length} መዝገቦች • ${lowStock} ዝቅተኛ`;

      $("healthProducts").textContent =
        `${products.length} የራስ ምርቶች`;

      const advice = [];

      let healthScore = 100;

      if (!finance) {
        healthScore -= 30;
        advice.push(
          "⚠️ የፋይናንስ መረጃ ሙሉ በሙሉ አልተገኘም።"
        );
      }

      if (profit < 0) {
        healthScore -= 35;
        advice.push(
          "🚨 ንግዱ ኪሳራ እያሳየ ነው። ዋና ወጪዎችን በቅድሚያ ይመርምሩ።"
        );
      } else if (profit === 0 && sales > 0) {
        healthScore -= 20;
        advice.push(
          "⚠️ ሽያጭ እያለ ትርፍ ዜሮ ነው። የወጪ እና የስራ ዋጋ መዝገቦችን ይፈትሹ።"
        );
      } else if (profit > 0) {
        advice.push(
          "✅ ንግዱ ትርፋማ እየሆነ ነው። ትርፋማ ምርቶችን ማበረታታት ይመከራል።"
        );
      }

      if (lowStock > 0) {
        healthScore -= Math.min(20, lowStock * 5);

        advice.push(
          `📦 ${lowStock} ጥሬ እቃ ዝቅተኛ ነው። የግዢ እቅድ ያዘጋጁ።`
        );
      }

      if (pendingOrders > 0) {
        healthScore -= Math.min(15, pendingOrders * 2);

        advice.push(
          `⏰ ${pendingOrders} ትዕዛዝ በሂደት ላይ ነው። የማስረከቢያ ቀኖችን ይከታተሉ።`
        );
      }

      if (expenses > sales && sales > 0) {
        healthScore -= 20;

        advice.push(
          "🚨 ጠቅላላ ወጪ ከሽያጭ በላይ ነው።"
        );
      }

      healthScore = Math.max(
        0,
        Math.min(100, healthScore)
      );

      let status;

      if (healthScore >= 80) {
        status = `🟢 የቢዝነስ ጤና: ጥሩ — ${healthScore}/100`;
      } else if (healthScore >= 60) {
        status = `🟡 የቢዝነስ ጤና: መካከለኛ — ${healthScore}/100`;
      } else {
        status = `🔴 የቢዝነስ ጤና: ትኩረት ያስፈልጋል — ${healthScore}/100`;
      }

      $("healthStatus").textContent = status;

      if (!advice.length) {
        advice.push(
          "🤖 ከፍተኛ የጤና ችግር አልተገኘም። የንግድ መረጃዎን በየጊዜው ይከታተሉ።"
        );
      }

      $("businessHealthAdvice").innerHTML =
        advice.map(message => `
          <div class="management-advice-item">
            <span>${message.slice(0, 2)}</span>
            <p>${message.slice(2).trim()}</p>
          </div>
        `).join("");

    } catch (error) {

      console.error(
        "Business Health Error:",
        error
      );

      $("healthStatus").textContent =
        "⚠️ የቢዝነስ መረጃን ማገናኘት አልተቻለም።";

      $("businessHealthAdvice").innerHTML = `
        <div class="management-advice-item">
          <span>⚠️</span>
          <p>የቢዝነስ መረጃዎችን ማምጣት አልተቻለም።</p>
        </div>
      `;
    }
  }

  window.yamGiftBusinessHealth = {
    load: loadBusinessHealth,
    refresh: loadBusinessHealth
  };

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      loadBusinessHealth
    );
  } else {
    loadBusinessHealth();
  }

})();
