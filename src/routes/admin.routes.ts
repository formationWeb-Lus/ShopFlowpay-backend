import { Router } from "express";

import { getActiveSubscriptions } from "../controllers/subscriptionController";

// Ajout de la route au routeur public existant
const router = Router();
router.get("/admin/subscriptions/active", getActiveSubscriptions);

export default router;