import { Router } from "express";

import {
  getMyPaymentPages,
  getPaymentPageById,
  createPaymentPage,
  activatePaymentPage,
  deactivatePaymentPage,
  deletePaymentPage,
} from "../controllers/paymentPage.controller";

import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

// =====================================================
// PAGES DU MARCHAND CONNECTÉ
// =====================================================

// GET /api/payment-pages
router.get(
  "/",
  authenticateToken,
  getMyPaymentPages
);

// POST /api/payment-pages
router.post(
  "/",
  authenticateToken,
  createPaymentPage
);

// GET /api/payment-pages/:id
router.get(
  "/:id",
  authenticateToken,
  getPaymentPageById
);

// PATCH /api/payment-pages/:id/activate
router.patch(
  "/:id/activate",
  authenticateToken,
  activatePaymentPage
);

// PATCH /api/payment-pages/:id/deactivate
router.patch(
  "/:id/deactivate",
  authenticateToken,
  deactivatePaymentPage
);

// DELETE /api/payment-pages/:id
router.delete(
  "/:id",
  authenticateToken,
  deletePaymentPage
);

export default router;