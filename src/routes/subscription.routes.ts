import { Router } from "express";

import {
    getPlans,
    createSubscription,
    getMySubscription,
    initiateSubscriptionPayment,
    cancelSubscription,
    getActiveSubscriptions,
} from "../controllers/subscription.controller";

import {
    authenticateToken,
} from "../middlewares/auth.middleware";


const router = Router();


// =====================================================
// GET AVAILABLE PLANS
// =====================================================
// GET /api/subscriptions/plans
// PUBLIC
// =====================================================

router.get(
    "/plans",
    getPlans
);



// =====================================================
// CREATE SUBSCRIPTION
// POST /api/subscriptions
// =====================================================

router.post(
    "/",
    authenticateToken,
    createSubscription
);



// =====================================================
// GET MY SUBSCRIPTION
// GET /api/subscriptions/my
// =====================================================

router.get(
    "/my",
    authenticateToken,
    getMySubscription
);



// =====================================================
// SUBSCRIPTION PAYMENT
// POST /api/subscriptions/payment
// =====================================================

router.post(
    "/payment",
    authenticateToken,
    initiateSubscriptionPayment
);



// =====================================================
// CANCEL SUBSCRIPTION
// PATCH /api/subscriptions/cancel
// =====================================================

router.patch(
    "/cancel",
    authenticateToken,
    cancelSubscription
);


// =====================================================
// GET ACTIVE SUBSCRIBERS
// GET /api/subscriptions/active
// ADMIN
// =====================================================
// =====================================================
// GET ACTIVE SUBSCRIBERS
// GET /api/subscriptions/active
// =====================================================

router.get(
    "/active",
    // authenticateToken, <-- Désactivé temporairement
    getActiveSubscriptions
);


export default router;