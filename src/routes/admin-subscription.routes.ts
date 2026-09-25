import { Router } from "express";
import { getActiveSubscribers } from "../controllers/admin-subscription.controller";


const router = Router();

// =====================================================
// GET ACTIVE SUBSCRIBERS FOR ADMIN
// GET /api/admin/subscriptions/active
// =====================================================
router.get(
  "/active",
  // authenticateToken, // Décommentez pour réactiver la sécurité JWT
  getActiveSubscribers
);

export default router;