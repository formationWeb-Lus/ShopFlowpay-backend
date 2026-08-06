import { Response, NextFunction } from "express";

import {
    AuthRequest
} from "./auth.middleware";

import {
    checkSubscription
} from "../services/subscription.service";


export async function requirePaymentSubscription(
    req: AuthRequest,
    res: Response,
    next: NextFunction
){

    try {


        if(!req.user){

            return res.status(401).json({

                success:false,

                message:
                "Utilisateur non authentifié"

            });

        }



        const active =
            await checkSubscription(
                req.user.id
            );



        if(!active){

            return res.status(403).json({

                success:false,

                code:
                "SUBSCRIPTION_REQUIRED",

                redirect:
                "/dashboard/subscription",

                message:
                "Abonnez-vous avant de créer un mode de paiement"

            });

        }



        next();



    } catch(error){


        console.error(error);


        return res.status(500).json({

            success:false,

            message:
            "Erreur vérification abonnement"

        });


    }

}