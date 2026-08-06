import { Response, NextFunction } from "express";

import {
    AuthRequest,
} from "./auth.middleware";

import {
    checkSubscription,
} from "../services/subscription.service";



/**
 * =====================================================
 * REQUIRE ACTIVE SUBSCRIPTION
 * =====================================================
 *
 * Vérifie que l'utilisateur connecté
 * possède un abonnement actif.
 *
 * Utilisation :
 *
 * router.post(
 *   "/products",
 *   authenticateToken,
 *   requireActiveSubscription,
 *   createProduct
 * )
 *
 * =====================================================
 */

export async function requireActiveSubscription(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {

    try {


        // Vérifier utilisateur connecté

        if (!req.user) {

            return res.status(401).json({

                success:false,

                message:
                "Utilisateur non authentifié",

            });

        }



        const userId =
            req.user.id;




        // Vérifier abonnement

        const hasSubscription =
            await checkSubscription(
                userId
            );




        if (!hasSubscription) {


            return res.status(403).json({

                success:false,

                message:
                "activer l'abonnement pour profiter de cette fonctionnalité",

            });


        }




        // Autoriser la suite

        next();




    } catch(error) {


        console.error(
            "SUBSCRIPTION MIDDLEWARE ERROR:",
            error
        );



        return res.status(500).json({

            success:false,

            message:
            "Erreur lors de la vérification de l'abonnement",

        });

    }

}