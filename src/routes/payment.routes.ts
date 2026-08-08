
import { Router } from "express";

import {
  initiatePayment,
  checkPaymentStatus,
  getMyTransactions,
} from "../controllers/payment.controller";

import {
  authenticateToken,
} from "../middlewares/auth.middleware";

// =====================================================
// ROUTER
// =====================================================

const router = Router();

// =====================================================
// LOGS DE VÉRIFICATION
// =====================================================

console.log("==============================================");
console.log("PAYMENT ROUTES");
console.log("==============================================");

console.log("CONTROLLERS :", {
  initiatePayment,
  checkPaymentStatus,
  getMyTransactions,
});

console.log("AUTH :", authenticateToken);

// =====================================================
// INITIALISER UN PAIEMENT
// =====================================================
//
// POST /api/payment/initiate
//
// Cette route est publique.
//
// Exemple :
//
// POST /api/payment/initiate
//
// Body :
// {
//   "userId": 1,
//   "amount": 5,
//   "phone": "243xxxxxxxxx",
//   "telecom": "MP",
//   "currency": "USD"
// }
//
// =====================================================

router.post(
  "/initiate",
  initiatePayment
);

// =====================================================
// VÉRIFIER LE STATUT D'UN PAIEMENT
// =====================================================
//
// GET /api/payment/status/:transactionId
//
// Cette route permet de vérifier le statut
// d'une transaction auprès de SerdiPay.
//
// Exemple :
//
// GET /api/payment/status/TRX123456
//
// =====================================================

router.get(
  "/status/:transactionId",
  checkPaymentStatus
);

// =====================================================
// HISTORIQUE DES TRANSACTIONS
// =====================================================
//
// GET /api/payment/transactions
//
// Cette route est protégée.
//
// Seul l'utilisateur connecté peut récupérer
// ses propres transactions.
//
// =====================================================

router.get(
  "/transactions",
  authenticateToken,
  getMyTransactions
);

// =====================================================
// EXPORT
// =====================================================

export default router;
