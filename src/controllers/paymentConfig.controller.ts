import { Request, Response } from "express";

import {
  checkPaymentPageLimit
} from "../services/subscription.service";

import {
  PrismaClient,
  PaymentConfigStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

/* =====================================================
   TYPES
===================================================== */

type PaymentConfigBody = {
  airtel?: string | null;
  orange?: string | null;
  mpesa?: string | null;
  afrimoney?: string | null;
  visa?: string | null;
};

/* =====================================================
   HELPERS
===================================================== */

function getUserId(req: Request): number | null {
  const user = (req as any).user;

  if (!user) {
    return null;
  }

  const id = Number(user.id);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

function cleanValue(
  value: unknown
): string | null {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  return value.trim();
}

function getProductId(
  req: Request
): number | null {
  const rawId =
    req.params.productId ??
    req.params.id;

  if (
    typeof rawId !== "string" ||
    !rawId.trim()
  ) {
    return null;
  }

  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

/* =====================================================
   GET PAYMENT CONFIG
   GET /api/payment-config/:productId
===================================================== */

export const getPaymentConfig =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const userId =
        getUserId(req);

      const productId =
        getProductId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "Utilisateur non authentifié.",
        });
      }

      if (!productId) {
        return res.status(400).json({
          success: false,
          message:
            "ID du produit invalide.",
        });
      }

      /* =============================================
         Vérifier que le produit appartient à l'utilisateur
      ============================================= */

      const product =
        await prisma.product.findFirst({
          where: {
            id: productId,
            userId,
          },

          select: {
            id: true,
            name: true,
            type: true,
            price: true,
            currency: true,
            status: true,
            imageUrl: true,
          },
        });

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Produit introuvable ou accès refusé.",
        });
      }

      /* =============================================
         Configuration générale du marchand
      ============================================= */

      const merchantConfig =
        await prisma.merchantPaymentConfig.findUnique(
          {
            where: {
              userId,
            },
          }
        );

      /* =============================================
         Configuration du produit
      ============================================= */

      const productConfig =
        merchantConfig
          ? await prisma.productPaymentConfig.findUnique(
              {
                where: {
                  productId_paymentConfigId: {
                    productId,
                    paymentConfigId:
                      merchantConfig.id,
                  },
                },
              }
            )
          : null;

      return res.status(200).json({
        success: true,

        product,

        configuration: merchantConfig
          ? {
              id:
                merchantConfig.id,

              airtel:
                merchantConfig.airtel,

              orange:
                merchantConfig.orange,

              mpesa:
                merchantConfig.mpesa,

              afrimoney:
                merchantConfig.afrimoney,

              visa:
                merchantConfig.visa,

              status:
                merchantConfig.status,

              active:
                productConfig?.active ??
                false,

              createdAt:
                merchantConfig.createdAt,

              updatedAt:
                merchantConfig.updatedAt,
            }
          : {
              id: null,
              airtel: null,
              orange: null,
              mpesa: null,
              afrimoney: null,
              visa: null,
              status:
                PaymentConfigStatus.PENDING,
              active: false,
              createdAt: null,
              updatedAt: null,
            },
      });
    } catch (error: any) {
      console.error(
        "GET PAYMENT CONFIG ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Erreur lors de la récupération de la configuration des paiements.",
        error:
          process.env.NODE_ENV !==
          "production"
            ? error?.message
            : undefined,
      });
    }
  };

/* =====================================================
   SAVE PAYMENT CONFIG
   POST /api/payment-config/:productId
===================================================== */

export const savePaymentConfig =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const userId =
        getUserId(req);

      const productId =
        getProductId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "Utilisateur non authentifié.",
        });
      }

      if (!productId) {
        return res.status(400).json({
          success: false,
          message:
            "ID du produit invalide.",
        });
      }

      /* =============================================
         Vérifier le produit
      ============================================= */

      const product =
        await prisma.product.findFirst({
          where: {
            id: productId,
            userId,
          },

          select: {
            id: true,
            name: true,
            type: true,
            price: true,
            currency: true,
          },
        });

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Produit introuvable ou accès refusé.",
        });
      }

      const body =
        (req.body ||
          {}) as PaymentConfigBody;

      const airtel =
        cleanValue(body.airtel);

      const orange =
        cleanValue(body.orange);

      const mpesa =
        cleanValue(body.mpesa);

      const afrimoney =
        cleanValue(body.afrimoney);

      const visa =
        cleanValue(body.visa);

      /* =============================================
         Au moins un moyen doit être configuré
      ============================================= */

      if (
        !airtel &&
        !orange &&
        !mpesa &&
        !afrimoney &&
        !visa
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Veuillez configurer au moins un moyen de paiement.",
        });
      }

      /* =============================================
         Transaction
      ============================================= */

      const result =
        await prisma.$transaction(
          async (tx) => {
            /* =========================================
               Créer ou récupérer la configuration
            ========================================= */

            const merchantConfig =
              await tx.merchantPaymentConfig.upsert(
                {
                  where: {
                    userId,
                  },

                  create: {
                    userId,

                    airtel,
                    orange,
                    mpesa,
                    afrimoney,
                    visa,

                    status:
                      PaymentConfigStatus.ACTIVE,
                  },

                  update: {
                    airtel,
                    orange,
                    mpesa,
                    afrimoney,
                    visa,

                    status:
                      PaymentConfigStatus.ACTIVE,
                  },
                }
              );

            /* =========================================
               Lier la configuration au produit
            ========================================= */

            const productConfig =
              await tx.productPaymentConfig.upsert(
                {
                  where: {
                    productId_paymentConfigId: {
                      productId,

                      paymentConfigId:
                        merchantConfig.id,
                    },
                  },

                  create: {
                    productId,

                    paymentConfigId:
                      merchantConfig.id,

                    active: true,
                  },

                  update: {
                    active: true,
                  },
                }
              );

            return {
              merchantConfig,
              productConfig,
            };
          }
        );

      return res.status(200).json({
        success: true,

        message:
          "Configuration des moyens de paiement enregistrée avec succès.",

        product: {
          id: product.id,
          name: product.name,
          type: product.type,
          price: product.price,
          currency: product.currency,
        },

        configuration: {
          id:
            result.merchantConfig.id,

          airtel:
            result.merchantConfig.airtel,

          orange:
            result.merchantConfig.orange,

          mpesa:
            result.merchantConfig.mpesa,

          afrimoney:
            result.merchantConfig.afrimoney,

          visa:
            result.merchantConfig.visa,

          status:
            result.merchantConfig.status,

          active:
            result.productConfig.active,
        },
      });
    } catch (error: any) {
      console.error(
        "SAVE PAYMENT CONFIG ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Erreur lors de l'enregistrement de la configuration des paiements.",
        error:
          process.env.NODE_ENV !==
          "production"
            ? error?.message
            : undefined,
      });
    }
  };

/* =====================================================
   UPDATE PAYMENT CONFIG
   PUT /api/payment-config/:productId
===================================================== */

export const updatePaymentConfig =
  async (
    req: Request,
    res: Response
  ) => {
    return savePaymentConfig(
      req,
      res
    );
  };

/* =====================================================
   ACTIVATE CONFIG FOR PRODUCT
   PATCH /api/payment-config/:productId/activate
===================================================== */

export const activatePaymentConfig =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const userId =
        getUserId(req);

      const productId =
        getProductId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "Utilisateur non authentifié.",
        });
      }

      if (!productId) {
        return res.status(400).json({
          success: false,
          message:
            "ID du produit invalide.",
        });
      }

      const config =
        await prisma.merchantPaymentConfig.findUnique(
          {
            where: {
              userId,
            },
          }
        );

      if (!config) {
        return res.status(404).json({
          success: false,
          message:
            "Aucune configuration de paiement trouvée.",
        });
      }

      const updated =
        await prisma.productPaymentConfig.updateMany(
          {
            where: {
              productId,

              paymentConfigId:
                config.id,
            },

            data: {
              active: true,
            },
          }
        );

      return res.status(200).json({
        success: true,

        message:
          "Les moyens de paiement sont maintenant actifs pour ce produit.",

        count:
          updated.count,
      });
    } catch (error: any) {
      console.error(
        "ACTIVATE PAYMENT CONFIG ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Erreur lors de l'activation des paiements.",
      });
    }
  };

/* =====================================================
   DISABLE CONFIG FOR PRODUCT
   PATCH /api/payment-config/:productId/deactivate
===================================================== */

export const deactivatePaymentConfig =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const userId =
        getUserId(req);

      const productId =
        getProductId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "Utilisateur non authentifié.",
        });
      }

      if (!productId) {
        return res.status(400).json({
          success: false,
          message:
            "ID du produit invalide.",
        });
      }

      const config =
        await prisma.merchantPaymentConfig.findUnique(
          {
            where: {
              userId,
            },
          }
        );

      if (!config) {
        return res.status(404).json({
          success: false,
          message:
            "Aucune configuration de paiement trouvée.",
        });
      }

      await prisma.productPaymentConfig.updateMany(
        {
          where: {
            productId,

            paymentConfigId:
              config.id,
          },

          data: {
            active: false,
          },
        }
      );

      return res.status(200).json({
        success: true,

        message:
          "Les moyens de paiement ont été désactivés pour ce produit.",
      });
    } catch (error: any) {
      console.error(
        "DEACTIVATE PAYMENT CONFIG ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Erreur lors de la désactivation des paiements.",
      });
    }
  };
