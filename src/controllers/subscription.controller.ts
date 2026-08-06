import { Request, Response } from "express";

import {
    AuthRequest,
} from "../middlewares/auth.middleware";

import {
    getPlansService,
    createSubscriptionService,
    getMySubscriptionService,
    cancelSubscriptionService,
} from "../services/subscription.service";


import {
    SerdiPayCurrency,
    SerdiPayTelecom,
    initiateSerdiPayPayment,
} from "../services/serdipay.service";

import prisma from "../lib/prisma";



// =====================================================
// GET PLANS
// GET /api/subscriptions/plans
// =====================================================

export async function getPlans(
    req: Request,
    res: Response
) {

    try {


        const plans =
            await getPlansService();



        return res.status(200).json({

            success:true,

            plans,

        });



    } catch(error){


        console.error(
            "GET PLANS ERROR:",
            error
        );


        return res.status(500).json({

            success:false,

            message:
            "Impossible de récupérer les plans",

        });

    }

}





// =====================================================
// CREATE SUBSCRIPTION
// POST /api/subscriptions
// =====================================================

export async function createSubscription(
    req: AuthRequest,
    res: Response
) {


    try {


        if(!req.user){

            return res.status(401).json({

                success:false,

                message:
                "Utilisateur non authentifié",

            });

        }



        const {
            planId
        } = req.body;



        if(!planId){

            return res.status(400).json({

                success:false,

                message:
                "Le plan est obligatoire",

            });

        }




        const subscription =
            await createSubscriptionService(

                req.user.id,

                Number(planId)

            );





        return res.status(201).json({

            success:true,

            message:
            "Abonnement créé avec succès",

            subscription,

        });




    } catch(error:any){


        console.error(
            "CREATE SUBSCRIPTION ERROR:",
            error
        );


        return res.status(400).json({

            success:false,

            message:
            error.message,

        });


    }

}







// =====================================================
// GET MY SUBSCRIPTION
// GET /api/subscriptions/my
// =====================================================

export async function getMySubscription(
    req: AuthRequest,
    res: Response
){

    try{


        if(!req.user){

            return res.status(401).json({

                success:false,

                message:
                "Utilisateur non authentifié",

            });

        }



        const subscription =
            await getMySubscriptionService(
                req.user.id
            );





        return res.status(200).json({

            success:true,

            subscription:
            subscription || null,

        });



    }catch(error:any){


        console.error(
            "GET MY SUBSCRIPTION ERROR:",
            error
        );


        return res.status(500).json({

            success:false,

            message:
            "Erreur serveur",

        });

    }

}









// =====================================================
// INITIATE SUBSCRIPTION PAYMENT
// POST /api/subscriptions/payment
// =====================================================

export async function initiateSubscriptionPayment(
    req: AuthRequest,
    res: Response
){

    try{


        if(!req.user){

            return res.status(401).json({

                success:false,

                message:
                "Utilisateur non authentifié",

            });

        }



        const userId =
            req.user.id;



        const {

            planId,

            clientPhone,

            currency,

            telecom,

        } = req.body;



        if(!planId){

            return res.status(400).json({

                success:false,

                message:
                "Le plan est obligatoire",

            });

        }



        if(!clientPhone){

            return res.status(400).json({

                success:false,

                message:
                "Le numéro de téléphone est obligatoire",

            });

        }



        const parsedPlanId =
            Number(planId);



        if(!Number.isInteger(parsedPlanId)){


            return res.status(400).json({

                success:false,

                message:
                "ID du plan invalide",

            });

        }




        const normalizedPhone =
            String(clientPhone)
            .trim()
            .replace(/\s+/g,"");




        if(!/^243\d{9}$/.test(normalizedPhone)){


            return res.status(400).json({

                success:false,

                message:
                "Format téléphone invalide",

            });

        }





        const selectedCurrency:
            SerdiPayCurrency =
                currency === "CDF"
                ? "CDF"
                : "USD";





        const allowedTelecoms:
            SerdiPayTelecom[] = [

                "AM",
                "OM",
                "MP",
                "AF",

            ];




        if(!allowedTelecoms.includes(telecom)){


            return res.status(400).json({

                success:false,

                message:
                "Opérateur invalide",

            });

        }




        const plan =
            await prisma.plan.findUnique({

                where:{
                    id:parsedPlanId,
                },

            });





        if(!plan){

            return res.status(404).json({

                success:false,

                message:
                "Plan introuvable",

            });

        }






        const amount =
            selectedCurrency === "CDF"

            ? plan.priceCDF

            : plan.priceUSD;





        let subscription =
            await prisma.subscription.findFirst({

                where:{

                    userId,

                    planId:parsedPlanId,

                    status:"PENDING",

                },

            });





        if(!subscription){


            subscription =
            await prisma.subscription.create({

                data:{

                    userId,

                    planId:parsedPlanId,

                    status:"PENDING",

                    autoRenew:true,

                },

            });

        }







        const payment =
            await initiateSerdiPayPayment({

                api_id:
                process.env.SERDIPAY_API_ID!,


                api_password:
                process.env.SERDIPAY_API_PASSWORD!,


                merchantCode:
                process.env.SERDIPAY_MERCHANT_CODE!,


                merchant_pin:
                process.env.SERDIPAY_MERCHANT_PIN!,


                clientPhone:
                normalizedPhone,


                amount,


                currency:
                selectedCurrency,


                telecom,

            });







        return res.status(200).json({

            success:
            payment.success,


            message:
            payment.message,


            subscriptionId:
            subscription.id,


            payment,

        });




    }catch(error:any){


        console.error(
            "SUBSCRIPTION PAYMENT ERROR:",
            error
        );


        return res.status(500).json({

            success:false,

            message:
            error.message,

        });

    }

}









// =====================================================
// CANCEL SUBSCRIPTION
// PATCH /api/subscriptions/cancel
// =====================================================

export async function cancelSubscription(
    req: AuthRequest,
    res: Response
){

    try{


        if(!req.user){

            return res.status(401).json({

                success:false,

                message:
                "Utilisateur non authentifié",

            });

        }




        const subscription =
            await cancelSubscriptionService(
                req.user.id
            );




        return res.status(200).json({

            success:true,

            message:
            "Abonnement annulé avec succès",

            subscription,

        });





    }catch(error:any){


        console.error(
            "CANCEL SUBSCRIPTION ERROR:",
            error
        );


        return res.status(400).json({

            success:false,

            message:
            error.message,

        });


    }

}