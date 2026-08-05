import {
  Request,
  Response as ExpressResponse,
} from "express";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * =====================================================
 * GET PUBLIC PAYMENT PAGES
 * =====================================================
 *
 * GET /api/public/payment-pages
 *
 * Retourne uniquement les pages de paiement actives
 * et les produits disponibles.
 *
 */
export const getPublicPaymentPages = async (
  req: Request,
  res: ExpressResponse
) => {
  try {
    console.log(
      "================ PUBLIC PAYMENT PAGES ================"
    );

    const allPaymentPages =
      await prisma.paymentPage.findMany({
        where: {
          active: true,

          product: {
            status: {
              notIn: ["DRAFT", "DISABLED"],
            },
          },
        },

        include: {
          product: {
            include: {
              fields: {
                orderBy: {
                  id: "asc",
                },
              },
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    console.log(
      "Pages publiques disponibles :",
      allPaymentPages.length
    );

    return res.status(200).json({
      success: true,

      paymentPages: allPaymentPages.map(
        (page) => ({
          paymentPage: {
            id: page.id,
            title: page.title,
            slug: page.slug,
            description: page.description,
            active: page.active,
            createdAt: page.createdAt,
          },

          product: page.product
            ? {
                id: page.product.id,
                name: page.product.name,
                subtitle: page.product.subtitle,
                description: page.product.description,
                type: page.product.type,
                price: page.product.price,
                currency: page.product.currency,
                imageUrl: page.product.imageUrl,
                status: page.product.status,
                createdAt: page.product.createdAt,

                // IMPORTANT :
                // Les champs appartiennent uniquement
                // à ce produit.
                fields: page.product.fields.map(
                  (field) => ({
                    id: field.id,
                    name: field.name,
                    label: field.label,
                    type: field.type,
                    required: field.required,
                    value: field.value,
                  })
                ),
              }
            : null,
        })
      ),
    });

  } catch (error) {
    console.error(
      "GET PUBLIC PAYMENT PAGES ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Impossible de récupérer les produits disponibles.",
    });
  }
};


/**
 * =====================================================
 * GET PUBLIC PAYMENT PAGE
 * =====================================================
 *
 * GET /api/public/payment-pages/:slug
 *
 * Exemple :
 *
 * /api/public/payment-pages/formation
 *
 */
export const getPublicPaymentPage = async (
  req: Request,
  res: ExpressResponse
) => {
  try {
    // =================================================
    // SLUG
    // =================================================

    const slugParam = req.params.slug;

    if (typeof slugParam !== "string") {
      return res.status(400).json({
        success: false,
        message:
          "Slug de la page de paiement invalide.",
      });
    }

    const slug = slugParam.trim();

    if (!slug) {
      return res.status(400).json({
        success: false,
        message:
          "Le slug est obligatoire.",
      });
    }

    console.log(
      "Recherche de la page publique :",
      slug
    );

    // =================================================
    // RECHERCHER LA PAGE
    // =================================================

    const paymentPage =
      await prisma.paymentPage.findUnique({
        where: {
          slug,
        },

        include: {
          product: {
            include: {
              // =======================================
              // UNIQUEMENT LES CHAMPS DE CE PRODUIT
              // =======================================

              fields: {
                orderBy: {
                  id: "asc",
                },
              },

              // =======================================
              // FORMATEUR
              // =======================================

              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,

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

    // =================================================
    // PAGE INTROUVABLE
    // =================================================

    if (!paymentPage) {
      return res.status(404).json({
        success: false,
        message:
          "Page de paiement introuvable.",
      });
    }

    // =================================================
    // PAGE INACTIVE
    // =================================================

    if (!paymentPage.active) {
      return res.status(404).json({
        success: false,
        message:
          "Cette page de paiement n'est plus disponible.",
      });
    }

    // =================================================
    // PRODUIT
    // =================================================

    const product =
      paymentPage.product;

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Produit associé introuvable.",
      });
    }

    // =================================================
    // PRODUIT NON DISPONIBLE
    // =================================================

    if (
      product.status === "DISABLED" ||
      product.status === "DRAFT"
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Ce produit n'est pas disponible à la vente.",
      });
    }

    // =================================================
    // CHAMPS DU PRODUIT
    // =================================================

    const fields = product.fields || [];

    console.log(
      "Produit :",
      product.name
    );

    console.log(
      "Type :",
      product.type
    );

    console.log(
      "Nombre de champs :",
      fields.length
    );

    // =================================================
    // FORMATEUR
    // =================================================

    const instructor =
      product.user;

    // =================================================
    // ENTREPRISE / ÉCOLE
    // =================================================

    const company =
      instructor?.company || null;

    // =================================================
    // RÉPONSE PUBLIQUE
    // =================================================

    return res.status(200).json({
      success: true,

      // =================================================
      // PAYMENT PAGE
      // =================================================

      paymentPage: {
        id: paymentPage.id,
        title: paymentPage.title,
        slug: paymentPage.slug,
        description: paymentPage.description,
        active: paymentPage.active,
        createdAt: paymentPage.createdAt,
      },

      // =================================================
      // PRODUIT
      // =================================================

      product: {
        id: product.id,
        name: product.name,
        subtitle: product.subtitle,
        description: product.description,

        type: product.type,

        price: product.price,
        currency: product.currency,

        imageUrl: product.imageUrl,

        status: product.status,

        createdAt: product.createdAt,

        // =================================================
        // CHAMPS PROPRES À CE PRODUIT
        // =================================================

        fields: fields.map(
          (field) => ({
            id: field.id,

            name: field.name,

            label: field.label,

            type: field.type,

            required: field.required,

            value: field.value,
          })
        ),
      },

      // =================================================
      // FORMATEUR
      // =================================================

      instructor: instructor
        ? {
            id: instructor.id,
            name: instructor.name,
            email: instructor.email,
            phone: instructor.phone,
          }
        : null,

      // =================================================
      // ÉTABLISSEMENT / ÉCOLE
      // =================================================

      company: company
        ? {
            id: company.id,
            name: company.name,
            logo: company.logo,
            address: company.address,
            phone: company.phone,
            email: company.email,
          }
        : null,

      // =================================================
      // INDICATEUR IMPORTANT
      // =================================================

      requiresFields:
        fields.length > 0,
    });

  } catch (error: any) {
    console.error(
      "GET PUBLIC PAYMENT PAGE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Impossible de récupérer la page de paiement.",

      error:
        process.env.NODE_ENV !== "production"
          ? error?.message
          : undefined,
    });
  }
};