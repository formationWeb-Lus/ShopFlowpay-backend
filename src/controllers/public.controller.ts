
import { Request, Response } from "express";
import {
  PrismaClient,
  ProductStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

/* =====================================================
   GET PUBLIC PAYMENT PAGE
   GET /api/public/payment-pages/:slug
===================================================== */

export const getPublicPaymentPage = async (
  req: Request,
  res: Response
) => {
  try {
    /* =================================================
       1. RÉCUPÉRER LE SLUG
    ================================================= */

    const rawSlug = req.params.slug;

    const slug = Array.isArray(rawSlug)
      ? rawSlug[0]
      : rawSlug;

    if (
      typeof slug !== "string" ||
      !slug.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Le slug est obligatoire.",
      });
    }

    const cleanSlug = slug.trim();

    /* =================================================
       2. RECHERCHER LA PAGE PUBLIQUE
       
       IMPORTANT :
       PaymentPage possède `products`
       et non `product`.

       products -> PaymentPageProduct[]
       products[].product -> Product
    ================================================= */

    const paymentPage =
      await prisma.paymentPage.findFirst({
        where: {
          slug: cleanSlug,
          active: true,

          products: {
            some: {
              product: {
                status: ProductStatus.PUBLISHED,
              },
            },
          },
        },

        include: {
          /* =============================================
             PRODUITS DE LA PAGE
          ============================================= */

          products: {
            include: {
              product: {
                include: {
                  /* =====================================
                     CHAMPS DU PRODUIT
                  ===================================== */

                  fields: {
                    orderBy: {
                      id: "asc",
                    },
                  },

                  /* =====================================
                     PROPRIÉTAIRE DU PRODUIT
                  ===================================== */

                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      phone: true,

                      /* ===============================
                         ENTREPRISE
                      =============================== */

                      company: {
                        select: {
                          id: true,
                          name: true,
                          logo: true,
                          address: true,
                          phone: true,
                          email: true,
                        },
                      },
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
        message:
          "Cette formation ou cette page de paiement n'est pas disponible.",
      });
    }

    /* =================================================
       4. VÉRIFIER LES PRODUITS
    ================================================= */

    if (
      !Array.isArray(paymentPage.products) ||
      paymentPage.products.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Aucun produit n'est associé à cette page de paiement.",
      });
    }

    /* =================================================
       5. RÉCUPÉRER LE PRODUIT PUBLIÉ
    ================================================= */

    const paymentPageProduct =
      paymentPage.products.find(
        (item) =>
          item.product.status ===
          ProductStatus.PUBLISHED
      );

    if (!paymentPageProduct) {
      return res.status(404).json({
        success: false,
        message:
          "Le produit associé à cette page n'est pas disponible.",
      });
    }

    const product =
      paymentPageProduct.product;

    /* =================================================
       6. RÉCUPÉRER LE PROPRIÉTAIRE
    ================================================= */

    const instructor =
      product.user;

    /* =================================================
       7. RÉCUPÉRER L'ENTREPRISE
    ================================================= */

    const company =
      instructor?.company ?? null;

    /* =================================================
       8. RÉPONSE PUBLIQUE
    ================================================= */

    return res.status(200).json({
      success: true,

      /* ===============================================
         PAGE DE PAIEMENT
      =============================================== */

      paymentPage: {
        id:
          paymentPage.id,

        title:
          paymentPage.title,

        slug:
          paymentPage.slug,

        description:
          paymentPage.description,

        active:
          paymentPage.active,

        createdAt:
          paymentPage.createdAt,
      },

      /* ===============================================
         PRODUIT
      =============================================== */

      product: {
        id:
          product.id,

        name:
          product.name,

        subtitle:
          product.subtitle,

        description:
          product.description,

        type:
          product.type,

        price:
          product.price,

        currency:
          product.currency,

        imageUrl:
          product.imageUrl,

        status:
          product.status,

        fields:
          product.fields,
      },

      /* ===============================================
         FORMATEUR / PROPRIÉTAIRE
      =============================================== */

      instructor: instructor
        ? {
            id:
              instructor.id,

            name:
              instructor.name,

            email:
              instructor.email,

            phone:
              instructor.phone,
          }
        : null,

      /* ===============================================
         ENTREPRISE
      =============================================== */

      company: company
        ? {
            id:
              company.id,

            name:
              company.name,

            logo:
              company.logo,

            address:
              company.address,

            phone:
              company.phone,

            email:
              company.email,
          }
        : null,
    });
  } catch (error: unknown) {
    /* =================================================
       ERREUR
    ================================================= */

    console.error(
      "================================="
    );

    console.error(
      "❌ GET PUBLIC PAYMENT PAGE ERROR"
    );

    console.error(
      "================================="
    );

    console.error(error);

    return res.status(500).json({
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Impossible de récupérer la page de paiement.",

      error:
        process.env.NODE_ENV !==
        "production"
          ? error instanceof Error
            ? error.stack
            : undefined
          : undefined,
    });
  }
};
