
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
 *
 * =========================================================
 */

export async function getPublicStore(
  req: Request,
  res: Response
) {
  try {
    /* =====================================================
       1. RÉCUPÉRER LE SLUG
    ===================================================== */

    const rawSlug =
      req.params.slug;

    /*
     * Express peut typer un paramètre
     * comme string | string[].
     *
     * Nous récupérons donc une seule valeur.
     */

    const slug =
      Array.isArray(rawSlug)
        ? rawSlug[0]
        : rawSlug;

    /* =====================================================
       2. VALIDATION DU SLUG
    ===================================================== */

    if (
      typeof slug !== "string" ||
      !slug.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Slug invalide.",
      });
    }

    /* =====================================================
       3. NORMALISER LE SLUG
    ===================================================== */

    const normalizedSlug =
      slug
        .trim()
        .toLowerCase();

    /* =====================================================
       4. RECHERCHER L'UTILISATEUR
    ===================================================== */

    const user =
      await prisma.user.findUnique({
        where: {
          slug: normalizedSlug,
        },

        select: {
          /* ===============================================
             UTILISATEUR
          =============================================== */

          id: true,

          name: true,

          /* ===============================================
             ENTREPRISE
          =============================================== */

          company: {
            select: {
              id: true,

              name: true,

              slug: true,
            },
          },

          /* ===============================================
             PRODUITS PUBLIÉS
          =============================================== */

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

    /* =====================================================
       5. ENTREPRENEUR INTROUVABLE
    ===================================================== */

    if (!user) {
      return res.status(404).json({
        success: false,

        message:
          "Cette boutique ou cet entrepreneur n'existe pas.",
      });
    }

    /* =====================================================
       6. RÉPONSE PUBLIQUE
    ===================================================== */

    return res.status(200).json({
      success: true,

      /* ===============================================
         ENTREPRENEUR
      =============================================== */

      entrepreneur: {
        id:
          user.id,

        name:
          user.name,
      },

      /* ===============================================
         ENTREPRISE
      =============================================== */

      company:
        user.company,

      /* ===============================================
         PRODUITS
      =============================================== */

      products:
        user.products,
    });
  } catch (error: unknown) {
    /* =====================================================
       ERREUR
    ===================================================== */

    console.error(
      "========================================"
    );

    console.error(
      "❌ GET PUBLIC STORE ERROR"
    );

    console.error(
      "========================================"
    );

    console.error(error);

    return res.status(500).json({
      success: false,

      message:
        "Erreur lors du chargement de la boutique.",

      error:
        process.env.NODE_ENV !==
        "production"
          ? error instanceof Error
            ? error.stack
            : undefined
          : undefined,
    });
  }
}
