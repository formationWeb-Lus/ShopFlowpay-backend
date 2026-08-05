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
    ================================================= */

    const paymentPage =
      await prisma.paymentPage.findFirst({
        where: {
          slug: cleanSlug,

          active: true,

          product: {
            status: ProductStatus.PUBLISHED,
          },
        },

        include: {
          /* =============================================
             PRODUIT
          ============================================= */

          product: {
            include: {
              /* =========================================
                 CHAMPS D'INSCRIPTION
              ========================================= */

              fields: {
                orderBy: {
                  id: "asc",
                },
              },

              /* =========================================
                 FORMATEUR / PROPRIÉTAIRE
              ========================================= */

              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,

                  /* =====================================
                     ÉCOLE / ENTREPRISE
                  ===================================== */

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
       4. RÉCUPÉRER LE PRODUIT
    ================================================= */

    const product =
      paymentPage.product;

    /* =================================================
       5. RÉCUPÉRER LE FORMATEUR
    ================================================= */

    const instructor =
      product.user;

    /* =================================================
       6. RÉCUPÉRER L'ÉCOLE / ENTREPRISE
    ================================================= */

    const company =
      instructor.company;

    /* =================================================
       7. RÉPONSE PUBLIQUE
    ================================================= */

    return res.status(200).json({
      success: true,

      /* ===============================================
         PAGE DE PAIEMENT
      =============================================== */

      paymentPage: {
        id: paymentPage.id,

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
         FORMATION / PRODUIT
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

        /* Champs d'inscription */
        fields:
          product.fields,
      },

      /* ===============================================
         FORMATEUR
      =============================================== */

      instructor: {
        id:
          instructor.id,

        name:
          instructor.name,

        email:
          instructor.email,

        phone:
          instructor.phone,
      },

      /* ===============================================
         ÉCOLE / ENTREPRISE
      =============================================== */

      company:
        company
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
  } catch (error: any) {
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
        error?.message ||
        "Impossible de récupérer la page de paiement.",

      error:
        process.env.NODE_ENV !==
        "production"
          ? error?.stack
          : undefined,
    });
  }
};