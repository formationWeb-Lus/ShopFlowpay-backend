
import { Request, Response } from "express";

import prisma from "../lib/prisma";

import {
    AuthRequest,
} from "../middlewares/auth.middleware";

import {
    SerdiPayCurrency,
    SerdiPayTelecom,
    initiateSerdiPayPayment,
} from "../services/serdipay.service";


// =====================================================
// GET PLANS
// =====================================================
//
// GET /api/subscriptions/plans
//
// Retourne tous les plans disponibles.
// =====================================================

export async function getPlans(
    req: Request,
    res: Response
) {

    try {

        const plans =
            await prisma.plan.findMany({

                orderBy: {
                    id: "asc",
                },

            });


        return res.status(200).json({

            success: true,

            plans,

        });


    } catch (error) {

        console.error(
            "GET PLANS ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Impossible de récupérer les plans",

        });

    }

}


// =====================================================
// CREATE SUBSCRIPTION
// =====================================================
//
// POST /api/subscriptions
//
// Body:
//
// {
//   "planId": 1
// }
//
// Crée un abonnement avec le statut PENDING.
// =====================================================

export async function createSubscription(
    req: AuthRequest,
    res: Response
) {

    try {

        // -------------------------------------------------
        // UTILISATEUR
        // -------------------------------------------------

        if (!req.user) {

            return res.status(401).json({

                success: false,

                message:
                    "Utilisateur non authentifié",

            });

        }


        const userId =
            req.user.id;


        // -------------------------------------------------
        // PLAN
        // -------------------------------------------------

        const {
            planId,
        } = req.body;


        if (!planId) {

            return res.status(400).json({

                success: false,

                message:
                    "Le plan est obligatoire",

            });

        }


        const parsedPlanId =
            Number(planId);


        if (
            !Number.isInteger(
                parsedPlanId
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "ID du plan invalide",

            });

        }


        // -------------------------------------------------
        // VERIFIER LE PLAN
        // -------------------------------------------------

        const plan =
            await prisma.plan.findUnique({

                where: {
                    id: parsedPlanId,
                },

            });


        if (!plan) {

            return res.status(404).json({

                success: false,

                message:
                    "Plan introuvable",

            });

        }


        // -------------------------------------------------
        // VERIFIER ABONNEMENT ACTIF
        // -------------------------------------------------

        const activeSubscription =
            await prisma.subscription.findFirst({

                where: {

                    userId,

                    status:
                        "ACTIVE",

                },

            });


        if (activeSubscription) {

            return res.status(400).json({

                success: false,

                message:
                    "Vous avez déjà un abonnement actif",

            });

        }


        // -------------------------------------------------
        // ANNULER LES ANCIENS PENDING
        // -------------------------------------------------

        await prisma.subscription.updateMany({

            where: {

                userId,

                status:
                    "PENDING",

            },

            data: {

                status:
                    "CANCELLED",

            },

        });


        // -------------------------------------------------
        // CREER ABONNEMENT
        // -------------------------------------------------

        const subscription =
            await prisma.subscription.create({

                data: {

                    userId,

                    planId:
                        parsedPlanId,

                    status:
                        "PENDING",

                    autoRenew:
                        true,

                },

                include: {

                    plan: true,

                },

            });


        return res.status(201).json({

            success: true,

            message:
                "Abonnement créé avec succès",

            subscription,

        });


    } catch (error) {

        console.error(
            "CREATE SUBSCRIPTION ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Erreur serveur",

        });

    }

}


// =====================================================
// GET MY SUBSCRIPTION
// =====================================================
//
// GET /api/subscriptions/my
//
// Retourne le dernier abonnement de l'utilisateur.
// =====================================================

export async function getMySubscription(
    req: AuthRequest,
    res: Response
) {

    try {

        // -------------------------------------------------
        // UTILISATEUR
        // -------------------------------------------------

        if (!req.user) {

            return res.status(401).json({

                success: false,

                message:
                    "Utilisateur non authentifié",

            });

        }


        const userId =
            req.user.id;


        // -------------------------------------------------
        // RECUPERER ABONNEMENT
        // -------------------------------------------------

        const subscription =
            await prisma.subscription.findFirst({

                where: {

                    userId,

                },

                orderBy: {

                    createdAt:
                        "desc",

                },

                include: {

                    plan: true,

                },

            });


        return res.status(200).json({

            success: true,

            subscription:
                subscription || null,

        });


    } catch (error) {

        console.error(
            "GET MY SUBSCRIPTION ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Erreur serveur",

        });

    }

}


// =====================================================
// INITIATE SUBSCRIPTION PAYMENT
// =====================================================
//
// POST /api/subscriptions/payment
//
// Body attendu:
//
// {
//   "planId": 1,
//   "clientPhone": "243994972450",
//   "amount": 5,
//   "currency": "USD",
//   "telecom": "AM"
// }
//
// Le frontend envoie clientPhone.
// Le controller transmet clientPhone à SerdiPay.
// =====================================================

export async function initiateSubscriptionPayment(
    req: AuthRequest,
    res: Response
) {

    try {

        // -------------------------------------------------
        // UTILISATEUR
        // -------------------------------------------------

        if (!req.user) {

            return res.status(401).json({

                success: false,

                message:
                    "Utilisateur non authentifié",

            });

        }


        const userId =
            req.user.id;


        // -------------------------------------------------
        // DONNEES RECUES DU FRONTEND
        // -------------------------------------------------

        const {
            planId,
            clientPhone,
            currency,
            telecom,
        } = req.body;


        console.log(
            "SUBSCRIPTION PAYMENT BODY:",
            req.body
        );


        // -------------------------------------------------
        // VALIDATION PLAN
        // -------------------------------------------------

        if (
            planId === undefined ||
            planId === null ||
            planId === ""
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Le plan est obligatoire",

            });

        }


        const parsedPlanId =
            Number(planId);


        if (
            !Number.isInteger(
                parsedPlanId
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "ID du plan invalide",

            });

        }


        // -------------------------------------------------
        // VALIDATION TELEPHONE
        // -------------------------------------------------

        if (
            clientPhone === undefined ||
            clientPhone === null ||
            String(clientPhone).trim() === ""
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Le numéro de téléphone est obligatoire",

            });

        }


        // -------------------------------------------------
        // NORMALISER TELEPHONE
        // -------------------------------------------------

        const normalizedClientPhone =
            String(clientPhone)
                .trim()
                .replace(/\s+/g, "");


        // -------------------------------------------------
        // FORMAT DRC
        // -------------------------------------------------

        if (
            !/^243\d{9}$/.test(
                normalizedClientPhone
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Numéro Mobile Money invalide. Format attendu : 243XXXXXXXXX",

            });

        }


        // -------------------------------------------------
        // VALIDATION CURRENCY
        // -------------------------------------------------

        const selectedCurrency:
            SerdiPayCurrency =
                currency === "CDF"
                    ? "CDF"
                    : "USD";


        // -------------------------------------------------
        // VALIDATION TELECOM
        // -------------------------------------------------

        const allowedTelecoms:
            SerdiPayTelecom[] = [

                "AM",

                "OM",

                "MP",

                "AF",

            ];


        if (
            !allowedTelecoms.includes(
                telecom
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Opérateur Mobile Money invalide",

            });

        }


        const selectedTelecom:
            SerdiPayTelecom =
                telecom;


        // -------------------------------------------------
        // RECUPERER LE PLAN
        // -------------------------------------------------

        const plan =
            await prisma.plan.findUnique({

                where: {

                    id:
                        parsedPlanId,

                },

            });


        if (!plan) {

            return res.status(404).json({

                success: false,

                message:
                    "Plan introuvable",

            });

        }


        // -------------------------------------------------
        // VERIFIER ABONNEMENT ACTIF
        // -------------------------------------------------

        const activeSubscription =
            await prisma.subscription.findFirst({

                where: {

                    userId,

                    status:
                        "ACTIVE",

                },

            });


        if (activeSubscription) {

            return res.status(400).json({

                success: false,

                message:
                    "Vous avez déjà un abonnement actif",

            });

        }


        // -------------------------------------------------
        // CALCULER LE MONTANT DEPUIS LE PLAN
        // -------------------------------------------------
        //
        // IMPORTANT :
        // On ne fait pas confiance au montant envoyé
        // par le frontend.
        //
        // Le backend utilise le prix enregistré
        // dans la base de données.
        // -------------------------------------------------

        const paymentAmount =
            selectedCurrency === "CDF"
                ? plan.priceCDF
                : plan.priceUSD;


        if (
            !Number.isFinite(
                paymentAmount
            ) ||
            paymentAmount <= 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Montant du plan invalide",

            });

        }


        // -------------------------------------------------
        // CREER / RECUPERER ABONNEMENT PENDING
        // -------------------------------------------------

        let subscription =
            await prisma.subscription.findFirst({

                where: {

                    userId,

                    planId:
                        parsedPlanId,

                    status:
                        "PENDING",

                },

                orderBy: {

                    createdAt:
                        "desc",

                },

            });


        if (!subscription) {

            // -------------------------------------------------
            // ANNULER LES AUTRES PENDING
            // -------------------------------------------------

            await prisma.subscription.updateMany({

                where: {

                    userId,

                    status:
                        "PENDING",

                },

                data: {

                    status:
                        "CANCELLED",

                },

            });


            // -------------------------------------------------
            // CREER NOUVEL ABONNEMENT
            // -------------------------------------------------

            subscription =
                await prisma.subscription.create({

                    data: {

                        userId,

                        planId:
                            parsedPlanId,

                        status:
                            "PENDING",

                        autoRenew:
                            true,

                    },

                });

        }


        // -------------------------------------------------
        // VERIFIER CONFIGURATION SERDIPAY
        // -------------------------------------------------

        if (
            !process.env.SERDIPAY_API_ID ||
            !process.env.SERDIPAY_API_PASSWORD ||
            !process.env.SERDIPAY_MERCHANT_CODE ||
            !process.env.SERDIPAY_MERCHANT_PIN
        ) {

            console.error(
                "SERDIPAY CONFIGURATION INCOMPLETE"
            );


            return res.status(500).json({

                success: false,

                message:
                    "La configuration SerdiPay est incomplète",

            });

        }


        // -------------------------------------------------
        // APPEL SERDIPAY
        // -------------------------------------------------

        console.log(
            "SERDIPAY PAYMENT REQUEST:",
            {
                planId:
                    parsedPlanId,

                clientPhone:
                    normalizedClientPhone,

                amount:
                    paymentAmount,

                currency:
                    selectedCurrency,

                telecom:
                    selectedTelecom,
            }
        );


        const paymentResult =
            await initiateSerdiPayPayment({

                api_id:
                    process.env.SERDIPAY_API_ID,

                api_password:
                    process.env.SERDIPAY_API_PASSWORD,

                merchantCode:
                    process.env.SERDIPAY_MERCHANT_CODE,

                merchant_pin:
                    process.env.SERDIPAY_MERCHANT_PIN,

                clientPhone:
                    normalizedClientPhone,

                amount:
                    paymentAmount,

                currency:
                    selectedCurrency,

                telecom:
                    selectedTelecom,

            });


        // -------------------------------------------------
        // REPONSE SERDIPAY
        // -------------------------------------------------

        console.log(
            "SERDIPAY PAYMENT RESULT:",
            paymentResult
        );


        // -------------------------------------------------
        // PAIEMENT ECHOUE
        // -------------------------------------------------

        if (
            !paymentResult.success &&
            paymentResult.status === "failed"
        ) {

            return res.status(

                paymentResult.statusCode >= 400 &&
                paymentResult.statusCode < 600

                    ? paymentResult.statusCode

                    : 402

            ).json({

                success: false,

                message:
                    paymentResult.message ||
                    "Le paiement a échoué",

                subscriptionId:
                    subscription.id,

                planId:
                    plan.id,

                payment: {

                    status:
                        paymentResult.status,

                    sessionId:
                        paymentResult.sessionId,

                    transactionId:
                        paymentResult.transactionId,

                    statusCode:
                        paymentResult.statusCode,

                },

            });

        }


        // -------------------------------------------------
        // PAIEMENT EN COURS / REUSSI
        // -------------------------------------------------

        return res.status(200).json({

            success:
                paymentResult.success,

            message:
                paymentResult.message ||
                "Paiement envoyé à SerdiPay",

            subscriptionId:
                subscription.id,

            plan: {

                id:
                    plan.id,

                name:
                    plan.name,

                amount:
                    paymentAmount,

                currency:
                    selectedCurrency,

            },

            payment: {

                status:
                    paymentResult.status,

                sessionId:
                    paymentResult.sessionId,

                transactionId:
                    paymentResult.transactionId,

                statusCode:
                    paymentResult.statusCode,

            },

        });


    } catch (error) {

        console.error(
            "INITIATE SUBSCRIPTION PAYMENT ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error instanceof Error
                    ? error.message
                    : "Erreur lors du paiement",

        });

    }

}


// =====================================================
// CANCEL SUBSCRIPTION
// =====================================================
//
// PATCH /api/subscriptions/cancel
// =====================================================

export async function cancelSubscription(
    req: AuthRequest,
    res: Response
) {

    try {

        // -------------------------------------------------
        // UTILISATEUR
        // -------------------------------------------------

        if (!req.user) {

            return res.status(401).json({

                success: false,

                message:
                    "Utilisateur non authentifié",

            });

        }


        const userId =
            req.user.id;


        // -------------------------------------------------
        // RECUPERER ABONNEMENT ACTIF
        // -------------------------------------------------

        const subscription =
            await prisma.subscription.findFirst({

                where: {

                    userId,

                    status:
                        "ACTIVE",

                },

                orderBy: {

                    createdAt:
                        "desc",

                },

            });


        if (!subscription) {

            return res.status(404).json({

                success: false,

                message:
                    "Aucun abonnement actif trouvé",

            });

        }


        // -------------------------------------------------
        // ANNULER
        // -------------------------------------------------

        const updatedSubscription =
            await prisma.subscription.update({

                where: {

                    id:
                        subscription.id,

                },

                data: {

                    status:
                        "CANCELLED",

                    autoRenew:
                        false,

                },

            });


        // -------------------------------------------------
        // METTRE A JOUR USER
        // -------------------------------------------------

        await prisma.user.update({

            where: {

                id:
                    userId,

            },

            data: {

                subscriptionStatus:
                    "CANCELLED",

            },

        });


        // -------------------------------------------------
        // REPONSE
        // -------------------------------------------------

        return res.status(200).json({

            success: true,

            message:
                "Abonnement annulé avec succès",

            subscription:
                updatedSubscription,

        });


    } catch (error) {

        console.error(
            "CANCEL SUBSCRIPTION ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Erreur serveur",

        });

    }

}
