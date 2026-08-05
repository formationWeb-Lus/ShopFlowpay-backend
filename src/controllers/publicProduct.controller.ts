
import { Request, Response } from "express";
import {
  ProductStatus,
} from "@prisma/client";

import prisma from "../lib/prisma";

/* =====================================================
   GET TOUS LES PRODUITS / SERVICES PUBLICS
   GET /api/public/products
===================================================== */

export const getPublicProducts = async (
  req: Request,
  res: Response
) => {
  try {
    const products =
      await prisma.product.findMany({
        where: {
          status:
            ProductStatus.PUBLISHED,
        },

        orderBy: {
          createdAt: "desc",
        },

        select: {
          id: true,
          name: true,
          subtitle: true,
          description: true,
          type: true,
          price: true,
          currency: true,
          imageUrl: true,
          status: true,
          createdAt: true,

          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

    return res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    console.error(
      "GET PUBLIC PRODUCTS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de charger les produits et services.",
    });
  }
};

/* =====================================================
   GET PRODUITS / SERVICES PUBLICS D'UN ENTREPRENEUR
   GET /api/public/products/:userId
===================================================== */

export const getPublicProductsBySlug = async (
  req: Request,
  res: Response
) => {
  try {
    const rawId = req.params.slug;

    if (!rawId) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant de l'entrepreneur invalide.",
      });
    }

    const userId = Number(rawId);

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant de l'entrepreneur invalide.",
      });
    }

    const products =
      await prisma.product.findMany({
        where: {
          userId,

          status:
            ProductStatus.PUBLISHED,
        },

        orderBy: {
          createdAt: "desc",
        },

        select: {
          id: true,
          name: true,
          subtitle: true,
          description: true,
          type: true,
          price: true,
          currency: true,
          imageUrl: true,
          status: true,
          createdAt: true,
        },
      });

    return res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    console.error(
      "GET PUBLIC PRODUCTS BY USER ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de charger les produits et services.",
    });
  }
};




/* =====================================================
   GET UN PRODUIT / SERVICE PUBLIC
   GET /api/public/products/:slug/:id
===================================================== */

export const getPublicProductBySlugAndId = async (
  req: Request,
  res: Response
) => {
  try {
    const slug = req.params.slug;
    const rawId = req.params.id;

    /* =============================================
       VALIDATION SLUG
    ============================================= */

    if (!slug || typeof slug !== "string") {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant de l'entrepreneur invalide.",
      });
    }

    /* =============================================
       VALIDATION PRODUCT ID
    ============================================= */

    const productId = Number(rawId);

    if (
      !Number.isInteger(productId) ||
      productId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Identifiant du produit invalide.",
      });
    }

    /* =============================================
       RECHERCHER L'ENTREPRENEUR
    ============================================= */

    const user =
      await prisma.user.findFirst({
        where: {
          slug,
        },

        select: {
          id: true,
          name: true,
          email: true,
        },
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Entrepreneur introuvable.",
      });
    }

    /* =============================================
       RECHERCHER LE PRODUIT
       UNIQUEMENT CHEZ CET ENTREPRENEUR
    ============================================= */

    const product =
      await prisma.product.findFirst({
        where: {
          id: productId,

          userId: user.id,

          status:
            ProductStatus.PUBLISHED,
        },

        select: {
          id: true,
          name: true,
          subtitle: true,
          description: true,
          type: true,
          price: true,
          currency: true,
          imageUrl: true,
          status: true,
          createdAt: true,

          user: {
            select: {
              id: true,
              name: true,
              slug: true,

              company: {
                select: {
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      });

    /* =============================================
       PRODUIT INTROUVABLE
    ============================================= */

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Produit introuvable ou non disponible.",
      });
    }

    /* =============================================
       REPONSE
    ============================================= */

    return res.status(200).json({
      success: true,

      product,
    });
  } catch (error) {
    console.error(
      "GET PUBLIC PRODUCT BY SLUG AND ID ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de charger le produit.",
    });
  }
};


