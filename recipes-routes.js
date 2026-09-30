const express = require("express");
const crypto = require("crypto");
const router = express.Router();

const { db } = require("./firebase");
const {
  normalizeUnit,
  getUnitFamily,
  isCompatible,
  convert
} = require("./units-converter-engine");

const {
  calculateArea
} = require("./area-costing-engine");

function clean(value) {
  return typeof value === "string" ? value.trim() : value;
}

function positiveNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function makePayloadHash(payload) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}

function normalizeMaterials(materials) {
  if (!Array.isArray(materials) || materials.length === 0) {
    throw new Error("materials must be a non-empty array");
  }

  const seen = new Set();

  return materials.map((item) => {
    const materialId = clean(item?.materialId);
    const materialName = clean(item?.materialName);
    const unit = clean(item?.unit);
    const length = positiveNumber(item?.length);
    const width = positiveNumber(item?.width);
    const dimensionUnit = clean(item?.dimensionUnit);
    const areaUnit = clean(item?.areaUnit);

    const normalizedUnit = normalizeUnit(unit);
    const isAreaMaterial = getUnitFamily(normalizedUnit) === "area";
    let quantityPerUnit = isAreaMaterial
      ? 0
      : positiveNumber(item?.quantityPerUnit);

    if (isAreaMaterial) {
      if (!length || !width || !dimensionUnit) {
        throw new Error(
          `Area dimensions are required for material: ${materialId}`
        );
      }

      if (!areaUnit) {
        throw new Error(
          `areaUnit is required for area material: ${materialId}`
        );
      }

      if (normalizeUnit(areaUnit) !== normalizedUnit) {
        throw new Error(
          `areaUnit must match material unit for material: ${materialId}`
        );
      }

      const areaResult = calculateArea({
        length,
        width,
        dimensionUnit
      });

      const calculatedArea = convert(
        areaResult.areaMm2,
        "mm2",
        normalizedUnit
      );

      if (!Number.isFinite(calculatedArea) || calculatedArea <= 0) {
        throw new Error(
          `Invalid calculated area for material: ${materialId}`
        );
      }

      quantityPerUnit = calculatedArea;
    }

    if (!materialId) throw new Error("materialId is required");
    if (seen.has(materialId)) {
      throw new Error(`Duplicate materialId: ${materialId}`);
    }
    seen.add(materialId);

    if (!quantityPerUnit) {
      throw new Error(`Invalid quantityPerUnit for material: ${materialId}`);
    }

    if (!unit) throw new Error(`unit is required for material: ${materialId}`);

    return {
      materialId,
      materialName: materialName || "",
      quantityPerUnit,
      unit,
      ...(length ? { length } : {}),
      ...(width ? { width } : {}),
      ...(dimensionUnit ? { dimensionUnit } : {}),
      ...(areaUnit ? { areaUnit: normalizeUnit(areaUnit) } : {})
    };
  });
}

// GET all recipes
router.get("/recipes", async (req, res) => {
  try {
    const snap = await db.collection("recipes")
      .orderBy("createdAt", "desc")
      .get();

    const recipes = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ success: true, recipes });
  } catch (error) {
    console.error("GET /recipes error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load recipes",
      error: error.message
    });
  }
});

// GET one recipe
router.get("/recipes/:id", async (req, res) => {
  try {
    const id = clean(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Recipe ID is required"
      });
    }

    const snap = await db.collection("recipes").doc(id).get();

    if (!snap.exists) {
      return res.status(404).json({
        success: false,
        message: "Recipe not found"
      });
    }

    res.json({
      success: true,
      recipe: {
        id: snap.id,
        ...snap.data()
      }
    });
  } catch (error) {
    console.error("GET /recipes/:id error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load recipe",
      error: error.message
    });
  }
});

// CREATE recipe
router.post("/recipes", async (req, res) => {
  try {
    const productId = clean(req.body?.productId);
    const productName = clean(req.body?.productName);
    const requestId = clean(req.body?.requestId);
    const materials = normalizeMaterials(req.body?.materials);

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "productId is required"
      });
    }

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "requestId is required"
      });
    }

    const payload = {
      productId,
      productName: productName || "",
      materials
    };

    const payloadHash = makePayloadHash(payload);
    const recipeRef = db.collection("recipes").doc();
    const idempotencyRef = db.collection("recipeIdempotency").doc(requestId);

    const result = await db.runTransaction(async (transaction) => {
      const existingRequest = await transaction.get(idempotencyRef);

      if (existingRequest.exists) {
        const saved = existingRequest.data();

        if (saved.payloadHash !== payloadHash) {
          const conflict = new Error("requestId already used with different payload");
          conflict.statusCode = 409;
          throw conflict;
        }

        return {
          duplicate: true,
          recipeId: saved.recipeId
        };
      }

      const productRef = db.collection("selfProducts").doc(productId);
      const productSnap = await transaction.get(productRef);

      if (!productSnap.exists) {
        const error = new Error("Self Product not found");
        error.statusCode = 404;
        throw error;
      }

      for (const material of materials) {
        const materialRef = db.collection("rawMaterials").doc(material.materialId);
        const materialSnap = await transaction.get(materialRef);

        if (!materialSnap.exists) {
            const error = new Error(`Raw Material not found: ${material.materialId}`);
            error.statusCode = 404;
            throw error;
        }

        const materialData = materialSnap.data();
        const recipeUnit = normalizeUnit(material.unit);
        const stockUnit = normalizeUnit(materialData.unit);

        const recipeFamily = getUnitFamily(recipeUnit);
        const stockFamily = getUnitFamily(stockUnit);

        if (!recipeFamily) {
            const error = new Error(
                `Unsupported recipe unit: ${material.unit}`
            );
            error.statusCode = 400;
            throw error;
        }

        if (!stockFamily) {
            const error = new Error(
                `Unsupported raw material unit: ${materialData.unit || ""}`
            );
            error.statusCode = 400;
            throw error;
        }

        if (!isCompatible(recipeUnit, stockUnit)) {
            const error = new Error(
                `Incompatible units for material ${material.materialId}: ` +
                `${material.unit} → ${materialData.unit || ""}`
            );
            error.statusCode = 400;
            throw error;
        }
      }

    const recipesQuery = db.collection("recipes")
        .where("productId", "==", productId)
        .where("active", "==", true)
        .limit(1);

      const activeRecipesSnap = await transaction.get(recipesQuery);

      if (!activeRecipesSnap.empty) {
        const error = new Error("An active recipe already exists for this product");
        error.statusCode = 409;
        throw error;
      }

      const now = new Date().toISOString();

      transaction.set(recipeRef, {
        recipeId: recipeRef.id,
        productId,
        productName: productName || productSnap.data().productName || "",
        materials,
        recipeVersion: 1,
        active: true,
        createdAt: now,
        updatedAt: now
      });

      transaction.set(idempotencyRef, {
        requestId,
        payloadHash,
        recipeId: recipeRef.id,
        createdAt: now
      });

      return {
        duplicate: false,
        recipeId: recipeRef.id
      };
    });

    const status = result.duplicate ? 200 : 201;

    res.status(status).json({
      success: true,
      message: result.duplicate
        ? "Recipe request already processed"
        : "Recipe created successfully",
      recipeId: result.recipeId,
      duplicate: result.duplicate
    });
  } catch (error) {
    console.error("POST /recipes error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create recipe",
      error: error.message
    });
  }
});

// UPDATE recipe — creates a new version and deactivates the old one
router.patch("/recipes/:id", async (req, res) => {
    try {
        const id = clean(req.params.id);
        const requestId = clean(req.body?.requestId);
        const productName = clean(req.body?.productName);
        const materials = normalizeMaterials(req.body?.materials);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Recipe ID is required"
            });
        }

        if (!requestId) {
            return res.status(400).json({
                success: false,
                message: "requestId is required"
            });
        }

        const payload = {
            recipeId: id,
            productName: productName || "",
            materials
        };

        const payloadHash = makePayloadHash(payload);
        const idempotencyRef = db.collection("recipeIdempotency").doc(requestId);
        const newRecipeRef = db.collection("recipes").doc();
        const historyRef = db.collection("recipeHistory").doc();
        const counterRef = db.collection("counters").doc("recipeHistory");

        const result = await db.runTransaction(async (transaction) => {
            const existingRequest = await transaction.get(idempotencyRef);

            if (existingRequest.exists) {
                const saved = existingRequest.data();

                if (saved.payloadHash !== payloadHash) {
                    const conflict = new Error(
                        "requestId already used with different payload"
                    );
                    conflict.statusCode = 409;
                    throw conflict;
                }

                return {
                    duplicate: true,
                    recipeId: saved.recipeId
                };
            }

            const oldRef = db.collection("recipes").doc(id);
            const oldSnap = await transaction.get(oldRef);

            if (!oldSnap.exists) {
                const error = new Error("Recipe not found");
                error.statusCode = 404;
                throw error;
            }

            const oldData = oldSnap.data();

            if (oldData.active !== true) {
                const error = new Error("Only an active recipe can be updated");
                error.statusCode = 409;
                throw error;
            }

            for (const material of materials) {
                const materialRef = db.collection("rawMaterials").doc(material.materialId);
                const materialSnap = await transaction.get(materialRef);

                if (!materialSnap.exists) {
                    const error = new Error(`Raw Material not found: ${material.materialId}`);
                    error.statusCode = 404;
                    throw error;
                }

                const materialData = materialSnap.data();
                const recipeUnit = normalizeUnit(material.unit);
                const stockUnit = normalizeUnit(materialData.unit);

                const recipeFamily = getUnitFamily(recipeUnit);
                const stockFamily = getUnitFamily(stockUnit);

                if (!recipeFamily) {
                    const error = new Error(
                        `Unsupported recipe unit: ${material.unit}`
                    );
                    error.statusCode = 400;
                    throw error;
                }

                if (!stockFamily) {
                    const error = new Error(
                        `Unsupported raw material unit: ${materialData.unit || ""}`
                    );
                    error.statusCode = 400;
                    throw error;
                }

                if (!isCompatible(recipeUnit, stockUnit)) {
                    const error = new Error(
                        `Incompatible units for material ${material.materialId}: ` +
                        `${material.unit} → ${materialData.unit || ""}`
                    );
                    error.statusCode = 400;
                    throw error;
                }
            }

            const nextVersion =
                Number(oldData.recipeVersion || 1) + 1;

            const counterSnap = await transaction.get(counterRef);

            const currentSerial = counterSnap.exists
                ? Number(counterSnap.data().nextSerial || 1)
                : 1;

            const serialNumber =
                String(currentSerial).padStart(6, "0");

            const now = new Date().toISOString();

            const historyData = {
                historyId: historyRef.id,
                serialNumber,
                recipeId: oldRef.id,
                productId: oldData.productId || "",
                productName: oldData.productName || "",
                recipeVersion: Number(oldData.recipeVersion || 1),
                materials: oldData.materials || [],
                previousRecipeId: oldData.previousRecipeId || null,
                originalCreatedAt: oldData.createdAt || null,
                storedAt: now
            };

            transaction.set(historyRef, historyData);

            transaction.set(
                counterRef,
                {
                    nextSerial: currentSerial + 1,
                    updatedAt: now
                },
                { merge: true }
            );

            transaction.update(oldRef, {
                active: false,
                updatedAt: now
            });

            transaction.set(newRecipeRef, {
                recipeId: newRecipeRef.id,
                productId: oldData.productId,
                productName: productName || oldData.productName || "",
                materials,
                recipeVersion: nextVersion,
                active: true,
                createdAt: now,
                updatedAt: now,
                previousRecipeId: oldRef.id
            });

            transaction.set(idempotencyRef, {
                requestId,
                payloadHash,
                recipeId: newRecipeRef.id,
                historyId: historyRef.id,
                createdAt: now
            });

            return {
                duplicate: false,
                recipeId: newRecipeRef.id,
                recipeVersion: nextVersion,
                historyId: historyRef.id,
                serialNumber
            };
        });

        res.status(result.duplicate ? 200 : 201).json({
            success: true,
            message: result.duplicate
                ? "Recipe update request already processed"
                : "Recipe version created and previous version stored in History Store",
            recipeId: result.recipeId,
            recipeVersion: result.recipeVersion || null,
            historyId: result.historyId || null,
            serialNumber: result.serialNumber || null,
            duplicate: result.duplicate
        });

    } catch (error) {
        console.error("PATCH /recipes/:id error:", error);

        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to update recipe",
            error: error.message
        });
    }
});

// DELETE recipe — soft delete/deactivate only
router.delete("/recipes/:id", async (req, res) => {
    try {
        const id = clean(req.params.id);
        const requestId = clean(req.body?.requestId);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Recipe ID is required"
            });
        }

        if (!requestId) {
            return res.status(400).json({
                success: false,
                message: "requestId is required"
            });
        }

        const oldRef = db.collection("recipes").doc(id);
        const historyRef = db.collection("recipeHistory").doc();
        const counterRef = db.collection("counters").doc("recipeHistory");
        const idempotencyRef = db.collection("recipeIdempotency").doc(requestId);

        const result = await db.runTransaction(async (transaction) => {
            const existingRequest = await transaction.get(idempotencyRef);

            if (existingRequest.exists) {
                const saved = existingRequest.data();
                return {
                    duplicate: true,
                    recipeId: saved.recipeId,
                    historyId: saved.historyId,
                    serialNumber: saved.serialNumber
                };
            }

            const oldSnap = await transaction.get(oldRef);

            if (!oldSnap.exists) {
                const error = new Error("Recipe not found");
                error.statusCode = 404;
                throw error;
            }

            const oldData = oldSnap.data();

            if (oldData.active !== true) {
                const error = new Error("Recipe is already inactive");
                error.statusCode = 409;
                throw error;
            }

            const counterSnap = await transaction.get(counterRef);
            const currentSerial = counterSnap.exists
                ? Number(counterSnap.data().nextSerial || 1)
                : 1;

            const serialNumber = String(currentSerial).padStart(6, "0");
            const now = new Date().toISOString();

            const historyData = {
                historyId: historyRef.id,
                serialNumber,
                recipeId: oldRef.id,
                productId: oldData.productId || "",
                productName: oldData.productName || "",
                recipeVersion: Number(oldData.recipeVersion || 1),
                materials: oldData.materials || [],
                previousRecipeId: oldData.previousRecipeId || null,
                originalCreatedAt: oldData.createdAt || null,
                storedAt: now
            };

            transaction.set(historyRef, historyData);

            transaction.set(
                counterRef,
                {
                    nextSerial: currentSerial + 1,
                    updatedAt: now
                },
                { merge: true }
            );

            transaction.update(oldRef, {
                active: false,
                updatedAt: now
            });

            transaction.set(idempotencyRef, {
                requestId,
                recipeId: oldRef.id,
                historyId: historyRef.id,
                serialNumber,
                createdAt: now
            });

            return {
                duplicate: false,
                recipeId: oldRef.id,
                historyId: historyRef.id,
                serialNumber
            };
        });

        res.json({
            success: true,
            message: result.duplicate
                ? "Recipe deactivation request already processed"
                : "Recipe deactivated and archived to History Store",
            ...result
        });
    } catch (error) {
        console.error("DELETE /recipes/:id error:", error);

        res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode
                ? error.message
                : "Failed to deactivate recipe",
            error: error.message
        });
    }
});

// ==================== RECIPE HISTORY STORE ====================

// GET all Recipe History Store entries
router.get("/recipe-history", async (req, res) => {
    try {
        const snap = await db
            .collection("recipeHistory")
            .orderBy("storedAt", "desc")
            .get();

        const history = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({
            success: true,
            history
        });
    } catch (error) {
        console.error("GET /recipe-history error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load Recipe History Store",
            error: error.message
        });
    }
});

// GET one Recipe History Store entry
router.get("/recipe-history/:id", async (req, res) => {
    try {
        const id = clean(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "History ID is required"
            });
        }

        const ref = db.collection("recipeHistory").doc(id);
        const snap = await ref.get();

        if (!snap.exists) {
            return res.status(404).json({
                success: false,
                message: "Recipe History entry not found"
            });
        }

        res.json({
            success: true,
            history: {
                id: snap.id,
                ...snap.data()
            }
        });
    } catch (error) {
        console.error("GET /recipe-history/:id error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load Recipe History entry",
            error: error.message
        });
    }
});

module.exports = router;
