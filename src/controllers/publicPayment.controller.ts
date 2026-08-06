import {
  Request,
  Response as ExpressResponse,
} from "express";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * =====================================================
 * TYPES / HELPERS
 * =====================================================
 */

const unavailableStatuses = ["DRAFT", "DISABLED"];

/**
 * =====================================================
 * GET PUBLIC PAYMENT PAGES
 * =====================================================
 *
 * GET /api/public/payment-pages
 *
 * Retourne les pages actives avec leurs produits
 * disponibles.
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

    const paymentPages =
      await prisma.paymentPage.findMany({
        where: {
          active: true,

          products: {
            some: {
              status: {
                notIn: unavailableStatuses as any,
              },
            },
          },
        },

        include: {
          products: {
            where: {
              status: {
                notIn: unavailableStatuses as any,
              },
            },

            include: {
              fields: {
                orderBy: {
                  id: "asc",
                },
              },

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

        orderBy: {
          createdAt: "desc",
        },
      });

    console.log(
      "Pages publiques disponibles :",
      paymentPages.length
    );

    return res.status(200).json({
      success: true,

      paymentPages: paymentPages.map(
        (page) => {
          /**
           * Une PaymentPage peut avoir plusieurs produits.
           *
           * Pour cette réponse publique, on prend
           * le premier produit disponible.
           */
          const product =
            page.products?.[0] ?? null;

          return {
            paymentPage: {
              id: page.id,
              title: page.title,
              slug: page.slug,
              description: page.description,
              active: page.active,
              createdAt: page.createdAt,
            },

            product: product
              ? {
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

                  fields:
                    product.fields.map(
                      (field) => ({
                        id: field.id,
                        name: field.name,
                        label: field.label,
                        type: field.type,
                        required:
                          field.required,
                        value: field.value,
                      })
                    ),
                }
              : null,

            instructor:
              product?.user
                ? {
                    id: product.user.id,
                    name: product.user.name,
                    email:
                      product.user.email,
                    phone:
                      product.user.phone,
                  }
                : null,

            company:
              product?.user?.company
                ? {
                    id:
                      product.user.company
                        .id,
                    name:
                      product.user.company
                        .name,
                    logo:
                      product.user.company
                        .logo,
                    address:
                      product.user.company
                        .address,
                    phone:
                      product.user.company
                        .phone,
                    email:
                      product.user.company
                        .email,
                  }
                : null,
          };
        }
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
        "Impossible de récupérer les pages de paiement publiques.",
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
 * /api/public/payment-pages/formation-web
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

    if (
      typeof slugParam !== "string" ||
      !slugParam.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Le slug de la page de paiement est invalide.",
      });
    }

    const slug = slugParam.trim();

    console.log(
      "Recherche de la page publique :",
      slug
    );

    // =================================================
    // RECHERCHER LA PAGE
    // =================================================
    //
    // IMPORTANT :
    //
    // PaymentPage possède "products"
    // et NON "product".
    //
    // =================================================

    const paymentPage =
      await prisma.paymentPage.findUnique({
        where: {
          slug,
        },

        include: {
          products: {
            where: {
              status: {
                notIn:
                  unavailableStatuses as any,
              },
            },

            include: {
              fields: {
                orderBy: {
                  id: "asc",
                },
              },

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
      console.log(
        "Page introuvable :",
        slug
      );

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
      console.log(
        "Page inactive :",
        slug
      );

      return res.status(404).json({
        success: false,
        message:
          "Cette page de paiement n'est plus disponible.",
      });
    }

    // =================================================
    // PRODUIT
    // =================================================
    //
    // PaymentPage -> products[]
    //
    // On récupère le premier produit disponible.
    //
    // =================================================

    const product =
      paymentPage.products?.[0] ?? null;

    if (!product) {
      console.log(
        "Aucun produit disponible pour la page :",
        slug
      );

      return res.status(404).json({
        success: false,
        message:
          "Aucun produit disponible pour cette page de paiement.",
      });
    }

    // =================================================
    // SÉCURITÉ SUPPLÉMENTAIRE
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
    // CHAMPS
    // =================================================

    const fields =
      product.fields ?? [];

    console.log(
      "Produit :",
      product.name
    );

    console.log(
      "Produit ID :",
      product.id
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
      product.user ?? null;

    // =================================================
    // ENTREPRISE
    // =================================================

    const company =
      instructor?.company ?? null;

    // =================================================
    // RÉPONSE
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
        description:
          paymentPage.description,
        active: paymentPage.active,
        createdAt:
          paymentPage.createdAt,
      },

      // =================================================
      // PRODUIT
      // =================================================

      product: {
        id: product.id,

        name: product.name,

        subtitle:
          product.subtitle,

        description:
          product.description,

        type: product.type,

        price: product.price,

        currency:
          product.currency,

        imageUrl:
          product.imageUrl,

        status:
          product.status,

        createdAt:
          product.createdAt,

        fields: fields.map(
          (field) => ({
            id: field.id,

            name: field.name,

            label: field.label,

            type: field.type,

            required:
              field.required,

            value:
              field.value,
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

            email:
              instructor.email,

            phone:
              instructor.phone,
          }
        : null,

      // =================================================
      // ENTREPRISE
      // =================================================

      company: company
        ? {
            id: company.id,

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

      // =================================================
      // CHAMPS
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
        process.env.NODE_ENV !==
        "production"
          ? error?.message
          : undefined,
    });
  }
};