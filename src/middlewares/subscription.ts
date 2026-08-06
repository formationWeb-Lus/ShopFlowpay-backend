import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { SubscriptionStatus } from "@prisma/client";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
  };

  subscription?: any;
}

export async function requireActiveSubscription(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur non authentifié.",
      });
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!subscription) {
      return res.status(403).json({
        success: false,
        code: "SUBSCRIPTION_REQUIRED",
        message:
          "Vous devez souscrire à un abonnement avant d'utiliser cette fonctionnalité.",
      });
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      return res.status(403).json({
        success: false,
        code: "SUBSCRIPTION_INACTIVE",
        message:
          "Votre abonnement n'est pas encore actif.",
      });
    }

    if (
      subscription.endDate &&
      subscription.endDate.getTime() < Date.now()
    ) {
      return res.status(403).json({
        success: false,
        code: "SUBSCRIPTION_EXPIRED",
        message:
          "Votre abonnement a expiré. Veuillez le renouveler.",
      });
    }

    req.subscription = subscription;

    next();
  } catch (error) {
    console.error("SUBSCRIPTION MIDDLEWARE ERROR :", error);

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors de la vérification de l'abonnement.",
    });
  }
}