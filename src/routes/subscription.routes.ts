
import { Router } from "express";

import {
    getPlans,
    createSubscription,
    getMySubscription,
    initiateSubscriptionPayment,
    cancelSubscription,
} from "../controllers/subscription.controller";

import {
    authenticateToken,
} from "../middlewares/auth.middleware";


const router = Router();


// =====================================================
// GET AVAILABLE PLANS
// =====================================================
//
// GET /api/subscriptions/plans
//
// Route PUBLIQUE.
//
// Permet au frontend de récupérer les plans disponibles
// sans avoir besoin d'un token JWT.
//
// Retourne par exemple :
// Starter
// Business
// Premium
//
// =====================================================

router.get(
    "/plans",
    getPlans
);


// =====================================================
// CREATE SUBSCRIPTION
// =====================================================
//
// POST /api/subscriptions
//
// Route protégée.
//
// L'utilisateur doit être authentifié pour créer
// une demande d'abonnement.
//
// =====================================================

router.post(
    "/",
    authenticateToken,
    createSubscription
);


// =====================================================
// GET MY SUBSCRIPTION
// =====================================================
//
// GET /api/subscriptions/my
//
// Route protégée.
//
// Retourne l'abonnement de l'utilisateur connecté.
//
// =====================================================

router.get(
    "/my",
    authenticateToken,
    getMySubscription
);


// =====================================================
// SUBSCRIPTION PAYMENT
// =====================================================
//
// POST /api/subscriptions/payment
//
// Route protégée.
//
// Le frontend envoie notamment :
//
// {
//   planId,
//   clientPhone,
//   amount,
//   currency,
//   telecom
// }
//
// Le controller appelle ensuite SerdiPay.
//
// =====================================================

router.post(
    "/payment",
    authenticateToken,
    initiateSubscriptionPayment
);


// =====================================================
// CANCEL SUBSCRIPTION
// =====================================================
//
// PATCH /api/subscriptions/cancel
//
// Route protégée.
//
// Annule l'abonnement actif de l'utilisateur connecté.
//
// =====================================================

router.patch(
    "/cancel",
    authenticateToken,
    cancelSubscription
);


// =====================================================
// EXPORT
// =====================================================

export default router;
