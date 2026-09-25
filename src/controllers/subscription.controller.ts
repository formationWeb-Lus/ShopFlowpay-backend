
import { Request, Response } from "express";

import {
  AuthRequest,
} from "../middlewares/auth.middleware";

import {
  getPlansService,
  createSubscriptionService,
  getMySubscriptionService,
  cancelSubscriptionService,
} from "../services/subscription.service";

import {
  SerdiPayCurrency,
  SerdiPayTelecom,
  processSerdiPayPayment,
} from "../services/serdipay.service";

import prisma from "../lib/prisma";

// =====================================================
// GET PLANS
// GET /api/subscriptions/plans
// =====================================================

export async function getPlans(
  req: Request,
  res: Response
) {
  try {
    const plans = await getPlansService();

    return res.status(200).json({
      success: true,
      plans,
    });
  } catch (error: unknown) {
    console.error(
      "GET PLANS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de récupérer les plans.",
    });
  }
}

// =====================================================
// CREATE SUBSCRIPTION
// POST /api/subscriptions
// =====================================================

export async function createSubscription(
  req: AuthRequest,
  res: Response
) {
  try {
    // =====================================================
    // AUTHENTIFICATION
    // =====================================================

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Utilisateur non authentifié.",
      });
    }

    // =====================================================
    // RECUPERER PLAN
    // =====================================================

    const { planId } = req.body;

    if (
      planId === undefined ||
      planId === null ||
      planId === ""
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Le plan est obligatoire.",
      });
    }

    // =====================================================
    // NORMALISER PLAN ID
    // =====================================================

    const parsedPlanId = Number(planId);

    if (
      !Number.isInteger(parsedPlanId) ||
      parsedPlanId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ID du plan invalide.",
      });
    }

    // =====================================================
    // CREER ABONNEMENT
    // =====================================================

    const subscription =
      await createSubscriptionService(
        req.user.id,
        parsedPlanId
      );

    // =====================================================
    // REPONSE
    // =====================================================

    return res.status(201).json({
      success: true,
      message:
        "Abonnement créé avec succès.",
      subscription,
    });
  } catch (error: any) {
    console.error(
      "CREATE SUBSCRIPTION ERROR:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error?.message ||
        "Impossible de créer l'abonnement.",
    });
  }
}

// =====================================================
// GET MY SUBSCRIPTION
// GET /api/subscriptions/my
// =====================================================

export async function getMySubscription(
  req: AuthRequest,
  res: Response
) {
  try {
    // =====================================================
    // AUTHENTIFICATION
    // =====================================================

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Utilisateur non authentifié.",
      });
    }

    // =====================================================
    // RECUPERER ABONNEMENT
    // =====================================================

    const subscription =
      await getMySubscriptionService(
        req.user.id
      );

    // =====================================================
    // REPONSE
    // =====================================================

    return res.status(200).json({
      success: true,
      subscription:
        subscription || null,
    });
  } catch (error: unknown) {
    console.error(
      "GET MY SUBSCRIPTION ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur serveur lors de la récupération de l'abonnement.",
    });
  }
}

// =====================================================
// INITIATE SUBSCRIPTION PAYMENT
// POST /api/subscriptions/payment
// =====================================================

export async function initiateSubscriptionPayment(
  req: AuthRequest,
  res: Response
) {
  try {
    // =====================================================
    // AUTHENTIFICATION
    // =====================================================

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Utilisateur non authentifié.",
      });
    }

    const userId = req.user.id;

    // =====================================================
    // DONNEES REQUETE
    // =====================================================

    const {
      planId,
      clientPhone,
      currency,
      telecom,
    } = req.body;

    // =====================================================
    // VALIDATION PLAN
    // =====================================================

    if (
      planId === undefined ||
      planId === null ||
      planId === ""
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Le plan est obligatoire.",
      });
    }

    const parsedPlanId = Number(planId);

    if (
      !Number.isInteger(parsedPlanId) ||
      parsedPlanId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ID du plan invalide.",
      });
    }

    // =====================================================
    // VALIDATION TELEPHONE
    // =====================================================

    if (
      clientPhone === undefined ||
      clientPhone === null ||
      clientPhone === ""
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Le numéro de téléphone est obligatoire.",
      });
    }

    const normalizedPhone =
      String(clientPhone)
        .trim()
        .replace(/\s+/g, "");

    /*
     * Format attendu :
     *
     * 243 + 9 chiffres
     *
     * Exemple :
     * 243812345678
     */

    if (
      !/^243\d{9}$/.test(
        normalizedPhone
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Format téléphone invalide. Utilisez le format 243XXXXXXXXX.",
      });
    }

    // =====================================================
    // CURRENCY
    // =====================================================

    const selectedCurrency: SerdiPayCurrency =
      String(currency)
        .trim()
        .toUpperCase() === "CDF"
        ? "CDF"
        : "USD";

    // =====================================================
    // TELECOM
    // =====================================================

    const normalizedTelecom =
      String(telecom || "")
        .trim()
        .toUpperCase();

    const allowedTelecoms: SerdiPayTelecom[] = [
      "AM",
      "OM",
      "MP",
      "AF",
    ];

    if (
      !allowedTelecoms.includes(
        normalizedTelecom as SerdiPayTelecom
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Opérateur invalide. Utilisez AM, OM, MP ou AF.",
      });
    }

    const selectedTelecom =
      normalizedTelecom as SerdiPayTelecom;

    // =====================================================
    // RECUPERER LE PLAN
    // =====================================================

    const plan =
      await prisma.plan.findUnique({
        where: {
          id: parsedPlanId,
        },
      });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message:
          "Plan introuvable.",
      });
    }

    // =====================================================
    // CALCUL DU MONTANT
    // =====================================================

    const amount =
      selectedCurrency === "CDF"
        ? Number(plan.priceCDF)
        : Number(plan.priceUSD);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Le prix du plan est invalide.",
      });
    }

    // =====================================================
    // RECHERCHER UN ABONNEMENT PENDING EXISTANT
    // =====================================================

    let subscription =
      await prisma.subscription.findFirst({
        where: {
          userId,
          planId: parsedPlanId,
          status: "PENDING",
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    // =====================================================
    // CREER ABONNEMENT PENDING
    // =====================================================

    if (!subscription) {
      subscription =
        await prisma.subscription.create({
          data: {
            userId,
            planId: parsedPlanId,
            status: "PENDING",
            autoRenew: true,
          },
        });
    }

    // =====================================================
    // PAIEMENT SERDIPAY
    // =====================================================

    /*
     * IMPORTANT :
     *
     * Les identifiants SerdiPay NE SONT PLUS envoyés
     * depuis ce controller.
     *
     * Le service serdipay.service.ts récupère lui-même :
     *
     * SERDIPAY_API_ID
     * SERDIPAY_API_PASSWORD
     * SERDIPAY_MERCHANT_CODE
     * SERDIPAY_MERCHANT_PIN
     *
     * depuis .env.
     */

    const payment =
  await processSerdiPayPayment({
    clientPhone: normalizedPhone,
    amount,
    currency: selectedCurrency,
    telecom: selectedTelecom,
  });

    // =====================================================
    // REPONSE
    // =====================================================

    return res.status(200).json({
      success:
        payment.success,

      message:
        payment.message,

      subscriptionId:
        subscription.id,

      planId:
        plan.id,

      planName:
        plan.name,

      amount,

      currency:
        selectedCurrency,

      telecom:
        selectedTelecom,

      payment,
    });
  } catch (error: any) {
    console.error(
      "================================================="
    );

    console.error(
      "SUBSCRIPTION PAYMENT ERROR:"
    );

    console.error(error);

    console.error(
      "================================================="
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Erreur lors du paiement de l'abonnement.",
    });
  }
}

// =====================================================
// CANCEL SUBSCRIPTION
// PATCH /api/subscriptions/cancel
// =====================================================

export async function cancelSubscription(
  req: AuthRequest,
  res: Response
) {
  try {
    // =====================================================
    // AUTHENTIFICATION
    // =====================================================

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Utilisateur non authentifié.",
      });
    }

    // =====================================================
    // ANNULATION
    // =====================================================

    const subscription =
      await cancelSubscriptionService(
        req.user.id
      );

    // =====================================================
    // REPONSE
    // =====================================================

    return res.status(200).json({
      success: true,
      message:
        "Abonnement annulé avec succès.",
      subscription,
    });
  } catch (error: any) {
    console.error(
      "CANCEL SUBSCRIPTION ERROR:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error?.message ||
        "Impossible d'annuler l'abonnement.",
    });
  }
}


// controllers/subscription.controller.ts

export const getActiveSubscriptions = async (req: Request, res: Response) => {
  try {
    // Exemple direct avec Prisma / Mongoose / SQL :
    const activeSubscriptions = await prisma.subscription.findMany({
      where: { status: "ACTIVE" }
    });

    return res.json({
      success: true,
      data: activeSubscriptions
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};