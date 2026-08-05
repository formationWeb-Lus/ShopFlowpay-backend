
import { Router } from "express";

import {
  getPublicPaymentPages,
  getPublicPaymentPage,
} from "../controllers/publicPayment.controller";

const router = Router();

/**
 * =====================================================
 * PUBLIC PAYMENT PAGES
 * =====================================================
 *
 * GET /api/public/payment-pages
 *
 * Retourne les pages publiques disponibles.
 *
 */
router.get(
  "/payment-pages",
  getPublicPaymentPages
);

/**
 * =====================================================
 * PUBLIC PAYMENT PAGE BY SLUG
 * =====================================================
 *
 * GET /api/public/payment-pages/:slug
 *
 * Exemple :
 *
 * /api/public/payment-pages/coderiseolution
 *
 */
router.get(
  "/payment-pages/:slug",
  getPublicPaymentPage
);

export default router;

