const express = require("express");
const { db } = require("./firebase");
const { calculatePlanningEvaluation } = require("./planning-evaluation-engine");

const router = express.Router();

function clean(value) {
    return String(value ?? "").trim();
}

function nowISO() {
    return new Date().toISOString();
}


router.get("/planning", async (req, res) => {
    try {
        const snap = await db
            .collection("planning")
            .orderBy("createdAt", "desc")
            .get();

        const plans = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({
            success: true,
            plans
        });
    } catch (error) {
        console.error("Planning LIST Error:", error);

        res.status(500).json({
            success: false,
            error: "Planning Plans ማንበብ አልተቻለም።"
        });
    }
});

router.get("/planning/:id/evaluation", async (req, res) => {
    try {
        const id = clean(req.params.id);

        if (!id) {
            return res.status(400).json({
                success: false,
                error: "Planning ID ያስፈልጋል።"
            });
        }

        const doc = await db.collection("planning").doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({
                success: false,
                error: "Planning Plan አልተገኘም።"
            });
        }

        const plan = {
            id: doc.id,
            ...doc.data()
        };

        const evaluation = await calculatePlanningEvaluation(db, plan);

        res.json({
            success: true,
            evaluation
        });
    } catch (error) {
        console.error("Planning EVALUATION Error:", error);

        res.status(500).json({
            success: false,
            error: "Planning Evaluation ማስላት አልተቻለም።"
        });
    }
});

router.post("/planning", async (req, res) => {
    try {
        const body = req.body || {};

        const title = clean(body.title);
        const metric = clean(body.metric);
        const unit = clean(body.unit);
        const periodType = clean(body.periodType);
        const startDate = clean(body.startDate);
        const endDate = clean(body.endDate);
        const notes = clean(body.notes);

        const target = Number(body.target);

        if (!title || !metric || !periodType || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                error: "የPlanning Target አስፈላጊ መረጃ ይጎድላል።"
            });
        }

        if (!Number.isFinite(target) || target < 0) {
            return res.status(400).json({
                success: false,
                error: "Target ትክክለኛ ቁጥር መሆን አለበት።"
            });
        }

        if (endDate < startDate) {
            return res.status(400).json({
                success: false,
                error: "End Date ከ Start Date በፊት መሆን አይችልም።"
            });
        }

        const now = nowISO();

        const plan = {
            title,
            metric,
            target,
            unit,
            periodType,
            startDate,
            endDate,
            notes,
            createdAt: now,
            updatedAt: now
        };

        const ref = await db.collection("planning").add(plan);

        res.status(201).json({
            success: true,
            plan: {
                id: ref.id,
                ...plan
            }
        });
    } catch (error) {
        console.error("Planning CREATE Error:", error);

        res.status(500).json({
            success: false,
            error: "Planning Target ማስቀመጥ አልተቻለም።"
        });
    }
});

module.exports = router;
