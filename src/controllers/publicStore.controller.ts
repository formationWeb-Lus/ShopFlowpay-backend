import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/* =====================================================
   GET /api/public/store/:vendorId
   Récupérer la boutique publique d'un utilisateur
===================================================== */
export const getPublicStore = async (req: Request, res: Response) => {
  try {
    const { vendorId } = req.params;
    const numericUserId = Number(vendorId);

    if (isNaN(numericUserId) || numericUserId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Identifiant de la boutique invalide.",
      });
    }

    // Récupère uniquement les produits actifs / publiés du vendeur
    const products = await prisma.product.findMany({
      where: {
        userId: numericUserId,
        status: "PUBLISHED",
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
        paymentPageProducts: {
          select: {
            paymentPage: {
              select: {
                slug: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    console.error("GET PUBLIC STORE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Impossible de charger les produits de la boutique.",
    });
  }
};