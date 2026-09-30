(() => {
  "use strict";

  const state = {
    items: [],
    movements: [],
    loading: false
  };

  const $ = id => document.getElementById(id);

  function number(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function text(value) {
    return String(value ?? "").trim();
  }

  function escapeHtml(value) {
    return text(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2
    }).format(number(value));
  }

  function formatBirr(value) {
    return formatNumber(value) + " ብር";
  }

  function formatDisplayEthiopianDate(value) {
    const raw = text(value);
    if (!raw) return "—";

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;

    if (typeof gregorianToEthiopian !== "function" ||
        typeof formatEthiopianDate !== "function") {
      return raw;
    }

    const ethiopian = gregorianToEthiopian(date);

    return formatEthiopianDate(
      ethiopian.year,
      ethiopian.month,
      ethiopian.day
    );
  }

  function getStockStatus(stock) {
    const value = number(stock);

    if (value <= 0) return "empty";
    if (value <= 2) return "low";
    return "ok";
  }

  function getStatusLabel(status) {
    if (status === "empty") return "🔴 ክምችት የጨረሰ";
    if (status === "low") return "⚠️ ዝቅተኛ ክምችት";
    return "✅ ጥሩ";
  }

  async function fetchJson(url) {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      }
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
      throw new Error(result.error || `API Error: ${response.status}`);
    }

    return result;
  }

  async function loadRawMaterials() {
    const result = await fetchJson("/api/raw-materials");
    const rows = Array.isArray(result.rawMaterials)
      ? result.rawMaterials
      : Array.isArray(result.materials)
        ? result.materials
        : [];

    return rows.map(item => {
      const stock = Math.max(0, number(item.stock));
      const unitCost = Math.max(0, number(item.unitCost));

      return {
        id: text(item.id),
        itemType: "rawMaterial",
        name: text(item.materialName || item.name) || "ያልተሰየመ ጥሬ እቃ",
        category: text(item.category),
        unit: text(item.unit),
        stock,
        unitCost,
        stockValue: stock * unitCost
      };
    });
  }

  async function loadSelfProducts() {
    const result = await fetchJson("/api/self-products");
    const rows = Array.isArray(result.products)
      ? result.products
      : Array.isArray(result.selfProducts)
        ? result.selfProducts
        : [];

    return rows.map(item => {
      const stock = Math.max(0, number(item.stock));
      const unitCost = Math.max(0, number(item.unitCost));

      return {
        id: text(item.id),
        itemType: "selfProduct",
        name: text(item.productName || item.name) || "ያልተሰየመ ምርት",
        category: text(item.productType || item.category),
        unit: "ቁጥር",
        stock,
        unitCost,
        stockValue: stock * unitCost
      };
    });
  }

  async function loadMovements() {
    const result = await fetchJson("/api/stock-movements?limit=100");

    return Array.isArray(result.movements)
      ? result.movements
      : [];
  }

  function updateSummary() {
    const items = state.items;

    const rawCount = items.filter(x => x.itemType === "rawMaterial").length;
    const selfCount = items.filter(x => x.itemType === "selfProduct").length;

    const totalValue = items.reduce(
      (sum, item) => sum + number(item.stockValue),
      0
    );

    const lowCount = items.filter(
      item => getStockStatus(item.stock) === "low"
    ).length;

    const emptyCount = items.filter(
      item => getStockStatus(item.stock) === "empty"
    ).length;

    let stockIn = 0;
    let stockOut = 0;

    state.movements.forEach(movement => {
      const quantity = Math.max(0, number(movement.quantity));
      const type = text(movement.movementType).toUpperCase();

      if (
        type === "PURCHASE" ||
        type === "STOCK_IN" ||
        type === "IN" ||
        type === "PRODUCTION" ||
        type === "VOID_REVERSAL_IN"
      ) {
        stockIn += quantity;
      }

      if (
        type === "SALE" ||
        type === "STOCK_OUT" ||
        type === "OUT" ||
        type === "LOSS" ||
        type === "CONSUMPTION" ||
        type === "VOID_REVERSAL_OUT"
      ) {
        stockOut += quantity;
      }
    });

    $("stockTotalItems").textContent = formatNumber(items.length);
    $("stockRawMaterials").textContent = formatNumber(rawCount);
    $("stockSelfProducts").textContent = formatNumber(selfCount);
    $("stockTotalValue").textContent = formatBirr(totalValue);
    $("stockInQuantity").textContent = formatNumber(stockIn);
    $("stockOutQuantity").textContent = formatNumber(stockOut);
    $("stockLowCount").textContent = formatNumber(lowCount);
    $("stockEmptyCount").textContent = formatNumber(emptyCount);
  }

  function renderOverview() {
    const container = $("stockOverview");

    const search = text($("stockSearch").value).toLowerCase();
    const type = $("stockTypeFilter").value;
    const status = $("stockStatusFilter").value;

    const filtered = state.items.filter(item => {
      const matchesSearch =
        !search ||
        item.name.toLowerCase().includes(search) ||
        item.category.toLowerCase().includes(search);

      const matchesType =
        type === "all" || item.itemType === type;

      const itemStatus = getStockStatus(item.stock);

      const matchesStatus =
        status === "all" || itemStatus === status;

      return matchesSearch && matchesType && matchesStatus;
    });

    if (!filtered.length) {
      container.innerHTML =
        '<div class="yam-stock-empty">📦 የሚያሳይ የክምችት መረጃ የለም።</div>';
      return;
    }

    const rows = filtered.map(item => {
      const itemType =
        item.itemType === "rawMaterial"
          ? "🧱 ጥሬ እቃ"
          : "🛍️ የራስ ምርት";

      const itemStatus = getStockStatus(item.stock);

      return `
        <tr>
          <td>${escapeHtml(itemType)}</td>
          <td><strong>${escapeHtml(item.name)}</strong></td>
          <td>${escapeHtml(item.category || "—")}</td>
          <td>${formatNumber(item.stock)}</td>
          <td>${escapeHtml(item.unit || "—")}</td>
          <td>${formatBirr(item.unitCost)}</td>
          <td>${formatBirr(item.stockValue)}</td>
          <td>
            <span class="yam-stock-status ${itemStatus}">
              ${escapeHtml(getStatusLabel(itemStatus))}
            </span>
          </td>
        </tr>
      `;
    }).join("");

    container.innerHTML = `
      <div class="yam-stock-table-wrap">
        <table class="yam-stock-table">
          <thead>
            <tr>
              <th>ዓይነት</th>
              <th>ስም</th>
              <th>ምድብ</th>
              <th>ክምችት</th>
              <th>መለኪያ</th>
              <th>የአንድ እቃ ዋጋ</th>
              <th>የክምችት ዋጋ</th>
              <th>ሁኔታ</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  function renderLedger() {
    const container = $("stockLedger");

    if (!state.movements.length) {
      container.innerHTML =
        '<div class="yam-stock-empty">📒 እስካሁን የክምችት እንቅስቃሴ አልተመዘገበም።</div>';
      return;
    }

    const rows = state.movements.map(movement => {
      const type = text(movement.movementType).toUpperCase();

      const direction =
        type === "PURCHASE" ||
        type === "STOCK_IN" ||
        type === "IN" ||
        type === "PRODUCTION" ||
        type === "VOID_REVERSAL_IN"
          ? "📥 ገቢ"
          : "📤 ወጪ";

      const date =
        formatDisplayEthiopianDate(
          text(movement.movementDate) ||
          text(movement.createdAt)
        );

      return `
        <tr>
          <td>${escapeHtml(date)}</td>
          <td>${escapeHtml(movement.itemName || "—")}</td>
          <td>${escapeHtml(
            movement.itemType === "rawMaterial"
              ? "🧱 ጥሬ እቃ"
              : movement.itemType === "selfProduct"
                ? "🛍️ የራስ ምርት"
                : movement.itemType || "—"
          )}</td>
          <td>${escapeHtml(direction)}</td>
          <td>${formatNumber(movement.quantity)}</td>
          <td>${escapeHtml(movement.unit || "—")}</td>
          <td>${formatBirr(movement.totalValue)}</td>
          <td>${formatNumber(movement.remainingStock)}</td>
        </tr>
      `;
    }).join("");

    container.innerHTML = `
      <div class="yam-stock-table-wrap yam-stock-ledger">
        <table class="yam-stock-table">
          <thead>
            <tr>
              <th>ቀን</th>
              <th>እቃ</th>
              <th>ዓይነት</th>
              <th>እንቅስቃሴ</th>
              <th>ብዛት</th>
              <th>መለኪያ</th>
              <th>ዋጋ</th>
              <th>ቀሪ ክምችት</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  async function load() {
    if (state.loading) return;

    state.loading = true;

    try {
      const [rawMaterials, selfProducts, movements] =
        await Promise.all([
          loadRawMaterials(),
          loadSelfProducts(),
          loadMovements()
        ]);

      state.items = [...rawMaterials, ...selfProducts];
      state.movements = movements;

      updateSummary();
      renderOverview();
      renderLedger();

    } catch (error) {
      console.error("Module 15 Stock Load Error:", error);

      $("stockOverview").innerHTML = `
        <div class="yam-stock-error">
          ❌ የክምችት መረጃ ማምጣት አልተቻለም።<br>
          ${escapeHtml(error.message || error)}
        </div>
      `;

      $("stockLedger").innerHTML =
        '<div class="yam-stock-error">❌ የክምችት እንቅስቃሴ መረጃ ማምጣት አልተቻለም።</div>';
    } finally {
      state.loading = false;
    }
  }

  function bindEvents() {
    $("stockSearch").addEventListener("input", renderOverview);
    $("stockTypeFilter").addEventListener("change", renderOverview);
    $("stockStatusFilter").addEventListener("change", renderOverview);
  }

  window.yamStockModule15 = {
    state,
    load,
    refresh: load
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      bindEvents();
      load();
    });
  } else {
    bindEvents();
    load();
  }
})();
