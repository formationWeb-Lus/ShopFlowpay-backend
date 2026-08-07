
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * =====================================================
 * CREATE PAYMENT PAGE
 * =====================================================
 *
 * POST /api/payment-pages
 *
 * Body:
 * {
 *   productId: 1,
 *   title: "Acheter ma formation",
 *   description: "Formation complète...",
 *   slug: "ma-formation"
 * }
 */
export const createPaymentPage = async (
  req: Request,
  res: Response
) => {
  try {
    // -------------------------------------------------
    // UTILISATEUR CONNECTÉ
    // -------------------------------------------------

    const userId = Number(
      (req as any).user?.id
    );

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur non authentifié.",
      });
    }

    // -------------------------------------------------
    // DONNÉES
    // -------------------------------------------------

    const {
      productId,
      title,
      description,
      slug,
    } = req.body;

    const numericProductId = Number(productId);

    // -------------------------------------------------
    // VALIDATION PRODUCT ID
    // -------------------------------------------------

    if (
      !numericProductId ||
      Number.isNaN(numericProductId)
    ) {
      return res.status(400).json({
        success: false,
        message: "ID du produit invalide.",
      });
    }

    // -------------------------------------------------
    // VALIDATION TITRE
    // -------------------------------------------------

    if (
      !title ||
      typeof title !== "string" ||
      !title.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Le titre de la page est obligatoire.",
      });
    }

    // -------------------------------------------------
    // VÉRIFIER LE PRODUIT
    // -------------------------------------------------

    const product =
      await prisma.product.findFirst({
        where: {
          id: numericProductId,
          userId,
        },
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Produit introuvable ou vous n'êtes pas propriétaire de ce produit.",
      });
    }

    // -------------------------------------------------
    // VÉRIFIER SI LE PRODUIT A DÉJÀ UNE PAGE
    // -------------------------------------------------

    const existingPage =
      await prisma.paymentPage.findFirst({
        where: {
          userId,

          products: {
            some: {
              productId: numericProductId,
            },
          },
        },

        include: {
          products: {
            include: {
              product: true,
            },
          },
        },
      });

    if (existingPage) {
      return res.status(409).json({
        success: false,
        message:
          "Ce produit possède déjà une page de paiement.",
        paymentPage: existingPage,
      });
    }

    // -------------------------------------------------
    // GÉNÉRER LE SLUG
    // -------------------------------------------------

    let finalSlug: string;

    if (
      slug &&
      typeof slug === "string" &&
      slug.trim()
    ) {
      finalSlug = slug
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    } else {
      const baseSlug = product.name
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      finalSlug =
        `${baseSlug}-${product.id}`;
    }

    // -------------------------------------------------
    // SÉCURISER LE SLUG
    // -------------------------------------------------

    const existingSlug =
      await prisma.paymentPage.findUnique({
        where: {
          slug: finalSlug,
        },
      });

    if (existingSlug) {
      finalSlug =
        `${finalSlug}-${Date.now()}`;
    }

    // -------------------------------------------------
    // CRÉATION
    // -------------------------------------------------

    const paymentPage =
      await prisma.paymentPage.create({
        data: {
          userId,

          title: title.trim(),

          slug: finalSlug,

          description:
            description &&
            String(description).trim()
              ? String(description).trim()
              : product.description,

          active: true,

          // -------------------------------------------
          // ASSOCIATION DU PRODUIT
          // -------------------------------------------

          products: {
            create: {
              productId:
                numericProductId,
            },
          },
        },

        include: {
          products: {
            include: {
              product: true,
            },
          },
        },
      });

    // -------------------------------------------------
    // RÉPONSE
    // -------------------------------------------------

    return res.status(201).json({
      success: true,

      message:
        "Page de paiement créée avec succès.",

      paymentPage,
    });

  } catch (error) {

    console.error(
      "CREATE PAYMENT PAGE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de créer la page de paiement.",
    });
  }
};


/**
 * =====================================================
 * GET MY PAYMENT PAGES
 * =====================================================
 *
 * GET /api/payment-pages
 */
export const getMyPaymentPages = async (
  req: Request,
  res: Response
) => {
  try {

    // -------------------------------------------------
    // UTILISATEUR
    // -------------------------------------------------

    const userId = Number(
      (req as any).user?.id
    );

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Utilisateur non authentifié.",
      });
    }

    // -------------------------------------------------
    // RÉCUPÉRER LES PAGES
    // -------------------------------------------------

    const paymentPages =
      await prisma.paymentPage.findMany({
        where: {
          userId,
        },

        orderBy: {
          createdAt: "desc",
        },

        include: {

          products: {
            include: {
              product: true,
            },
          },

          transactions: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

    // -------------------------------------------------
    // STATISTIQUES
    // -------------------------------------------------

    const totalPages =
      paymentPages.length;

    const activePages =
      paymentPages.filter(
        (page) => page.active
      ).length;

    const totalPayments =
      paymentPages.reduce(
        (total, page) =>
          total +
          page.transactions.length,
        0
      );

    const totalAmount =
      paymentPages.reduce(
        (total, page) =>
          total +
          page.transactions
            .filter(
              (transaction) =>
                transaction.status ===
                "SUCCESS"
            )
            .reduce(
              (sum, transaction) =>
                sum + transaction.amount,
              0
            ),
        0
      );

    // -------------------------------------------------
    // RÉPONSE
    // -------------------------------------------------

    return res.status(200).json({

      success: true,

      paymentPages,

      statistics: {
        totalPages,
        activePages,
        totalPayments,
        totalAmount,
      },

    });

  } catch (error) {

    console.error(
      "GET MY PAYMENT PAGES ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de récupérer les pages de paiement.",
    });
  }
};


/**
 * =====================================================
 * GET PAYMENT PAGE BY ID
 * =====================================================
 *
 * GET /api/payment-pages/:id
 */
export const getPaymentPageById = async (
  req: Request,
  res: Response
) => {
  try {

    // -------------------------------------------------
    // UTILISATEUR
    // -------------------------------------------------

    const userId = Number(
      (req as any).user?.id
    );

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Utilisateur non authentifié.",
      });
    }

    // -------------------------------------------------
    // ID
    // -------------------------------------------------

    const pageId = Number(
      req.params.id
    );

    if (
      !pageId ||
      Number.isNaN(pageId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ID de page invalide.",
      });
    }

    // -------------------------------------------------
    // RECHERCHE
    // -------------------------------------------------

    const paymentPage =
      await prisma.paymentPage.findFirst({

        where: {
          id: pageId,
          userId,
        },

        include: {

          products: {
            include: {
              product: true,
            },
          },

          transactions: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },

      });

    if (!paymentPage) {
      return res.status(404).json({
        success: false,
        message:
          "Page de paiement introuvable.",
      });
    }

    // -------------------------------------------------
    // RÉPONSE
    // -------------------------------------------------

    return res.status(200).json({

      success: true,

      paymentPage,

    });

  } catch (error) {

    console.error(
      "GET PAYMENT PAGE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de récupérer la page de paiement.",
    });
  }
};


/**
 * =====================================================
 * ACTIVATE PAYMENT PAGE
 * =====================================================
 *
 * PATCH /api/payment-pages/:id/activate
 */
export const activatePaymentPage = async (
  req: Request,
  res: Response
) => {
  try {

    // -------------------------------------------------
    // UTILISATEUR
    // -------------------------------------------------

    const userId = Number(
      (req as any).user?.id
    );

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Utilisateur non authentifié.",
      });
    }

    // -------------------------------------------------
    // ID
    // -------------------------------------------------

    const pageId = Number(
      req.params.id
    );

    if (
      !pageId ||
      Number.isNaN(pageId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ID de page invalide.",
      });
    }

    // -------------------------------------------------
    // PAGE
    // -------------------------------------------------

    const paymentPage =
      await prisma.paymentPage.findFirst({

        where: {
          id: pageId,
          userId,
        },

        include: {

          products: {
            include: {
              product: true,
            },
          },

        },

      });

    if (!paymentPage) {
      return res.status(404).json({
        success: false,
        message:
          "Page de paiement introuvable.",
      });
    }

    // -------------------------------------------------
    // VÉRIFIER QU'IL Y A UN PRODUIT
    // -------------------------------------------------

    if (
      !paymentPage.products ||
      paymentPage.products.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cette page de paiement n'est associée à aucun produit.",
      });
    }

    // -------------------------------------------------
    // VÉRIFIER LES PRODUITS
    // -------------------------------------------------

    for (
      const pageProduct
      of paymentPage.products
    ) {

      const product =
        pageProduct.product;

      if (!product) {
        continue;
      }

      // -----------------------------------------------
      // PRODUIT DÉSACTIVÉ
      // -----------------------------------------------

      if (
        product.status ===
        "DISABLED"
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Impossible d'activer la page : le produit "${product.name}" est désactivé.`,
        });
      }

      // -----------------------------------------------
      // PRODUIT EN BROUILLON
      // -----------------------------------------------

      if (
        product.status ===
        "DRAFT"
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Publiez d'abord le produit "${product.name}" avant d'activer la page de paiement.`,
        });
      }
    }

    // -------------------------------------------------
    // ACTIVATION
    // -------------------------------------------------

    const updatedPage =
      await prisma.paymentPage.update({

        where: {
          id: pageId,
        },

        data: {
          active: true,
        },

        include: {

          products: {
            include: {
              product: true,
            },
          },

          transactions: true,

        },

      });

    // -------------------------------------------------
    // RÉPONSE
    // -------------------------------------------------

    return res.status(200).json({

      success: true,

      message:
        "Page de paiement activée avec succès.",

      paymentPage:
        updatedPage,

      publicUrl:
        `/api/public/payment-pages/${updatedPage.slug}`,

    });

  } catch (error) {

    console.error(
      "ACTIVATE PAYMENT PAGE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible d'activer la page de paiement.",
    });
  }
};


/**
 * =====================================================
 * DEACTIVATE PAYMENT PAGE
 * =====================================================
 *
 * PATCH /api/payment-pages/:id/deactivate
 */
export const deactivatePaymentPage = async (
  req: Request,
  res: Response
) => {
  try {

    // -------------------------------------------------
    // UTILISATEUR
    // -------------------------------------------------

    const userId = Number(
      (req as any).user?.id
    );

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Utilisateur non authentifié.",
      });
    }

    // -------------------------------------------------
    // ID
    // -------------------------------------------------

    const pageId = Number(
      req.params.id
    );

    if (
      !pageId ||
      Number.isNaN(pageId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ID de page invalide.",
      });
    }

    // -------------------------------------------------
    // VÉRIFIER PAGE
    // -------------------------------------------------

    const paymentPage =
      await prisma.paymentPage.findFirst({

        where: {
          id: pageId,
          userId,
        },

      });

    if (!paymentPage) {
      return res.status(404).json({
        success: false,
        message:
          "Page de paiement introuvable.",
      });
    }

    // -------------------------------------------------
    // DÉSACTIVATION
    // -------------------------------------------------

    const updatedPage =
      await prisma.paymentPage.update({

        where: {
          id: pageId,
        },

        data: {
          active: false,
        },

        include: {

          products: {
            include: {
              product: true,
            },
          },

        },

      });

    // -------------------------------------------------
    // RÉPONSE
    // -------------------------------------------------

    return res.status(200).json({

      success: true,

      message:
        "Page de paiement désactivée.",

      paymentPage:
        updatedPage,

    });

  } catch (error) {

    console.error(
      "DEACTIVATE PAYMENT PAGE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de désactiver la page de paiement.",
    });
  }
};


/**
 * =====================================================
 * DELETE PAYMENT PAGE
 * =====================================================
 *
 * DELETE /api/payment-pages/:id
 */
export const deletePaymentPage = async (
  req: Request,
  res: Response
) => {
  try {

    // -------------------------------------------------
    // UTILISATEUR
    // -------------------------------------------------

    const userId = Number(
      (req as any).user?.id
    );

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Utilisateur non authentifié.",
      });
    }

    // -------------------------------------------------
    // ID
    // -------------------------------------------------

    const pageId = Number(
      req.params.id
    );

    if (
      !pageId ||
      Number.isNaN(pageId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ID de page invalide.",
      });
    }

    // -------------------------------------------------
    // VÉRIFIER PAGE
    // -------------------------------------------------

    const paymentPage =
      await prisma.paymentPage.findFirst({

        where: {
          id: pageId,
          userId,
        },

      });

    if (!paymentPage) {
      return res.status(404).json({
        success: false,
        message:
          "Page de paiement introuvable.",
      });
    }

    // -------------------------------------------------
    // VÉRIFIER TRANSACTIONS
    // -------------------------------------------------

    const transactionCount =
      await prisma.transaction.count({
        where: {
          paymentPageId: pageId,
        },
      });

    if (transactionCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cette page possède déjà des transactions et ne peut pas être supprimée.",
      });
    }

    // -------------------------------------------------
    // SUPPRIMER LES ASSOCIATIONS PRODUITS
    // -------------------------------------------------

    await prisma.paymentPageProduct.deleteMany({
      where: {
        paymentPageId: pageId,
      },
    });

    // -------------------------------------------------
    // SUPPRIMER LA PAGE
    // -------------------------------------------------

    await prisma.paymentPage.delete({
      where: {
        id: pageId,
      },
    });

    // -------------------------------------------------
    // RÉPONSE
    // -------------------------------------------------

    return res.status(200).json({

      success: true,

      message:
        "Page de paiement supprimée avec succès.",

    });

  } catch (error) {

    console.error(
      "DELETE PAYMENT PAGE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de supprimer la page de paiement.",
    });
  }
};
