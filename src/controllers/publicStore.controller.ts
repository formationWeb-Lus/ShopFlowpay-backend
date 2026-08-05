
import { Request, Response } from "express";
import prisma from "../lib/prisma";

/**
 * =========================================================
 * GET PUBLIC STORE BY SLUG
 * GET /api/public/store/:slug
 * =========================================================
 *
 * Aucun token nécessaire.
 *
 * Retourne :
 * - l'entrepreneur
 * - son entreprise
 * - uniquement ses produits/services publiés
 */
export async function getPublicStore(
  req: Request,
  res: Response
) {
  try {
    const { slug } = req.params;

    if (!slug || !slug.trim()) {
      return res.status(400).json({
        success: false,
        message: "Slug invalide.",
      });
    }

    const normalizedSlug = slug
      .trim()
      .toLowerCase();

    /**
     * =====================================================
     * RECHERCHER L'UTILISATEUR
     * =====================================================
     */

    const user = await prisma.user.findUnique({
      where: {
        slug: normalizedSlug,
      },

      select: {
        id: true,
        name: true,

        company: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },

        products: {
          where: {
            status: "PUBLISHED",
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
        },
      },
    });

    /**
     * =====================================================
     * ENTREPRENEUR INTROUVABLE
     * =====================================================
     */

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Cette boutique ou cet entrepreneur n'existe pas.",
      });
    }

    /**
     * =====================================================
     * REPONSE
     * =====================================================
     */

    return res.status(200).json({
      success: true,

      entrepreneur: {
        id: user.id,
        name: user.name,
      },

      company: user.company,

      products: user.products,
    });
  } catch (error: any) {
    console.error(
      "GET PUBLIC STORE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Erreur lors du chargement de la boutique.",
    });
  }
}
