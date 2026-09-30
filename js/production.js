(() => {
  "use strict";

  const PRODUCTS_API = "/api/self-products";
  const RECIPES_API = "/api/recipes";
  const MATERIALS_API = "/api/raw-materials";
  const ORDERS_API = "/api/orders";

  const productSelect = document.getElementById("productionProduct");
  const recipeSelect = document.getElementById("productionRecipe");
  const orderSelect = document.getElementById("productionOrder");
  const sourceTypeSelect =
    document.getElementById("productionSourceType");
  const orderGroup =
    document.getElementById("productionOrder")?.closest(".form-group");

  let products = [];
  let recipes = [];
  let materials = [];
  let orders = [];
  let productions = [];

  function isSelfProduction() {
    return sourceTypeSelect?.value === "self_production";
  }

  function updateProductionSourceUI() {
    const selfProduction = isSelfProduction();

    if (orderGroup) {
      orderGroup.hidden = selfProduction;
    }

    if (orderSelect) {
      orderSelect.required = !selfProduction;
      orderSelect.disabled = selfProduction;

      if (selfProduction) {
        orderSelect.value = "";
      }
    }

    const summary =
      document.getElementById("productionOrderSummary");

    if (summary && selfProduction) {
      summary.hidden = true;
    }

    if (selfProduction) {
      const quantityInput =
        document.getElementById("productionQuantity");

      if (quantityInput) {
        quantityInput.removeAttribute("max");
      }
    }

    updateProductionAvailability();
  }

  sourceTypeSelect?.addEventListener(
    "change",
    updateProductionSourceUI
  );

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async function loadProductionData() {
    const [
      productsResponse,
      recipesResponse,
      materialsResponse,
      ordersResponse,
      productionsResponse
    ] = await Promise.all([
      fetch(PRODUCTS_API),
      fetch(RECIPES_API),
      fetch(MATERIALS_API),
      fetch(ORDERS_API),
      fetch("/api/productions")
    ]);

    const productsData = await productsResponse.json();
    const recipesData = await recipesResponse.json();
    const materialsData = await materialsResponse.json();
    const ordersData = await ordersResponse.json();
    const productionsData = await productionsResponse.json();

    if (!productsResponse.ok || !productsData.success) {
      throw new Error(
        productsData.error || "ምርቶችን መጫን አልተቻለም።"
      );
    }

    if (!recipesResponse.ok || !recipesData.success) {
      throw new Error(
        recipesData.error || "Recipe ማስጫን አልተቻለም።"
      );
    }

    if (!materialsResponse.ok || !materialsData.success) {
      throw new Error(
        materialsData.error || "ጥሬ ዕቃዎችን መጫን አልተቻለም።"
      );
    }

    products = productsData.products || [];
    recipes = (recipesData.recipes || [])
      .filter(recipe => recipe.active === true);
    materials = materialsData.materials || [];
    orders = ordersData.orders || [];
    productions = productionsData.productions || [];

    renderOrders();
    renderProducts();
    renderRecipes();
    updateProductionSourceUI();
    updateProductionDashboardAndHistory();
  }


  // =====================================
  // Production Dashboard + History
  // =====================================

  function getProductionStatus(production) {
    return String(production?.status || "completed").trim().toLowerCase();
  }

  function formatProductionDate(value) {
    const raw = String(value || "").trim();

    if (!raw) return "—";

    const parts = raw.split("-");

    if (parts.length === 3) {
      const year = Number(parts[0]);
      const month = Number(parts[1]);
      const day = Number(parts[2]);

      if (
        Number.isInteger(year) &&
        Number.isInteger(month) &&
        Number.isInteger(day) &&
        month >= 1 &&
        month <= 13 &&
        day >= 1
      ) {
        if (
          typeof formatEthiopianDate === "function" &&
          month <= 13
        ) {
          return formatEthiopianDate(year, month, day);
        }
      }
    }

    return raw;
  }

  function formatProductionDateTime(value) {
    const raw = String(value || "").trim();

    if (!raw) return "—";

    const date = new Date(raw);

    if (Number.isNaN(date.getTime())) {
      return raw;
    }

    if (typeof gregorianToEthiopian === "function") {
      const ethiopian = gregorianToEthiopian(date);

      const dateText =
        typeof formatEthiopianDate === "function"
          ? formatEthiopianDate(
              ethiopian.year,
              ethiopian.month,
              ethiopian.day
            )
          : `${ethiopian.day}/${ethiopian.month}/${ethiopian.year}`;

      const ethiopianTime = new Date(
        date.getTime() + (3 * 60 * 60 * 1000)
      );

      const timeText = ethiopianTime.toISOString().slice(11, 16);

      return `${dateText} ${timeText}`;
    }

    return date.toLocaleString();
  }

  function renderProductionDashboard() {
    const todayEl = document.getElementById("todayProductionCount");
    const totalEl = document.getElementById("totalProductionCount");
    const completedEl = document.getElementById("completedProductionCount");
    const pendingEl = document.getElementById("pendingProductionCount");

    if (!todayEl || !totalEl || !completedEl || !pendingEl) return;

    const today = new Date();
    const todayISO =
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const completed = productions.filter(
      production => getProductionStatus(production) === "completed"
    );

    const pending = productions.filter(
      production => getProductionStatus(production) === "pending"
    );

    const todayProductions = productions.filter(production => {
      const productionDate = String(
        production?.productionDate || ""
      ).slice(0, 10);

      return productionDate === todayISO;
    });

    todayEl.textContent = todayProductions.length;
    totalEl.textContent = productions.length;
    completedEl.textContent = completed.length;
    pendingEl.textContent = pending.length;
  }

  async function voidProduction(productionId) {
    const id = String(productionId || "").trim();

    if (!id) {
      alert("❌ Production ID አልተገኘም።");
      return;
    }

    const confirmed = window.confirm(
      "⚠️ ይህን Production Void ማድረግ ይፈልጋሉ?\\n\\n" +
      "የተጠቀመው Raw Material ወደ Stock ይመለሳል፣ " +
      "የFinished Product Stock ደግሞ ይቀነሳል።\\n\\n" +
      "History record ግን አይጠፋም።"
    );

    if (!confirmed) return;

    const reason = window.prompt(
      "የVoid ምክንያት ያስገቡ፦",
      "Production በስህተት ተመዝግቧል"
    );

    if (reason === null) return;

    try {
      const response = await fetch(
        `/api/productions/${encodeURIComponent(id)}/void`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            reason: String(reason || "").trim()
          })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Production Void ማድረግ አልተሳካም።"
        );
      }

      alert(
        data.alreadyVoided
          ? "ℹ️ ይህ Production ቀድሞ Void ተደርጓል።"
          : "✅ Production Void ተደርጓል። Stock reversal ተሳክቷል።"
      );

      await loadProductionData();
      updateProductionDashboardAndHistory();
      updateProductionAvailability();

    } catch (error) {
      console.error("❌ Production Void error:", error);

      alert(
        `❌ Production Void አልተሳካም።\\n\\n${
          error.message || error
        }`
      );
    }
  }

  function renderProductionHistory() {
    const history = document.getElementById("productionHistory");
    const searchInput = document.getElementById("productionSearch");
    const statusFilter = document.getElementById("productionStatusFilter");

    if (!history) return;

    const search = String(searchInput?.value || "")
      .trim()
      .toLowerCase();

    const selectedStatus = String(statusFilter?.value || "")
      .trim()
      .toLowerCase();

    const filtered = productions.filter(production => {
      const status = getProductionStatus(production);

      if (selectedStatus && status !== selectedStatus) {
        return false;
      }

      if (!search) return true;

      const searchableText = [
        production?.productName,
        production?.customer?.name,
        production?.customer?.phone,
        production?.orderId,
        production?.productionId,
        production?.recipeId,
        production?.sourceType,
        production?.status
      ]
        .map(value => String(value || "").toLowerCase())
        .join(" ");

      return searchableText.includes(search);
    });

    if (!filtered.length) {
      history.innerHTML =
        "<p>📭 የሚያሟላ የምርት ታሪክ የለም።</p>";
      return;
    }

    const sortedProductions = filtered
      .slice()
      .sort((a, b) => {
        const aTime =
          Date.parse(a?.createdAt || "") ||
          Date.parse(a?.productionDate || "") ||
          0;

        const bTime =
          Date.parse(b?.createdAt || "") ||
          Date.parse(b?.productionDate || "") ||
          0;

        return bTime - aTime;
      });

    history.innerHTML = sortedProductions
      .map(production => {
        const status = getProductionStatus(production);
        const source =
          production?.sourceType === "customer_order"
            ? "📋 Customer Order"
            : "📦 Self Production";

        const quantity = Number(production?.quantity || 0);

        const cost =
          Number(production?.totalCost || 0);

        const profit =
          Number(production?.expectedProfit || 0);

        const customer =
          production?.customer?.name ||
          "";

        const orderText =
          production?.orderId
            ? `<div><strong>Order ID:</strong> ${esc(production.orderId)}</div>`
            : "";

        const customerText =
          customer
            ? `<div><strong>👤 Customer:</strong> ${esc(customer)}</div>`
            : "";

        return `
          <details class="production-history-card">
            <summary>
              <div class="production-history-summary">
                <div class="production-history-summary-main">
                  <strong>🏭 ${esc(production.productName || "—")}</strong>
                  <span class="production-history-summary-meta">
                    📦 ${quantity} • ${esc(source)} • ${esc(status)}
                  </span>
                </div>
                <span aria-hidden="true">▼</span>
              </div>
            </summary>

            <div class="production-history-details">
              <div>📦 ብዛት: <strong>${quantity}</strong></div>
              <div>${source}</div>
              ${customerText}
              ${orderText}
              <div>📋 Recipe: ${esc(production.recipeVersion ? `Version ${production.recipeVersion}` : "—")}</div>
              <div>📅 ${esc(formatProductionDate(production.productionDate))}</div>
              <div class="production-history-materials">
                <strong>🧱 የተጠቀሙ ጥሬ ዕቃዎች:</strong>
                ${
                  Array.isArray(production.materialsUsed) && production.materialsUsed.length
                    ? `<ul>${production.materialsUsed.map(material => `
                        <li>
                          ${esc(material.materialName || material.materialId || "—")}
                          — ${Number(material.quantity || 0)}
                          ${esc(material.unit || "")}
                          — ${Number(material.totalValue || 0)} ብር
                        </li>
                      `).join("")}</ul>`
                    : "<div>— የተመዘገበ የጥሬ ዕቃ መረጃ የለም።</div>"
                }
              </div>
              <div>💰 የምርት ወጪ: ${cost} ብር</div>
              <div>💵 Unit Cost: ${Number(production?.unitCost || 0)} ብር</div>
              <div>🏷️ Selling Price: ${Number(production?.expectedSellingPrice || 0)} ብር</div>
              <div>📈 የሚጠበቅ ትርፍ: ${profit} ብር</div>
              <div>🆔 Production ID: ${esc(production?.productionId || production?.id || "—")}</div>
              <div>🔹 Status: <strong>${esc(status)}</strong></div>
              ${
                status === "voided"
                  ? `
                    <div>⚠️ Void Reason: ${esc(production?.voidReason || "—")}</div>
                    <div>🕒 Voided At: ${esc(formatProductionDateTime(production?.voidedAt))}</div>
                    <div>
                      🔄 Reversal Movements:
                      ${
                        Array.isArray(production?.reversalMovementIds) &&
                        production.reversalMovementIds.length
                          ? esc(production.reversalMovementIds.join(", "))
                          : "—"
                      }
                    </div>
                  `
                  : ""
              }
              ${
                status === "completed"
                  ? `<button
                      type="button"
                      class="production-void-btn"
                      onclick="voidProduction('${esc(production.productionId || "")}')"
                    >⚫ Void</button>`
                  : ""
              }
            </div>
          </details>
        `;
      })
      .join("");
  }

  document.getElementById("productionSearch")?.addEventListener(
    "input",
    renderProductionHistory
  );

  document.getElementById("productionStatusFilter")?.addEventListener(
    "change",
    renderProductionHistory
  );

  function updateProductionDashboardAndHistory() {
    renderProductionDashboard();
    renderProductionHistory();
  }

  function getProducedQuantity(orderId) {
    return productions
      .filter(production =>
        production.orderId === orderId &&
        production.status === "completed"
      )
      .reduce((total, production) => {
        return total + Number(production.quantity || 0);
      }, 0);
  }

  function renderOrders() {
    if (!orderSelect) return;

    const availableOrders = orders.filter(order => {
      const orderedQuantity = Number(order.quantity || 0);
      const producedQuantity = getProducedQuantity(order.id);
      const remainingQuantity = orderedQuantity - producedQuantity;

      return (
        Number.isInteger(orderedQuantity) &&
        orderedQuantity > 0 &&
        remainingQuantity > 0 &&
        order.delivered !== true &&
        order.isDelivered !== true
      );
    });

    orderSelect.innerHTML =
      '<option value="">-- Order ይምረጡ --</option>' +
      availableOrders.map(order => {
        const remaining = Number(order.quantity || 0) -
          getProducedQuantity(order.id);

        return `<option value="${esc(order.id)}">
          ${esc(order.customerName || "-")} — ${esc(order.productName || "-")}
          — Remaining: ${remaining}
        </option>`;
      }).join("");

    if (availableOrders.length === 0) {
      orderSelect.innerHTML +=
        '<option value="" disabled>ለምርት ዝግጁ Order የለም</option>';
    }
  }

  function updateSelectedOrder() {
    const orderId = orderSelect?.value || "";
    const order = orders.find(item => item.id === orderId);

    const summary = document.getElementById("productionOrderSummary");
    const customer = document.getElementById("productionOrderCustomer");
    const ordered = document.getElementById("productionOrderQuantity");
    const produced = document.getElementById("productionOrderProduced");
    const remaining = document.getElementById("productionOrderRemaining");

    const orderedUnit =
      document.getElementById("productionOrderQuantityUnit");
    const producedUnit =
      document.getElementById("productionOrderProducedUnit");
    const remainingUnit =
      document.getElementById("productionOrderRemainingUnit");

    if (!order) {
      if (summary) summary.hidden = true;
      if (productSelect) productSelect.value = "";
      if (recipeSelect) recipeSelect.value = "";
      updateProductionAvailability();
      return;
    }

    const orderedQuantity = Number(order.quantity || 0);
    const producedQuantity = getProducedQuantity(order.id);
    const remainingQuantity = Math.max(
      0,
      orderedQuantity - producedQuantity
    );

    const orderUnit = order.unit || "pcs";

    if (summary) summary.hidden = false;
    if (customer) customer.textContent = order.customerName || "-";
    if (ordered) ordered.textContent = orderedQuantity;
    if (produced) produced.textContent = producedQuantity;
    if (remaining) remaining.textContent = remainingQuantity;

    if (orderedUnit) orderedUnit.textContent = orderUnit;
    if (producedUnit) producedUnit.textContent = orderUnit;
    if (remainingUnit) remainingUnit.textContent = orderUnit;

    if (productSelect) {
      productSelect.value = String(order.productId || "");
    }

    filterRecipesByProduct();

    const matchingRecipe = recipes.find(
      recipe => recipe.productId === String(order.productId || "")
    );

    if (matchingRecipe && recipeSelect) {
      recipeSelect.value = matchingRecipe.id;
    }

    const quantityInput = document.getElementById("productionQuantity");

    if (quantityInput) {
      quantityInput.max = String(remainingQuantity);
      quantityInput.value = remainingQuantity > 0
        ? String(remainingQuantity)
        : "";
    }

    updateProductionAvailability();
  }

  orderSelect?.addEventListener(
    "change",
    updateSelectedOrder
  );

  function renderProducts() {
    if (!productSelect) return;

    productSelect.innerHTML =
      '<option value="">-- ምርት ይምረጡ --</option>' +
      products.map(product =>
        `<option value="${esc(product.id)}" data-unit="${esc(product.unit || "pcs")}">${
          esc(product.productName || "-")
        }</option>`
      ).join("");
  }

  function renderRecipes() {
    if (!recipeSelect) return;

    recipeSelect.innerHTML =
      '<option value="">-- Recipe ይምረጡ --</option>' +
      recipes.map(recipe =>
        `<option value="${esc(recipe.id)}" data-product-id="${
          esc(recipe.productId)
        }">
          ${esc(recipe.productName || "-")} — Version ${
            esc(recipe.recipeVersion || 1)
          }
        </option>`
      ).join("");
  }

  function filterRecipesByProduct() {
    if (!recipeSelect) return;

    const productId = productSelect?.value || "";

    [...recipeSelect.options].forEach((option, index) => {
      if (index === 0) {
        option.hidden = false;
        return;
      }

      option.hidden =
        Boolean(productId) &&
        option.dataset.productId !== productId;
    });

    recipeSelect.value = "";
  }

  productSelect?.addEventListener(
    "change",
    () => {
      const selected = productSelect.selectedOptions?.[0];
      const selectedUnit =
        selected?.dataset?.unit?.trim() || "pcs";

      const quantityUnit =
        document.getElementById("productionQuantityUnit");

      if (quantityUnit) {
        quantityUnit.textContent = selectedUnit;
      }

      filterRecipesByProduct();
      updateProductionAvailability();
    }
  );

  recipeSelect?.addEventListener(
    "change",
    updateProductionAvailability
  );

  document.getElementById("productionQuantity")?.addEventListener(
    "input",
    updateProductionAvailability
  );

  function getSelectedRecipe() {
    const recipeId = recipeSelect?.value || "";
    return recipes.find(recipe => recipe.id === recipeId) || null;
  }

  function getMaterialById(materialId) {
    return materials.find(material => material.id === materialId) || null;
  }

  function calculateProductionCapacity(recipe) {
    if (!recipe || !Array.isArray(recipe.materials) || recipe.materials.length === 0) {
      return {
        canProduce: false,
        capacity: 0,
        materials: []
      };
    }

    let capacity = Infinity;
    const materialResults = [];

    for (const recipeMaterial of recipe.materials) {
      const material = getMaterialById(recipeMaterial.materialId);

      if (!material) {
        return {
          canProduce: false,
          capacity: 0,
          materials: materialResults,
          missingMaterial: recipeMaterial.materialId
        };
      }

      const quantityPerUnit = Number(recipeMaterial.quantityPerUnit);
      const currentStock = Number(material.stock);

      if (
        !Number.isFinite(quantityPerUnit) ||
        quantityPerUnit <= 0 ||
        !Number.isFinite(currentStock) ||
        currentStock < 0
      ) {
        return {
          canProduce: false,
          capacity: 0,
          materials: materialResults,
          invalidMaterial: material.materialName
        };
      }

      const recipeUnit =
        window.yamUnitsConverter?.normalizeUnit(
          recipeMaterial.unit || material.unit || ""
        ) || "";

      const stockUnit =
        window.yamUnitsConverter?.normalizeUnit(
          material.unit || recipeMaterial.unit || ""
        ) || "";

      if (!recipeUnit || !stockUnit) {
        return {
          canProduce: false,
          capacity: 0,
          materials: materialResults,
          invalidMaterial: material.materialName
        };
      }

      let requiredStockPerUnit;

      try {
        requiredStockPerUnit =
          window.yamUnitsConverter.convert(
            quantityPerUnit,
            recipeUnit,
            stockUnit,
            recipeMaterial.category ||
              material.category ||
              ""
          );
      } catch (error) {
        return {
          canProduce: false,
          capacity: 0,
          materials: materialResults,
          invalidMaterial: material.materialName
        };
      }

      if (
        !Number.isFinite(requiredStockPerUnit) ||
        requiredStockPerUnit <= 0
      ) {
        return {
          canProduce: false,
          capacity: 0,
          materials: materialResults,
          invalidMaterial: material.materialName
        };
      }

      const materialCapacity = Math.floor(
        currentStock / requiredStockPerUnit
      );

      capacity = Math.min(capacity, materialCapacity);

      materialResults.push({
        materialId: material.id,
        materialName: material.materialName,
        unit: stockUnit,
        stock: currentStock,
        quantityPerUnit,
        recipeUnit,
        requiredStockPerUnit,
        capacity: materialCapacity
      });
    }

    return {
      canProduce: capacity >= 1,
      capacity: Number.isFinite(capacity) ? capacity : 0,
      materials: materialResults
    };
  }

  function updateProductionAvailability() {
    const box = document.getElementById("productionCapacityBox");
    const status = document.getElementById("productionCapacityStatus");
    const preview = document.getElementById("productionMaterialsPreview");
    const quantityInput = document.getElementById("productionQuantity");

    const recipe = getSelectedRecipe();
    const requestedQuantity = Number(quantityInput?.value || 0);

    if (!box || !status || !preview) return;

    if (!recipe) {
      status.textContent = "Recipe አልተመረጠም።";
      preview.innerHTML = "";
      return;
    }

    const result = calculateProductionCapacity(recipe);

    preview.innerHTML = result.materials.map(item => {
      const required = item.requiredStockPerUnit * (
        Number.isFinite(requestedQuantity) && requestedQuantity > 0
          ? requestedQuantity
          : 0
      );

      const enough = item.stock >= required;

      return `
        <div class="production-material-row">
          <span>
            ${esc(item.materialName)}
            ${item.unit ? `(${esc(item.unit)})` : ""}
          </span>
          <strong>
            Stock: ${item.stock} ${item.unit || ""}
            / Required: ${required} ${item.unit || ""}
            ${enough ? "✅" : "❌"}
          </strong>
        </div>
      `;
    }).join("");

    if (result.capacity < 1) {
      status.textContent =
        "❌ በአሁኑ Stock ምርቱን ማምረት አይቻልም።";
      return;
    }

    if (
      Number.isFinite(requestedQuantity) &&
      requestedQuantity > result.capacity
    ) {
      status.textContent =
        `⚠️ ከፍተኛው የሚመረተው ${result.capacity} ነው። የተጠየቀው ${requestedQuantity} ነው።`;
      return;
    }

    status.textContent =
      `✅ ማምረት ይቻላል። ከፍተኛ አቅም: ${result.capacity}`;
  }

  const productionForm = document.getElementById("productionForm");

  productionForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const produceBtn = document.getElementById("produceBtn");

    const sourceType =
      sourceTypeSelect?.value || "customer_order";
    const orderId = orderSelect?.value || "";
    const productId = productSelect?.value || "";
    const recipeId = recipeSelect?.value || "";
    const quantity = Number(
      document.getElementById("productionQuantity")?.value || 0
    );
    const productionDate =
      document.getElementById("productionDate")?.value || "";

    if (
      sourceType === "customer_order" &&
      !orderId
    ) {
      alert("❌ Customer Order ይምረጡ።");
      return;
    }

    if (!productId) {
      alert("❌ የምርት ዕቃ ይምረጡ።");
      return;
    }

    if (!recipeId) {
      alert("❌ Recipe / BOM ይምረጡ።");
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      alert("❌ የሚመረተው ብዛት ከ1 ጀምሮ ሙሉ ቁጥር መሆን አለበት።");
      return;
    }

    const recipe = getSelectedRecipe();

    if (!recipe) {
      alert("❌ የተመረጠው Recipe አልተገኘም።");
      return;
    }

    const capacity = calculateProductionCapacity(recipe);

    if (quantity > capacity.capacity) {
      alert(
        `❌ Stock በቂ አይደለም።\n\nከፍተኛ የሚመረተው: ${capacity.capacity}`
      );
      return;
    }

    const requestId =
      `production-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    try {
      if (produceBtn) {
        produceBtn.disabled = true;
        produceBtn.textContent = "⏳ በማምረት ላይ...";
      }

      const response = await fetch("/api/productions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sourceType,
          ...(sourceType === "customer_order"
            ? { orderId }
            : {}),
          productId,
          recipeId,
          quantity,
          productionDate,
          requestId
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Production ማስመዝገብ አልተሳካም።"
        );
      }

      alert(
        data.duplicate
          ? "ℹ️ ይህ Production ቀድሞ ተመዝግቧል።"
          : "✅ Production በትክክል ተመዝግቧል።"
      );

      productionForm.reset();

      const summary = document.getElementById("productionOrderSummary");
      if (summary) summary.hidden = true;

      await loadProductionData();

      updateProductionDashboardAndHistory();

      updateProductionAvailability();
    } catch (error) {
      console.error("❌ Production submit error:", error);
      alert(
        `❌ Production አልተሳካም።\n\n${
          error.message || error
        }`
      );
    } finally {
      if (produceBtn) {
        produceBtn.disabled = false;
        produceBtn.textContent = "🏭 ምርት አምርት";
      }
    }
  });

  function updateProductionEthiopianDate() {
    const dateInput = document.getElementById("productionDate");
    const display = document.getElementById("ethiopianProductionDate");

    if (!dateInput || !display) return;

    const raw = String(dateInput.value || "").trim();

    if (!raw) {
      display.textContent = "የኢትዮጵያ ቀን፦ —";
      return;
    }

    const date = new Date(raw + "T00:00:00");

    if (Number.isNaN(date.getTime())) {
      display.textContent = "የኢትዮጵያ ቀን፦ —";
      return;
    }

    if (
      typeof gregorianToEthiopian !== "function" ||
      typeof formatEthiopianDate !== "function"
    ) {
      display.textContent = "የኢትዮጵያ ቀን፦ —";
      return;
    }

    const ethiopian = gregorianToEthiopian(date);

    display.textContent =
      "የኢትዮጵያ ቀን፦ " +
      formatEthiopianDate(
        ethiopian.year,
        ethiopian.month,
        ethiopian.day
      );
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      await loadProductionData();

      const productionDateInput =
        document.getElementById("productionDate");

      if (productionDateInput) {
        productionDateInput.addEventListener(
          "input",
          updateProductionEthiopianDate
        );

        productionDateInput.addEventListener(
          "change",
          updateProductionEthiopianDate
        );

        updateProductionEthiopianDate();
      }

        const orderIdFromUrl = new URLSearchParams(window.location.search).get("orderId");
        if (orderIdFromUrl && orderSelect) {
          orderSelect.value = orderIdFromUrl;
          updateSelectedOrder();
        }
      console.log("✅ Production base data loaded");
    } catch (error) {
      console.error(
        "❌ Production data load error:",
        error
      );

      alert(
        `❌ Production መረጃ መጫን አልተሳካም።\n\n${
          error.message || error
        }`
      );
    }
  });

  window.YamProduction = {
    loadProductionData,
    voidProduction,
    getProducts: () => products,
    getRecipes: () => recipes,
    getMaterials: () => materials
  };

  window.voidProduction = voidProduction;
})();
