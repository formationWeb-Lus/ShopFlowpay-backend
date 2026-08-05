
import { Request, Response } from "express";
import { PrismaClient, ProductStatus } from "@prisma/client";

const prisma = new PrismaClient();

/* =====================================================
   GET PUBLIC PAYMENT PAGE

   GET /api/public/payment-pages/:slug

   Exemple :
   /api/public/payment-pages/coderise-formations

   Retourne :
   PaymentPage
      ↓
   Products
      ↓
   lien public de chaque produit
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
              product: true,
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
       5. RECUPERER UNIQUEMENT LES PRODUITS PUBLIES
    ================================================= */

    const formattedProducts =
      paymentPage.products
        .map((item) => item.product)

        .filter(
          (product) =>
            product !== null &&
            product.status === ProductStatus.PUBLISHED
        )

        .map((product) => ({
          id: product.id,

          name: product.name,

          subtitle: product.subtitle,

          description: product.description,

          type: product.type,

          price: product.price,

          currency: product.currency,

          imageUrl: product.imageUrl,

          status: product.status,

          /* ==========================================
             LIEN PUBLIC DU PRODUIT
             
             Exemple :
             /p/coderise-formations?product=7
          ========================================== */

          paymentUrl:
            `/p/${paymentPage.slug}?product=${product.id}`,
        }));

    /* =================================================
       6. REPONSE
    ================================================= */

    return res.status(200).json({
      success: true,

      page: {
        id: paymentPage.id,

        title: paymentPage.title,

        slug: paymentPage.slug,

        description: paymentPage.description,

        products: formattedProducts,

        totalProducts: formattedProducts.length,
      },
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
