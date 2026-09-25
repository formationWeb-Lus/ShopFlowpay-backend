import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Récupère tous les utilisateurs avec les détails
 * de leur entreprise et de leur abonnement (s'il existe).
 */
export const getActiveSubscribers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        subscriptionStatus: true,
        createdAt: true,
        company: {
          select: {
            id: true,
            name: true,
            logo: true,
            phone: true,
            email: true,
            slug: true,
          },
        },
        subscriptions: {
          take: 1,
          orderBy: {
            createdAt: "desc",
          },
          include: {
            plan: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error: any) {
    console.error("Erreur getAllUsersWithSubscriptions (Admin):", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des utilisateurs",
    });
  }
};