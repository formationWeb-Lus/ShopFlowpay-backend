import { Request, Response } from "express";
import {
 PrismaClient,
 ProductStatus,
 PaymentStatus,
} from "@prisma/client";

import {
  processSerdiPayPayment
} from "../services/serdipay.service";

const prisma = new PrismaClient();

/* =====================================================
   HELPERS
===================================================== */

const AVAILABLE_STATUS: ProductStatus =
  ProductStatus.PUBLISHED;

/* =====================================================
   GET PUBLIC PAYMENT PAGES
=====================================================

GET /api/public/payment-pages

Retourne toutes les pages publiques actives
avec leurs produits publiés.

===================================================== */

export const getPublicPaymentPages = async (
  req: Request,
  res: Response
) => {
  try {
    console.log(
      "================ PUBLIC PAYMENT PAGES ================"
    );

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
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    const pages = paymentPages
      .map((page) => {
        const products = page.products
          .map((item) => item.product)
          .filter(
            (product) =>
              product.status ===
              AVAILABLE_STATUS
          );

        if (products.length === 0) {
          return null;
        }

        return {
          id: page.id,

          title: page.title,

          slug: page.slug,

          description:
            page.description,

          active: page.active,

          createdAt:
            page.createdAt,

          totalProducts:
            products.length,

          products: products.map(
            (product) => ({
              id: product.id,

              name: product.name,

              subtitle:
                product.subtitle,

              description:
                product.description,

              type: product.type,

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

              paymentUrl:
                `/p/${page.slug}?product=${product.id}`,

              fields:
                product.fields.map(
                  (field) => ({
                    id: field.id,

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

              instructor: {
                id: product.user.id,

                name:
                  product.user.name,

                email:
                  product.user.email,

                phone:
                  product.user.phone,
              },

              company:
                product.user.company
                  ? {
                      id:
                        product
                          .user
                          .company.id,

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
      .filter(Boolean);

    console.log(
      `Pages publiques : ${pages.length}`
    );

    return res.status(200).json({
      success: true,

      total: pages.length,

      paymentPages: pages,
    });
  } catch (error) {
    console.error(
      "GET PUBLIC PAYMENT PAGES ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Impossible de récupérer les pages publiques.",
    });
  }
};


// =====================================================
// CREATE PUBLIC PAYMENT
// POST /api/public/payments
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


const name =
  customerInfo?.name || "Client";


const email =
  customerInfo?.email || null;

    // =============================================
    // VALIDATION
    // =============================================

    if (
      !productId ||
      !phone ||
      !telecom ||
      !currency ||
      !amount
    ) {

      return res.status(400).json({
        success:false,
        message:
          "Informations de paiement manquantes."
      });

    }



    // =============================================
    // PRODUIT
    // =============================================

    const product =
      await prisma.product.findUnique({

        where:{
          id:Number(productId)
        },

        include:{
          user:true
        }

      });



    if(!product){

      return res.status(404).json({
        success:false,
        message:
          "Produit introuvable."
      });

    }



    if(
      product.status !== ProductStatus.PUBLISHED
    ){

      return res.status(400).json({
        success:false,
        message:
          "Ce produit n'est pas disponible."
      });

    }



    // =============================================
    // CUSTOMER
    // =============================================

    let customer =
      await prisma.customer.findFirst({

        where:{
          phone
        }

      });



    if(!customer){

      customer =
        await prisma.customer.create({

          data:{

            userId:
              product.userId,

            name:
              name || "Client",

            email,

            phone

          }

        });

    }



    // =============================================
    // CREATION PAYMENT PENDING
    // =============================================

    const payment =
      await prisma.payment.create({

        data:{

          userId:
            product.userId,

          customerId:
            customer.id,

          amount:
            Number(amount),

          currency,

          telecom,

          phone,

         status:
  PaymentStatus.PENDING

        }

      });



    // =============================================
    // SERDIPAY
    // =============================================

    const serdiResult =
      await processSerdiPayPayment({

        api_id:
          process.env.SERDIPAY_API_ID!,

        api_password:
          process.env.SERDIPAY_API_PASSWORD!,

        merchantCode:
          process.env.SERDIPAY_MERCHANT_CODE!,

        merchant_pin:
          process.env.SERDIPAY_MERCHANT_PIN!,

        clientPhone:
          phone,

        amount:
          Number(amount),

        currency,

        telecom

      });


      // =============================================
// UPDATE PAYMENT
// =============================================

let finalStatus: PaymentStatus =
  PaymentStatus.PENDING;


if (
  serdiResult.status === "success"
) {

  finalStatus =
    PaymentStatus.SUCCESS;

}


if (
  serdiResult.status === "failed"
) {

  finalStatus =
    PaymentStatus.FAILED;

}



await prisma.payment.update({

  where: {
    id: payment.id,
  },

  data: {

    sessionId:
      serdiResult.sessionId,

    transactionId:
      serdiResult.transactionId,

    status:
      finalStatus,

  }

});



  } catch(error:any){


    console.error(
      "CREATE PUBLIC PAYMENT ERROR:",
      error
    );


    return res.status(500).json({

      success:false,

      message:
        "Erreur pendant le paiement.",

      error:
        process.env.NODE_ENV !== "production"
        ? error.message
        : undefined

    });

  }

};


export const getPublicPaymentPage = async (
  req: Request,
  res: Response
) => {
  try {
    const { slug } = req.params;

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

    console.log(
      `Recherche de la page publique : ${cleanSlug}`
    );

    const paymentPage =
      await prisma.paymentPage.findUnique({
        where: {
          slug: cleanSlug,
        },

        include: {
          products: {
            include: {
              product: {
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
          },
        },
      });

    // =====================================================
    // PAGE INTROUVABLE
    // =====================================================

    if (!paymentPage) {
      return res.status(404).json({
        success: false,
        message: "Page publique introuvable.",
      });
    }

    // =====================================================
    // PAGE DÉSACTIVÉE
    // =====================================================

    if (!paymentPage.active) {
      return res.status(404).json({
        success: false,
        message:
          "Cette page publique n'est plus disponible.",
      });
    }

    // =====================================================
    // PRODUITS DISPONIBLES
    // =====================================================

    const products = paymentPage.products
      .map((item) => item.product)
      .filter(
        (product) =>
          product.status ===
          ProductStatus.PUBLISHED
      );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Aucun produit publié sur cette page.",
      });
    }

    // =====================================================
    // FORMAT
    // =====================================================

    const formattedProducts = products.map(
      (product) => ({
        id: product.id,

        name: product.name,

        subtitle: product.subtitle,

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

        paymentUrl:
          `/p/${paymentPage.slug}?product=${product.id}`,

        fields: product.fields.map(
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

        instructor: {
          id: product.user.id,

          name:
            product.user.name,

          email:
            product.user.email,

          phone:
            product.user.phone,
        },

        company:
          product.user.company
            ? {
                id:
                  product.user.company.id,

                name:
                  product.user.company.name,

                logo:
                  product.user.company.logo,

                address:
                  product.user.company.address,

                phone:
                  product.user.company.phone,

                email:
                  product.user.company.email,
              }
            : null,
      })
    );

    return res.status(200).json({
      success: true,

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

      totalProducts:
        formattedProducts.length,

      products:
        formattedProducts,
    });
  } catch (error: any) {
    console.error(
      "GET PUBLIC PAYMENT PAGE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Impossible de récupérer la page publique.",

      error:
        process.env.NODE_ENV !==
        "production"
          ? error.message
          : undefined,
    });
  }
};
