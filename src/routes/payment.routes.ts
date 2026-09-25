<<<<<<< HEAD

=======
>>>>>>> 4e6d128294c58300ce75b35e1918f176b5d1b31a
import { Router } from "express";

import {
  initiatePayment,
  checkPaymentStatus,
  getMyTransactions,
} from "../controllers/payment.controller";

<<<<<<< HEAD
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

=======
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
>>>>>>> 4e6d128294c58300ce75b35e1918f176b5d1b31a
console.log("CONTROLLERS :", {
  initiatePayment,
  checkPaymentStatus,
  getMyTransactions,
});

console.log("AUTH :", authenticateToken);

<<<<<<< HEAD
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
// CALLBACK SERDIPAY
// =====================================================
//
// POST /api/payment/callback
//
// Cette route reçoit les callbacks transmis par
// le callback centralisateur.
//
// =====================================================

router.post(
  "/callback",
  paymentCallback
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
=======



export default router;
>>>>>>> 4e6d128294c58300ce75b35e1918f176b5d1b31a
