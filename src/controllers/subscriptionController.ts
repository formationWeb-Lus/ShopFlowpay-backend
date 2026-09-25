import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getActiveSubscriptions = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        company: true,
        subscriptions: {
          orderBy: { createdAt: "desc" },
          include: { plan: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedData = users.map((user) => {
      const latestSubscription = user.subscriptions[0] || null;

      const isSubActive =
        latestSubscription &&
        latestSubscription.status === "ACTIVE" &&
        (!latestSubscription.endDate || new Date(latestSubscription.endDate) > new Date());

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        subscriptionStatus: isSubActive ? "ACTIVE" : user.subscriptionStatus || "INACTIVE",
        createdAt: user.createdAt,
        company: user.company
          ? {
              id: user.company.id,
              name: user.company.name,
              logo: user.company.logo,
              phone: user.company.phone,
              email: user.company.email,
              slug: user.company.slug,
            }
          : null,
        subscriptions: user.subscriptions.map((sub) => ({
          id: sub.id,
          status: sub.status,
          startDate: sub.startDate,
          endDate: sub.endDate,
          autoRenew: sub.autoRenew ?? false,
          plan: sub.plan
            ? {
                id: sub.plan.id,
                name: sub.plan.name,
                priceUSD: sub.plan.priceUSD,
                priceCDF: sub.plan.priceCDF,
              }
            : null,
        })),
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedData.length,
      data: formattedData,
    });
  } catch (error: any) {
    console.error("Erreur récupération publique des abonnés:", error);
    return res.status(500).json({
      success: false,
      message: "Impossible de récupérer la liste des clients.",
      error: error.message,
    });
  }
};