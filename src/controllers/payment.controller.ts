
import { Request, Response } from "express";

import prisma from "../lib/prisma";

import {
  initiateSerdiPayPayment,
  checkSerdiPayPaymentStatus,
} from "../services/serdipay.service";

// =====================================================
// TYPES
// =====================================================

type PaymentCurrency =
  | "USD"
  | "CDF";

type PaymentTelecom =
  | "AM"
  | "OM"
  | "MP"
  | "AF";

// =====================================================
// HELPERS
// =====================================================

function normalizeCurrency(
  value: unknown
): PaymentCurrency | null {

  const currency =
    String(value || "")
      .trim()
      .toUpperCase();

  if (
    currency === "USD" ||
    currency === "CDF"
  ) {
    return currency;
  }

  return null;
}

// =====================================================
// NORMALISER TELECOM
// =====================================================

function normalizeTelecom(
  value: unknown
): PaymentTelecom | null {

  const telecom =
    String(value || "")
      .trim()
      .toUpperCase();

  if (
    telecom === "AM" ||
    telecom === "OM" ||
    telecom === "MP" ||
    telecom === "AF"
  ) {
    return telecom;
  }

  return null;
}

// =====================================================
// NORMALISER TELEPHONE
// =====================================================

function normalizePhone(
  value: unknown
): string {

  return String(value || "")
    .replace(/\D/g, "")
    .trim();
}

// =====================================================
// INITIER UN PAIEMENT
// =====================================================
//
// POST /api/payment/initiate
//
// Flux:
//
// Frontend
//    ↓
// amount
// currency
// phone
// telecom
//    ↓
// Backend
//    ↓
// Création Payment = PENDING
//    ↓
// SerdiPay
//    ↓
// transactionId / sessionId
//    ↓
// Mise à jour Payment
//
// =====================================================

export async function initiatePayment(
  req: Request,
  res: Response
) {

  try {

    // =================================================
    // RÉCUPÉRER LES DONNÉES
    // =================================================

    const {
      userId,
      courseId,
      amount,
      phone,
      telecom,
      currency,
    } = req.body;

    // =================================================
    // VALIDATION PRÉSENCE
    // =================================================

    if (
      amount === undefined ||
      amount === null ||
      amount === "" ||
      !phone ||
      !telecom ||
      !currency
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Informations paiement incomplètes.",

      });
    }

    // =================================================
    // MONTANT
    // =================================================

    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(
        numericAmount
      ) ||
      numericAmount <= 0
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Le montant du paiement est invalide.",

      });
    }

    // =================================================
    // TÉLÉPHONE
    // =================================================

    const normalizedPhone =
      normalizePhone(phone);

    if (
      !normalizedPhone ||
      normalizedPhone.length < 9
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Numéro de téléphone invalide.",

      });
    }

    // =================================================
    // TELECOM
    // =================================================

    const normalizedTelecom =
      normalizeTelecom(
        telecom
      );

    if (!normalizedTelecom) {

      return res.status(400).json({

        success: false,

        message:
          "Opérateur Mobile Money invalide.",

      });
    }

    // =================================================
    // DEVISE
    // =================================================

    const normalizedCurrency =
      normalizeCurrency(
        currency
      );

    if (!normalizedCurrency) {

      return res.status(400).json({

        success: false,

        message:
          "Devise de paiement invalide. Utilisez USD ou CDF.",

      });
    }

    // =================================================
    // USER ID
    // =================================================

    let normalizedUserId:
      number | null = null;

    if (
      userId !== undefined &&
      userId !== null &&
      userId !== ""
    ) {

      const parsedUserId =
        Number(userId);

      if (
        Number.isFinite(
          parsedUserId
        ) &&
        parsedUserId > 0
      ) {

        normalizedUserId =
          parsedUserId;

      }
    }

    // =================================================
    // COURSE ID
    // =================================================
    //
    // Conservé pour compatibilité avec ton frontend
    // actuel.
    //
    // Si ton modèle Payment possède courseId,
    // on peut l'enregistrer.
    //
    // =================================================

    let normalizedCourseId:
      number | null = null;

    if (
      courseId !== undefined &&
      courseId !== null &&
      courseId !== ""
    ) {

      const parsedCourseId =
        Number(courseId);

      if (
        Number.isFinite(
          parsedCourseId
        ) &&
        parsedCourseId > 0
      ) {

        normalizedCourseId =
          parsedCourseId;

      }
    }

    // =================================================
    // LOG
    // =================================================

    console.log(
      "=============================================="
    );

    console.log(
      "💳 NOUVEAU PAIEMENT"
    );

    console.log(
      "Montant :",
      numericAmount
    );

    console.log(
      "Devise :",
      normalizedCurrency
    );

    console.log(
      "Téléphone :",
      normalizedPhone
    );

    console.log(
      "Telecom :",
      normalizedTelecom
    );

    console.log(
      "=============================================="
    );

    // =================================================
    // CRÉER LE PAIEMENT EN BASE
    // =================================================

    const payment =
      await prisma.payment.create({

        data: {

          userId:
            normalizedUserId,

          amount:
            numericAmount,

          currency:
            normalizedCurrency,

          phone:
            normalizedPhone,

          telecom:
            normalizedTelecom,

          status:
            "PENDING",

          ...(normalizedCourseId
            ? {
                courseId:
                  normalizedCourseId,
              }
            : {}),
        },

      });

    // =================================================
    // ENVOYER À SERDIPAY
    // =================================================
    //
    // IMPORTANT :
    //
    // Le montant envoyé à SerdiPay est EXACTEMENT
    // celui reçu du frontend.
    //
    // Exemple :
    //
    // 15 USD
    //
    // devient :
    //
    // amount: 15
    // currency: "USD"
    //
    // Exemple :
    //
    // 33450 CDF
    //
    // devient :
    //
    // amount: 33450
    // currency: "CDF"
    //
    // AUCUNE conversion ici.
    //
    // =================================================

    const serdiResponse =
      await initiateSerdiPayPayment({

        clientPhone:
          normalizedPhone,

        amount:
          numericAmount,

        telecom:
          normalizedTelecom,

        currency:
          normalizedCurrency,

      });

    // =================================================
    // SERDIPAY A ÉCHOUÉ
    // =================================================

    if (
      !serdiResponse.success &&
      serdiResponse.status ===
        "failed"
    ) {

      await prisma.payment.update({

        where: {
          id:
            payment.id,
        },

        data: {

          transactionId:
            serdiResponse.transactionId ||
            null,

          sessionId:
            serdiResponse.sessionId ||
            null,

          status:
            "FAILED",
        },

      });

      return res.status(400).json({

        success: false,

        paymentId:
          payment.id,

        message:
          serdiResponse.message ||
          "SerdiPay a refusé le paiement.",

        data:
          serdiResponse,

      });
    }

    // =================================================
    // SAUVEGARDER SERDIPAY
    // =================================================

    await prisma.payment.update({

      where: {

        id:
          payment.id,

      },

      data: {

        transactionId:
          serdiResponse.transactionId ||
          null,

        sessionId:
          serdiResponse.sessionId ||
          null,

        status:
          serdiResponse.status ===
          "success"
            ? "SUCCESS"
            : "PENDING",

      },

    });

    // =================================================
    // RÉPONSE FRONTEND
    // =================================================

    return res.json({

      success: true,

      paymentId:
        payment.id,

      amount:
        numericAmount,

      currency:
        normalizedCurrency,

      phone:
        normalizedPhone,

      telecom:
        normalizedTelecom,

      data:
        serdiResponse,

    });

  } catch (
    error: unknown
  ) {

    console.error(
      "❌ INITIATE PAYMENT ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      message:
        "Erreur initialisation paiement.",

    });
  }
}

// =====================================================
// VÉRIFIER LE STATUS DU PAIEMENT
// =====================================================
//
// GET /api/payment/status/:transactionId
//
// =====================================================

export async function checkPaymentStatus(
  req: Request,
  res: Response
) {

  try {

    // =================================================
    // TRANSACTION ID
    // =================================================

    const rawTransactionId =
      req.params.transactionId;

    const transactionId =
      Array.isArray(
        rawTransactionId
      )
        ? rawTransactionId[0]
        : rawTransactionId;

    // =================================================
    // VALIDATION
    // =================================================

    if (
      !transactionId ||
      !transactionId.trim()
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Transaction ID invalide.",

      });
    }

    const normalizedTransactionId =
      transactionId.trim();

    // =================================================
    // RECHERCHER LE PAIEMENT
    // =================================================

    const payment =
      await prisma.payment.findFirst({

        where: {

          transactionId:
            normalizedTransactionId,

        },

      });

    if (!payment) {

      return res.status(404).json({

        success: false,

        message:
          "Paiement introuvable.",

      });
    }

    // =================================================
    // DEMANDER LE STATUS SERDIPAY
    // =================================================

    const status =
      await checkSerdiPayPaymentStatus(
        normalizedTransactionId
      );

    // =================================================
    // STATUS LOCAL
    // =================================================

    let localStatus:
      | "SUCCESS"
      | "PENDING"
      | "FAILED" =
      "PENDING";

    // =================================================
    // SUCCESS
    // =================================================

    if (
      status.status ===
      "success"
    ) {

      localStatus =
        "SUCCESS";

    }

    // =================================================
    // FAILED
    // =================================================

    else if (
      status.status ===
      "failed"
    ) {

      localStatus =
        "FAILED";

    }

    // =================================================
    // PENDING
    // =================================================

    else {

      localStatus =
        "PENDING";

    }

    // =================================================
    // METTRE À JOUR LA BASE
    // =================================================

    await prisma.payment.update({

      where: {

        id:
          payment.id,

      },

      data: {

        status:
          localStatus,

      },

    });

    // =================================================
    // RÉPONSE
    // =================================================

    return res.json({

      success: true,

      paymentId:
        payment.id,

      transactionId:
        normalizedTransactionId,

      status,

    });

  } catch (
    error: unknown
  ) {

    console.error(
      "❌ CHECK PAYMENT ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      message:
        "Erreur vérification paiement.",

    });
  }
}

// =====================================================
// MES TRANSACTIONS
// =====================================================
//
// GET /api/payment/transactions
//
// =====================================================

export async function getMyTransactions(
  req: Request,
  res: Response
) {

  try {

    // =================================================
    // USER CONNECTÉ
    // =================================================

    const userId =
      Number(
        (req as any)
          .user
          ?.id
      );

    if (
      !Number.isFinite(
        userId
      ) ||
      userId <= 0
    ) {

      return res.status(401).json({

        success: false,

        message:
          "Utilisateur non authentifié.",

      });
    }

    // =================================================
    // RÉCUPÉRER PAIEMENTS
    // =================================================

    const payments =
      await prisma.payment.findMany({

        where: {

          userId,

        },

        include: {

          customer: true,

        },

        orderBy: {

          createdAt:
            "desc",

        },

      });

    // =================================================
    // FORMAT TRANSACTIONS
    // =================================================

    const transactions =
      payments.map(
        (payment) => ({

          id:
            payment.id,

          reference:
            payment.transactionId ||
            `TRX-${payment.id}`,

          customer:
            payment.customer?.name ||
            "Client inconnu",

          amount:
            payment.amount,

          currency:
            payment.currency,

          method:
            payment.telecom ||
            "AUTRE",

          status:
            payment.status,

          createdAt:
            payment.createdAt,

        })
      );

    // =================================================
    // RÉPONSE
    // =================================================

    return res.json({

      success: true,

      transactions,

    });

  } catch (
    error: unknown
  ) {

    console.error(
      "❌ GET TRANSACTIONS ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      message:
        "Erreur récupération transactions.",

    });
  }
}
