import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email?: string;
    role?: string;
  };
}

/* =====================================================
   GET /api/marketing/social-accounts
   Récupérer les comptes sociaux connectés
===================================================== */

export const getSocialAccounts = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur non authentifié.",
      });
    }

    const accounts =
      await prisma.socialAccount.findMany({
        where: {
          userId,
          active: true,
        },

        select: {
          id: true,
          provider: true,
          providerAccountId: true,
          username: true,
          displayName: true,
          profileImageUrl: true,
          tokenExpiresAt: true,
          scopes: true,
          metadata: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    return res.status(200).json({
      success: true,
      accounts,
    });

  } catch (error) {
    console.error(
      "GET SOCIAL ACCOUNTS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de récupérer vos comptes sociaux.",
    });
  }
};


/* =====================================================
   DELETE /api/marketing/social-accounts/:id

   Déconnecter un compte social
===================================================== */

export const disconnectSocialAccount = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur non authentifié.",
      });
    }

    const accountId =
      Number(req.params.id);

    if (
      !Number.isInteger(accountId) ||
      accountId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant du compte social invalide.",
      });
    }

    /* =================================================
       VÉRIFIER QUE LE COMPTE APPARTIENT À L'UTILISATEUR
    ================================================= */

    const account =
      await prisma.socialAccount.findFirst({
        where: {
          id: accountId,
          userId,
        },
      });

    if (!account) {
      return res.status(404).json({
        success: false,
        message:
          "Compte social introuvable.",
      });
    }

    /* =================================================
       DÉSACTIVER LE COMPTE

       On ne supprime pas le compte de la DB.
       On le désactive pour conserver l'historique.
    ================================================= */

    await prisma.socialAccount.update({
      where: {
        id: account.id,
      },

      data: {
        active: false,
      },
    });

    return res.status(200).json({
      success: true,

      message:
        `${account.provider} a été déconnecté avec succès.`,
    });

  } catch (error) {
    console.error(
      "DISCONNECT SOCIAL ACCOUNT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de déconnecter le compte social.",
    });
  }
};