
import { Router } from "express";

import {
  getPublicPaymentPages,
  getPublicPaymentPage,
  createPublicPayment,
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

router.post("/payments", createPublicPayment);


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

