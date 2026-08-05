
import { Request, Response } from "express";
import prisma from "../lib/prisma";

// =====================================================
// GET MARKETING PRODUCTS
// =====================================================

export const getMarketingProducts = async (
  req: Request,
  res: Response
) => {
  console.log("==========================================");
  console.log("MARKETING - RÉCUPÉRATION DES PRODUITS");
  console.log("==========================================");

  try {
    const userId = Number(
      (req as any).user?.id
    );

    console.log(
      "Utilisateur Marketing :",
      userId
    );

    if (!userId || Number.isNaN(userId)) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur non authentifié.",
      });
    }

    // =================================================
    // RÉCUPÉRATION DES PRODUITS
    // =================================================

    const products =
      await prisma.product.findMany({
        where: {
          userId,
          status: "PUBLISHED",
        },

        orderBy: {
          createdAt: "desc",
        },

        include: {
          fields: {
            orderBy: {
              id: "asc",
            },
          },

          paymentConfigs: {
            where: {
              active: true,
            },

            include: {
              paymentConfig: {
                select: {
                  id: true,
                  status: true,
                  airtel: true,
                  orange: true,
                  mpesa: true,
                  afrimoney: true,
                  visa: true,
                },
              },
            },
          },

          paymentPageProducts: true,
        },
      });

    console.log(
      "Produits trouvés :",
      products.length
    );

    // =================================================
    // TRANSFORMATION POUR LE FRONTEND
    // =================================================

    const formattedProducts = products.map(
      (product: any) => {
        return {
          id: product.id,

          name: product.name,

          subtitle:
            product.subtitle ?? null,

          description:
            product.description ?? null,

          type: product.type,

          price: Number(product.price),

          currency: product.currency,

          imageUrl:
            product.imageUrl ?? null,

          status: product.status,

          createdAt:
            product.createdAt,

          /*
           * Pour le moment, le frontend peut
           * utiliser le fallback :
           *
           * /pay/{product.id}
           *
           * Si ton modèle PaymentPage possède
           * un slug, nous pourrons ensuite
           * récupérer le vrai slug via
           * paymentPageProducts.
           */

          paymentPage: null,

          paymentUrl: null,

          /*
           * Informations supplémentaires
           * disponibles pour le marketing.
           */

          fields:
            product.fields ?? [],

          paymentConfigs:
            product.paymentConfigs ?? [],
        };
      }
    );

    // =================================================
    // RÉPONSE
    // =================================================

    return res.status(200).json({
      success: true,

      message:
        "Produits Marketing récupérés avec succès.",

      products: formattedProducts,

      total:
        formattedProducts.length,
    });
  } catch (error) {
    console.error(
      "GET MARKETING PRODUCTS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Impossible de récupérer vos produits Marketing.",

      error:
        process.env.NODE_ENV === "development"
          ? error instanceof Error
            ? error.message
            : String(error)
          : undefined,
    });
  }
};

// =====================================================
// VERIFY MARKETING PRODUCT
// =====================================================

export const verifyMarketingProduct = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = Number(
      (req as any).user?.id
    );

    const productId = Number(
      req.params.id
    );

    if (
      !userId ||
      Number.isNaN(userId)
    ) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur non authentifié.",
      });
    }

    if (
      !productId ||
      Number.isNaN(productId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Identifiant du produit invalide.",
      });
    }

    const product =
      await prisma.product.findFirst({
        where: {
          id: productId,
          userId,
          status: "PUBLISHED",
        },

        include: {
          paymentPageProducts: true,
        },
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Produit introuvable ou non disponible.",
      });
    }

    return res.status(200).json({
      success: true,

      product: {
        id: product.id,
        name: product.name,
        status: product.status,
      },
    });
  } catch (error) {
    console.error(
      "VERIFY MARKETING PRODUCT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de vérifier le produit.",
    });
  }
};
