import { Router } from "express";

import {
  getPaymentConfig,
  savePaymentConfig,
} from "../controllers/paymentConfig.controller";

import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

/* =====================================================
   PAYMENT CONFIGURATION PAR PRODUIT
===================================================== */

/**
 * GET
 * Récupérer la configuration de paiement d'un produit
 *
 * Exemple :
 * GET /api/payment-config/product/3
 *
 * L'utilisateur est identifié grâce au token JWT.
 */
router.get(
  "/product/:productId",
  authenticateToken,
  getPaymentConfig
);

/**
 * PUT
 * Créer ou modifier la configuration de paiement
 * d'un produit.
 *
 * Exemple :
 * PUT /api/payment-config/product/3
 *
 * L'utilisateur est identifié grâce au token JWT.
 */
router.put(
  "/product/:productId",
  authenticateToken,
  savePaymentConfig
);

export default router;