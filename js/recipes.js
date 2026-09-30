(() => {
    "use strict";

    const API = "/api/recipes";
    const PRODUCTS_API = "/api/self-products";
    const MATERIALS_API = "/api/raw-materials";

    const productSelect = document.getElementById("productId");
    const materialsContainer = document.getElementById("materialsContainer");
    const recipeForm = document.getElementById("recipeForm");
    const recipesList = document.getElementById("recipesList");
    const addMaterialBtn = document.getElementById("addMaterialBtn");

    let products = [];
    let materials = [];
    let recipes = [];
    let editingRecipeId = null;

    function esc(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    async function loadData() {
        const [productsResponse, materialsResponse, recipesResponse] =
            await Promise.all([
                fetch(PRODUCTS_API),
                fetch(MATERIALS_API),
                fetch(API)
            ]);

        const productsData = await productsResponse.json();
        const materialsData = await materialsResponse.json();
        const recipesData = await recipesResponse.json();

        products = productsData.products || [];
        materials = materialsData.materials || [];
        recipes = recipesData.recipes || [];

        renderProducts();
        renderRecipes(recipes);

        if (materialsContainer.children.length === 0) {
            addMaterialRow();
        }
    }

    function renderProducts() {
        productSelect.innerHTML =
            '<option value="">-- ምርት ይምረጡ --</option>' +
            products.map(product =>
                `<option value="${esc(product.id)}">${esc(product.productName)}</option>`
            ).join("");
    }

    function addMaterialRow(existingMaterial = null) {
        const row = document.createElement("div");
        row.className = "recipe-material-row";

        row.innerHTML = `
            <select class="material-id" required>
                <option value="">-- ጥሬ እቃ ይምረጡ --</option>
                ${materials.map(material =>
                    `<option value="${esc(material.id)}">${esc(material.materialName)} (${esc(material.unit || "ቁጥር")})</option>`
                ).join("")}
            </select>

            <input
                class="material-quantity"
                type="number"
                min="0.000001"
                step="any"
                placeholder="መጠን"
                required
            >

            <input
                class="material-unit"
                type="text"
                placeholder="መለኪያ"
                readonly
            >

            <div class="material-area-fields" style="display:none;">
                <input
                    class="material-length"
                    type="number"
                    min="0.000001"
                    step="any"
                    placeholder="ርዝመት"
                >

                <input
                    class="material-width"
                    type="number"
                    min="0.000001"
                    step="any"
                    placeholder="ስፋት"
                >

                <select class="material-dimension-unit">
                    <option value="mm">mm</option>
                    <option value="cm" selected>cm</option>
                    <option value="m">m</option>
                </select>

                <select class="material-area-unit">
                    <option value="mm2">mm²</option>
                    <option value="cm2">cm²</option>
                    <option value="m2" selected>m²</option>
                </select>
            </div>

            <button type="button" class="remove-material">
                🗑️
            </button>
        `;

        const materialSelect = row.querySelector(".material-id");
        const unitInput = row.querySelector(".material-unit");
        const areaFields = row.querySelector(".material-area-fields");

        function updateAreaFields() {
            const normalizedUnit = String(unitInput.value || "").trim().toLowerCase();
            const isArea = ["mm2", "cm2", "m2", "mm²", "cm²", "m²"].includes(normalizedUnit);
            areaFields.style.display = isArea ? "grid" : "none";
        }

        materialSelect.addEventListener("change", () => {
            const selected = materials.find(
                item => item.id === materialSelect.value
            );
            unitInput.value = selected?.unit || "";
            updateAreaFields();
        });

        if (existingMaterial) {
            materialSelect.value = existingMaterial.materialId || "";
            row.querySelector(".material-quantity").value =
                existingMaterial.quantityPerUnit ?? "";
            unitInput.value = existingMaterial.unit || "";

            row.querySelector(".material-length").value =
                existingMaterial.length ?? "";
            row.querySelector(".material-width").value =
                existingMaterial.width ?? "";
            row.querySelector(".material-dimension-unit").value =
                existingMaterial.dimensionUnit || "cm";
            row.querySelector(".material-area-unit").value =
                existingMaterial.areaUnit || "m2";

            updateAreaFields();
        }

        row.querySelector(".remove-material").addEventListener("click", () => {
            if (materialsContainer.children.length > 1) {
                row.remove();
            }
        });

        materialsContainer.appendChild(row);
    }

    function collectMaterials() {
        return [...materialsContainer.querySelectorAll(".recipe-material-row")]
            .map(row => {
                const materialId = row.querySelector(".material-id").value;
                const unit = row.querySelector(".material-unit").value;
                const normalizedUnit = String(unit || "").trim().toLowerCase();
                const isArea = ["mm2", "cm2", "m2", "mm²", "cm²", "m²"].includes(normalizedUnit);

                const material = {
                    materialId,
                    materialName:
                        materials.find(item => item.id === materialId)?.materialName || "",
                    quantityPerUnit: Number(
                        row.querySelector(".material-quantity").value
                    ),
                    unit
                };

                if (isArea) {
                    material.length = Number(
                        row.querySelector(".material-length").value
                    );
                    material.width = Number(
                        row.querySelector(".material-width").value
                    );
                    material.dimensionUnit =
                        row.querySelector(".material-dimension-unit").value;
                    material.areaUnit =
                        row.querySelector(".material-area-unit").value;
                }

                return material;
            });
    }

    function formatEthiopianDate(value) {
        if (!value) return "-";

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "-";

        const formatter = new Intl.DateTimeFormat(
            "am-ET-u-ca-ethiopic",
            {
                year: "numeric",
                month: "long",
                day: "numeric"
            }
        );

        return formatter.format(date);
    }

    function renderRecipes(recipes) {
        recipes = recipes.filter(recipe => recipe.active === true);
        if (!recipes.length) {
            recipesList.innerHTML = "<p>📭 Recipe አልተመዘገበም።</p>";
            return;
        }

        recipesList.innerHTML = recipes.map(recipe => `
            <article class="recipe-card">
                <h3>🎁 ${esc(recipe.productName || "-")}</h3>
                <p>📌 Version: ${esc(recipe.recipeVersion || 1)}</p>
                <p>📅 ${esc(formatEthiopianDate(recipe.createdAt))}</p>
                <p>📍 ${recipe.active ? "🟢 ንቁ" : "⚪ የቦዘነ"}</p>

                <ul>
                    ${(recipe.materials || []).map(material => `
                        <li>
                            ${esc(material.materialName || "-")}
                            — ${esc(material.quantityPerUnit)}
                            ${esc(material.unit || "")}
                        </li>
                    `).join("")}
                </ul>

                <div class="recipe-actions">
                    ${recipe.active ? `
                        <button type="button" class="edit-recipe" data-id="${esc(recipe.id)}">
                            ✏️ Version አዘምን
                        </button>

                        <button type="button" class="deactivate-recipe" data-id="${esc(recipe.id)}">
                            🛑 አቦዝን
                        </button>
                    ` : `
                        <span>⚪ ይህ Recipe ቦዝኗል</span>
                    `}
                </div>
            </article>
        `).join("");

        recipesList.querySelectorAll(".edit-recipe").forEach(button => {
            button.addEventListener("click", () => {
                const recipe = recipes.find(
                    item => item.id === button.dataset.id
                );

                if (!recipe) return;

                editingRecipeId = recipe.id;
                productSelect.value = recipe.productId;
                materialsContainer.innerHTML = "";

                (recipe.materials || []).forEach(material => {
                    addMaterialRow(material);
                });

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });
            });
        });

        recipesList.querySelectorAll(".deactivate-recipe").forEach(button => {
            button.addEventListener("click", async () => {
                if (!confirm("ይህን Recipe ማቦዘን ይፈልጋሉ?")) return;

                try {
                    const requestId = `deactivate-${button.dataset.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

                    const response = await fetch(
                        `${API}/${encodeURIComponent(button.dataset.id)}`,
                        {
                            method: "DELETE",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({ requestId })
                        }
                    );

                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(
                            data.error ||
                            data.message ||
                            "Recipe ማቦዘን አልተሳካም።"
                        );
                    }

                    alert("✅ Recipe ተቦዝኗል።");
                    await loadData();

                } catch (error) {
                    console.error(
                        "Recipe deactivate error:",
                        error
                    );

                    alert(
                        `❌ ${error.message || "Recipe ማቦዘን አልተሳካም።"}`
                    );
                }
            });
        });
    }

    recipeForm.addEventListener("submit", async event => {
        event.preventDefault();

        try {
            const productId = productSelect.value;
        const selectedProduct = products.find(
            product => product.id === productId
        );
        const recipeMaterials = collectMaterials();

        if (!productId || !selectedProduct) {
            alert("እባክዎ ምርት ይምረጡ።");
            return;
        }

        if (!recipeMaterials.length ||
            recipeMaterials.some(item => {
                if (!item.materialId || !item.unit) {
                    return true;
                }

                const normalizedUnit =
                    String(item.unit || "").trim().toLowerCase();

                const isArea = [
                    "mm2", "cm2", "m2", "mm²", "cm²", "m²"
                ].includes(normalizedUnit);

                if (isArea) {
                    return !(
                        Number(item.length) > 0 &&
                        Number(item.width) > 0 &&
                        item.dimensionUnit &&
                        item.areaUnit
                    );
                }

                return !(item.quantityPerUnit > 0);
            })) {
            alert("እባክዎ የጥሬ እቃ መረጃውን በትክክል ያስገቡ።");
            return;
        }

        const requestId =
            `recipe-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

        const isEditing = Boolean(editingRecipeId);
        const requestUrl = isEditing
            ? `${API}/${encodeURIComponent(editingRecipeId)}`
            : API;

        const requestBody = isEditing
            ? {
                productName: selectedProduct.productName || "",
                materials: recipeMaterials,
                requestId
            }
            : {
                productId,
                productName: selectedProduct.productName || "",
                materials: recipeMaterials,
                requestId
            };

        const response = await fetch(requestUrl, {
            method: isEditing ? "PATCH" : "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.message || "Recipe ማስቀመጥ አልተሳካም።");
        }

        alert(
            isEditing
                ? "✅ Recipe Version ተዘምኗል።"
                : "✅ Recipe ተቀምጧል።"
        );

        editingRecipeId = null;
        recipeForm.reset();
        materialsContainer.innerHTML = "";
        addMaterialRow();
        await loadData();
        } catch (error) {
            console.error("Recipe save error:", error);
            alert(`❌ ${error.message || "Recipe ማስቀመጥ አልተሳካም።"}`);
        }
    });

    addMaterialBtn.addEventListener("click", addMaterialRow);

    loadData().catch(error => {
        console.error(error);
        recipesList.innerHTML =
            `<p>❌ ${esc(error.message)}</p>`;
    });
})();
