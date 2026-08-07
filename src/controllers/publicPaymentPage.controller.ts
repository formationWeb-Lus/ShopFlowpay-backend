
import { Request, Response } from "express";
import {
  PrismaClient,
  ProductStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

/* =====================================================
   GET PUBLIC PAYMENT PAGE

   GET /api/public/payment-pages/:slug

   Exemple :
   /api/public/payment-pages/formation-web

   Structure :

   PaymentPage
        ↓
   PaymentPageProduct
        ↓
      Product
        ↓
       User
        ↓
     Company

   Cette route retourne UN SEUL produit publié.
===================================================== */

export const getPublicPaymentPage = async (
  req: Request,
  res: Response
) => {
  try {
    const { slug } = req.params;

    /* =================================================
       1. VERIFIER LE SLUG
    ================================================= */

    if (!slug || typeof slug !== "string") {
      return res.status(400).json({
        success: false,
        message: "Le slug est obligatoire.",
      });
    }

    /* =================================================
       2. RECUPERER LA PAYMENT PAGE
    ================================================= */

    const paymentPage =
      await prisma.paymentPage.findUnique({
        where: {
          slug,
        },

        include: {
          products: {
            orderBy: {
              createdAt: "asc",
            },

            include: {
              product: {
                include: {
                  fields: true,

                  user: {
                    include: {
                      company: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

    /* =================================================
       3. PAGE INTROUVABLE
    ================================================= */

    if (!paymentPage) {
      return res.status(404).json({
        success: false,
        message: "Page publique introuvable.",
      });
    }

    /* =================================================
       4. PAGE DESACTIVEE
    ================================================= */

    if (!paymentPage.active) {
      return res.status(404).json({
        success: false,
        message:
          "Cette page publique n'est plus disponible.",
      });
    }

    /* =================================================
       5. TROUVER LE PREMIER PRODUIT PUBLIE
    ================================================= */

    const paymentPageProduct =
      paymentPage.products.find(
        (item) =>
          item.product &&
          item.product.status ===
            ProductStatus.PUBLISHED
      );

    /* =================================================
       6. AUCUN PRODUIT PUBLIE
    ================================================= */

    if (!paymentPageProduct) {
      return res.status(404).json({
        success: false,
        message:
          "Aucun produit publié n'est associé à cette page.",
      });
    }

    const product =
      paymentPageProduct.product;

    /* =================================================
       7. INSTRUCTEUR

       Dans ton schema :
       Product → User

       On utilise donc le propriétaire du produit
       comme instructeur.
    ================================================= */

    const instructor =
      product.user
        ? {
            id: product.user.id,
            name: product.user.name,
            email: product.user.email,
            phone: product.user.phone,
          }
        : null;

    /* =================================================
       8. ENTREPRISE

       Dans ton schema :
       Product → User → Company
    ================================================= */

    const company =
      product.user?.company
        ? {
            id: product.user.company.id,
            name: product.user.company.name,
            logo: product.user.company.logo,
            address: product.user.company.address,
            phone: product.user.company.phone,
            email: product.user.company.email,
          }
        : null;

    /* =================================================
       9. REPONSE
    ================================================= */

    return res.status(200).json({
      success: true,

      /* ===============================================
         PAYMENT PAGE
      =============================================== */

      paymentPage: {
        id: paymentPage.id,
        title: paymentPage.title,
        slug: paymentPage.slug,
        description: paymentPage.description,
        active: paymentPage.active,
        createdAt: paymentPage.createdAt,
      },

      /* ===============================================
         PRODUIT
      =============================================== */

      product: {
        id: product.id,
        userId: product.userId,

        name: product.name,
        subtitle: product.subtitle,
        description: product.description,

        type: product.type,

        price: product.price,
        currency: product.currency,

        imageUrl: product.imageUrl,

        status: product.status,

        createdAt: product.createdAt,

        /* ============================================
           LIEN PUBLIC
        ============================================ */

        paymentUrl:
          `/p/${paymentPage.slug}?product=${product.id}`,

        /* ============================================
           CHAMPS PERSONNALISES
        ============================================ */

        fields: product.fields ?? [],
      },

      /* ===============================================
         INSTRUCTEUR
      =============================================== */

      instructor,

      /* ===============================================
         ENTREPRISE
      =============================================== */

      company,
    });
  } catch (error) {
    console.error(
      "❌ GET PUBLIC PAYMENT PAGE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Une erreur est survenue lors du chargement de la page publique.",
    });
  }
};
