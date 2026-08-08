
import { Request, Response } from "express";

import {
  PrismaClient,
  ProductStatus,
  PaymentStatus,
  Currency,
  Telecom,
} from "@prisma/client";

import {
  processSerdiPayPayment,
} from "../services/serdipay.service";


// =====================================================
// PRISMA
// =====================================================

const prisma = new PrismaClient();


// =====================================================
// STATUT PRODUIT DISPONIBLE PUBLIQUEMENT
// =====================================================

const AVAILABLE_STATUS: ProductStatus =
  ProductStatus.PUBLISHED;


// =====================================================
// GET PUBLIC PAYMENT PAGES
// =====================================================
//
// GET /api/public/payment-pages
//
// Retourne toutes les pages publiques actives
// avec leurs produits publiés.
//
// Aucun token nécessaire.
//
// =====================================================

export const getPublicPaymentPages = async (
  req: Request,
  res: Response
) => {
  try {
    console.log(
      "================ PUBLIC PAYMENT PAGES ================"
    );


    // =================================================
    // RÉCUPÉRER LES PAGES
    // =================================================

    const paymentPages =
      await prisma.paymentPage.findMany({

        where: {
          active: true,
        },

        include: {

          products: {

            include: {

              product: {

                include: {

                  // ===================================
                  // CHAMPS DU PRODUIT
                  // ===================================

                  fields: {
                    orderBy: {
                      id: "asc",
                    },
                  },


                  // ===================================
                  // PROPRIÉTAIRE DU PRODUIT
                  // ===================================

                  user: {

                    select: {

                      id: true,

                      name: true,

                      email: true,

                      phone: true,


                      // ===============================
                      // ENTREPRISE
                      // ===============================

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

        orderBy: {
          createdAt: "desc",
        },

      });


    // =================================================
    // FORMATER LES PAGES
    // =================================================

    const pages =
      paymentPages

        .map((page) => {

          // ===========================================
          // RÉCUPÉRER UNIQUEMENT LES PRODUITS PUBLIÉS
          // ===========================================

          const products =
            page.products

              .map(
                (item) =>
                  item.product
              )

              .filter(
                (product) =>
                  product.status ===
                  AVAILABLE_STATUS
              );


          // ===========================================
          // SI AUCUN PRODUIT PUBLIÉ
          // ===========================================

          if (
            products.length === 0
          ) {
            return null;
          }


          // ===========================================
          // RETOUR PAGE
          // ===========================================

          return {

            id:
              page.id,

            title:
              page.title,

            slug:
              page.slug,

            description:
              page.description,

            active:
              page.active,

            createdAt:
              page.createdAt,

            totalProducts:
              products.length,


            // =========================================
            // PRODUITS
            // =========================================

            products:
              products.map(
                (product) => ({

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

                  createdAt:
                    product.createdAt,


                  // ================================
                  // URL PAIEMENT
                  // ================================

                  paymentUrl:
                    `/p/${page.slug}?product=${product.id}`,


                  // ================================
                  // CHAMPS
                  // ================================

                  fields:
                    product.fields.map(
                      (field) => ({

                        id:
                          field.id,

                        name:
                          field.name,

                        label:
                          field.label,

                        type:
                          field.type,

                        required:
                          field.required,

                        value:
                          field.value,

                      })
                    ),


                  // ================================
                  // FORMATEUR / PROPRIÉTAIRE
                  // ================================

                  instructor: {

                    id:
                      product.user.id,

                    name:
                      product.user.name,

                    email:
                      product.user.email,

                    phone:
                      product.user.phone,

                  },


                  // ================================
                  // ENTREPRISE
                  // ================================

                  company:
                    product.user.company
                      ? {

                          id:
                            product
                              .user
                              .company
                              .id,

                          name:
                            product
                              .user
                              .company
                              .name,

                          logo:
                            product
                              .user
                              .company
                              .logo,

                          address:
                            product
                              .user
                              .company
                              .address,

                          phone:
                            product
                              .user
                              .company
                              .phone,

                          email:
                            product
                              .user
                              .company
                              .email,

                        }

                      : null,

                })
              ),

          };

        })

        .filter(
          (
            page
          ): page is NonNullable<
            typeof page
          > =>
            page !== null
        );


    // =================================================
    // LOG
    // =================================================

    console.log(
      `Pages publiques : ${pages.length}`
    );


    // =================================================
    // RÉPONSE
    // =================================================

    return res.status(200).json({

      success:
        true,

      total:
        pages.length,

      paymentPages:
        pages,

    });

  } catch (error: unknown) {

    console.error(
      "GET PUBLIC PAYMENT PAGES ERROR:",
      error
    );


    return res.status(500).json({

      success:
        false,

      message:
        "Impossible de récupérer les pages publiques.",

    });

  }
};



// =====================================================
// CREATE PUBLIC PAYMENT
// =====================================================
//
// POST /api/public/payments
//
// Aucun token nécessaire.
//
// Flux :
//
// 1. Validation
// 2. Recherche produit
// 3. Vérification produit publié
// 4. Recherche/création client
// 5. Création paiement PENDING
// 6. Appel SerdiPay
// 7. Mise à jour transactionId/sessionId
// 8. Mise à jour statut
// 9. Réponse frontend
//
// =====================================================

export const createPublicPayment = async (
  req: Request,
  res: Response
) => {

  try {

    const {
      productId,
      phone,
      telecom,
      currency,
      amount,
      customer: customerInfo,
      fields,
    } = req.body;


    // =================================================
    // INFORMATIONS CLIENT
    // =================================================

    const name =
      customerInfo?.name ||
      "Client";

    const email =
      customerInfo?.email ||
      null;


    // =================================================
    // VALIDATION DE BASE
    // =================================================

    if (
      !productId ||
      !phone ||
      !telecom ||
      !currency ||
      amount === undefined ||
      amount === null ||
      amount === ""
    ) {

      return res.status(400).json({

        success:
          false,

        message:
          "Informations de paiement manquantes.",

      });

    }


    // =================================================
    // NORMALISATION
    // =================================================

    const numericProductId =
      Number(productId);

    const numericAmount =
      Number(amount);

    const normalizedPhone =
      String(phone)
        .trim();

    const normalizedTelecom =
      String(telecom)
        .trim()
        .toUpperCase();

    const normalizedCurrency =
      String(currency)
        .trim()
        .toUpperCase();


    // =================================================
    // VALIDATION PRODUIT ID
    // =================================================

    if (
      !Number.isInteger(
        numericProductId
      ) ||
      numericProductId <= 0
    ) {

      return res.status(400).json({

        success:
          false,

        message:
          "Produit invalide.",

      });

    }


    // =================================================
    // VALIDATION MONTANT
    // =================================================

    if (
      !Number.isFinite(
        numericAmount
      ) ||
      numericAmount <= 0
    ) {

      return res.status(400).json({

        success:
          false,

        message:
          "Montant invalide.",

      });

    }


    // =================================================
    // VALIDATION TÉLÉPHONE
    // =================================================

    if (
      !normalizedPhone
    ) {

      return res.status(400).json({

        success:
          false,

        message:
          "Numéro de téléphone invalide.",

      });

    }


    // =================================================
    // VALIDATION ENUM CURRENCY
    // =================================================
    //
    // Prisma attend :
    //
    // Currency.USD
    // Currency.CDF
    //
    // et non un simple string.
    //
    // =================================================

    if (
      !Object.values(
        Currency
      ).includes(
        normalizedCurrency as Currency
      )
    ) {

      return res.status(400).json({

        success:
          false,

        message:
          "Devise de paiement invalide.",

      });

    }


    // =================================================
    // VALIDATION ENUM TELECOM
    // =================================================
    //
    // Prisma attend :
    //
    // Telecom.AM
    // Telecom.OM
    // Telecom.MP
    // Telecom.AF
    //
    // =================================================

    if (
      !Object.values(
        Telecom
      ).includes(
        normalizedTelecom as Telecom
      )
    ) {

      return res.status(400).json({

        success:
          false,

        message:
          "Opérateur de paiement invalide.",

      });

    }


    // =================================================
    // VALEURS PRISMA VALIDÉES
    // =================================================

    const paymentCurrency =
      normalizedCurrency as Currency;

    const paymentTelecom =
      normalizedTelecom as Telecom;


    // =================================================
    // RECHERCHER LE PRODUIT
    // =================================================

    const product =
      await prisma.product.findUnique({

        where: {

          id:
            numericProductId,

        },

        include: {

          user:
            true,

        },

      });


    // =================================================
    // PRODUIT INTROUVABLE
    // =================================================

    if (!product) {

      return res.status(404).json({

        success:
          false,

        message:
          "Produit introuvable.",

      });

    }


    // =================================================
    // VÉRIFIER PRODUIT PUBLIÉ
    // =================================================

    if (
      product.status !==
      ProductStatus.PUBLISHED
    ) {

      return res.status(400).json({

        success:
          false,

        message:
          "Ce produit n'est pas disponible.",

      });

    }


    // =================================================
    // VÉRIFIER LE PRIX
    // =================================================

    const productPrice =
      Number(product.price);


    if (
      Number.isFinite(
        productPrice
      ) &&
      productPrice > 0 &&
      numericAmount !==
        productPrice
    ) {

      return res.status(400).json({

        success:
          false,

        message:
          "Le montant du paiement ne correspond pas au prix du produit.",

      });

    }


    // =================================================
    // RECHERCHER CLIENT
    // =================================================

    let customer =
      await prisma.customer.findFirst({

        where: {

          phone:
            normalizedPhone,

        },

      });


    // =================================================
    // CRÉER CLIENT
    // =================================================

    if (!customer) {

      customer =
        await prisma.customer.create({

          data: {

            userId:
              product.userId,

            name:
              name ||
              "Client",

            email:
              email,

            phone:
              normalizedPhone,

          },

        });

    } else {

      // ===============================================
      // METTRE À JOUR CLIENT EXISTANT
      // ===============================================

      customer =
        await prisma.customer.update({

          where: {

            id:
              customer.id,

          },

          data: {

            name:
              name ||
              customer.name,

            email:
              email ||
              customer.email,

          },

        });

    }


    // =================================================
    // CRÉER PAIEMENT PENDING
    // =================================================

    const payment =
      await prisma.payment.create({

        data: {

          userId:
            product.userId,

          customerId:
            customer.id,

          amount:
            numericAmount,

          // ===========================================
          // IMPORTANT :
          // Prisma reçoit Currency
          // ===========================================

          currency:
            paymentCurrency,

          // ===========================================
          // IMPORTANT :
          // Prisma reçoit Telecom
          // ===========================================

          telecom:
            paymentTelecom,

          phone:
            normalizedPhone,

          status:
            PaymentStatus.PENDING,

        },

      });


    // =================================================
    // ENVOYER À SERDIPAY
    // =================================================
    //
    // IMPORTANT :
    //
    // NE PAS mettre ici :
    //
    // api_id
    // api_password
    // merchantCode
    // merchant_pin
    //
    // Ces informations sont déjà récupérées
    // dans serdipay.service.ts depuis .env.
    //
    // =================================================

    const serdiResult =
      await processSerdiPayPayment({

        clientPhone:
          normalizedPhone,

        amount:
          numericAmount,

        currency:
          paymentCurrency,

        telecom:
          paymentTelecom,

      });


    // =================================================
    // DÉTERMINER LE STATUT LOCAL
    // =================================================

    let finalStatus:
      PaymentStatus =
      PaymentStatus.PENDING;


    // =================================================
    // SUCCESS
    // =================================================

    if (
      serdiResult.status ===
      "success"
    ) {

      finalStatus =
        PaymentStatus.SUCCESS;

    }


    // =================================================
    // FAILED
    // =================================================

    if (
      serdiResult.status ===
      "failed"
    ) {

      finalStatus =
        PaymentStatus.FAILED;

    }


    // =================================================
    // METTRE À JOUR LE PAIEMENT
    // =================================================

    const updatedPayment =
      await prisma.payment.update({

        where: {

          id:
            payment.id,

        },

        data: {

          sessionId:
            serdiResult.sessionId,

          transactionId:
            serdiResult.transactionId,

          status:
            finalStatus,

        },

      });


    // =================================================
    // RÉPONSE
    // =================================================

    return res.status(

      serdiResult.status ===
      "failed"
        ? 400
        : 200

    ).json({

      success:
        serdiResult.status !==
        "failed",

      message:
        serdiResult.message,

      paymentId:
        updatedPayment.id,

      transactionId:
        updatedPayment.transactionId,

      sessionId:
        updatedPayment.sessionId,

      status:
        updatedPayment.status,


      // ===============================================
      // PRODUIT
      // ===============================================

      product: {

        id:
          product.id,

        name:
          product.name,

        price:
          product.price,

        currency:
          product.currency,

        imageUrl:
          product.imageUrl,

      },


      // ===============================================
      // CLIENT
      // ===============================================

      customer: {

        id:
          customer.id,

        name:
          customer.name,

        email:
          customer.email,

        phone:
          customer.phone,

      },


      // ===============================================
      // RÉPONSE SERDIPAY
      // ===============================================

      data:
        serdiResult,

    });

  } catch (error: unknown) {

    console.error(
      "================================="
    );

    console.error(
      "CREATE PUBLIC PAYMENT ERROR"
    );

    console.error(
      "================================="
    );

    console.error(
      error
    );


    return res.status(500).json({

      success:
        false,

      message:
        "Erreur pendant le paiement.",

      error:
        process.env.NODE_ENV !==
        "production"

          ? error instanceof Error
            ? error.message
            : String(error)

          : undefined,

    });

  }

};



// =====================================================
// GET PUBLIC PAYMENT PAGE
// =====================================================
//
// GET /api/public/payment-pages/:slug
//
// Retourne :
//
// - page publique
// - produits publiés
// - champs
// - formateur
// - entreprise
//
// =====================================================

export const getPublicPaymentPage =
  async (
    req: Request,
    res: Response
  ) => {

    try {

      // =================================================
      // RÉCUPÉRER SLUG
      // =================================================

      const rawSlug =
        req.params.slug;


      const slug =
        Array.isArray(
          rawSlug
        )
          ? rawSlug[0]
          : rawSlug;


      // =================================================
      // VALIDATION SLUG
      // =================================================

      if (
        typeof slug !==
          "string" ||
        !slug.trim()
      ) {

        return res.status(400).json({

          success:
            false,

          message:
            "Le slug est obligatoire.",

        });

      }


      const cleanSlug =
        slug.trim();


      console.log(
        `Recherche de la page publique : ${cleanSlug}`
      );


      // =================================================
      // RECHERCHER PAGE
      // =================================================

      const paymentPage =
        await prisma.paymentPage.findUnique({

          where: {

            slug:
              cleanSlug,

          },

          include: {

            products: {

              include: {

                product: {

                  include: {

                    // =================================
                    // CHAMPS
                    // =================================

                    fields: {

                      orderBy: {

                        id:
                          "asc",

                      },

                    },


                    // =================================
                    // PROPRIÉTAIRE
                    // =================================

                    user: {

                      select: {

                        id:
                          true,

                        name:
                          true,

                        email:
                          true,

                        phone:
                          true,


                        // =============================
                        // ENTREPRISE
                        // =============================

                        company: {

                          select: {

                            id:
                              true,

                            name:
                              true,

                            logo:
                              true,

                            address:
                              true,

                            phone:
                              true,

                            email:
                              true,

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


      // =================================================
      // PAGE INTROUVABLE
      // =================================================

      if (!paymentPage) {

        return res.status(404).json({

          success:
            false,

          message:
            "Page publique introuvable.",

        });

      }


      // =================================================
      // PAGE DÉSACTIVÉE
      // =================================================

      if (
        !paymentPage.active
      ) {

        return res.status(404).json({

          success:
            false,

          message:
            "Cette page publique n'est plus disponible.",

        });

      }


      // =================================================
      // PRODUITS PUBLIÉS
      // =================================================

      const products =
        paymentPage.products

          .map(
            (item) =>
              item.product
          )

          .filter(
            (product) =>
              product.status ===
              ProductStatus.PUBLISHED
          );


      // =================================================
      // AUCUN PRODUIT
      // =================================================

      if (
        products.length === 0
      ) {

        return res.status(404).json({

          success:
            false,

          message:
            "Aucun produit publié sur cette page.",

        });

      }


      // =================================================
      // FORMATER PRODUITS
      // =================================================

      const formattedProducts =
        products.map(
          (product) => ({

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

            createdAt:
              product.createdAt,


            // =========================================
            // URL DE PAIEMENT
            // =========================================

            paymentUrl:
              `/p/${paymentPage.slug}?product=${product.id}`,


            // =========================================
            // CHAMPS
            // =========================================

            fields:
              product.fields.map(
                (field) => ({

                  id:
                    field.id,

                  name:
                    field.name,

                  label:
                    field.label,

                  type:
                    field.type,

                  required:
                    field.required,

                  value:
                    field.value,

                })
              ),


            // =========================================
            // FORMATEUR
            // =========================================

            instructor: {

              id:
                product.user.id,

              name:
                product.user.name,

              email:
                product.user.email,

              phone:
                product.user.phone,

            },


            // =========================================
            // ENTREPRISE
            // =========================================

            company:
              product.user.company

                ? {

                    id:
                      product
                        .user
                        .company
                        .id,

                    name:
                      product
                        .user
                        .company
                        .name,

                    logo:
                      product
                        .user
                        .company
                        .logo,

                    address:
                      product
                        .user
                        .company
                        .address,

                    phone:
                      product
                        .user
                        .company
                        .phone,

                    email:
                      product
                        .user
                        .company
                        .email,

                  }

                : null,

          })
        );


      // =================================================
      // RÉPONSE
      // =================================================

      return res.status(200).json({

        success:
          true,


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


        totalProducts:
          formattedProducts.length,


        products:
          formattedProducts,

      });

    } catch (error: unknown) {

      console.error(
        "GET PUBLIC PAYMENT PAGE ERROR:",
        error
      );


      return res.status(500).json({

        success:
          false,

        message:
          "Impossible de récupérer la page publique.",

        error:
          process.env.NODE_ENV !==
          "production"

            ? error instanceof Error
              ? error.message
              : String(error)

            : undefined,

      });

    }

  };
