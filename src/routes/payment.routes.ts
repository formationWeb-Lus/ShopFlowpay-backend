import { Router } from "express";

import {
  initiatePayment,
  checkPaymentStatus,
  getMyTransactions,
} from "../controllers/payment.controller";

import authenticateToken from "../middlewares/auth.middleware";


const router = Router();




/**
 * =====================================================
 * INITIALISER UN PAIEMENT
 * =====================================================
 *
 * POST /api/payment/initiate
 *
 * Utilisé par SerdiPay
 */
router.post(
  "/initiate",
  initiatePayment
);




/**
 * =====================================================
 * VERIFIER LE STATUT D'UN PAIEMENT
 * =====================================================
 *
 * GET /api/payment/status/:transactionId
 *
 */
router.get(
  "/status/:transactionId",
  checkPaymentStatus
);




/**
 * =====================================================
 * HISTORIQUE DES TRANSACTIONS MARCHAND
 * =====================================================
 *
 * GET /api/payment/transactions
 *
 * Retourne les paiements du compte connecté
 *
 */
console.log("CONTROLLERS :", {
  initiatePayment,
  checkPaymentStatus,
  getMyTransactions,
});

console.log("AUTH :", authenticateToken);




export default router;