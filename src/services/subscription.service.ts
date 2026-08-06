import prisma from "../lib/prisma";



/**
 * =====================================================
 * GET PLANS
 * =====================================================
 */
export async function getPlansService() {

    return await prisma.plan.findMany({

        orderBy:{
            id:"asc",
        },

    });

}





/**
 * =====================================================
 * CREATE SUBSCRIPTION
 * =====================================================
 */
export async function createSubscriptionService(
    userId:number,
    planId:number
){

    const plan =
        await prisma.plan.findUnique({

            where:{
                id:planId,
            },

        });



    if(!plan){

        throw new Error(
            "Plan introuvable"
        );

    }





    const activeSubscription =
        await prisma.subscription.findFirst({

            where:{
                userId,

                status:"ACTIVE",
            },

        });




    if(activeSubscription){

        throw new Error(
            "Vous avez déjà un abonnement actif"
        );

    }





    // Annuler les anciennes demandes en attente

    await prisma.subscription.updateMany({

        where:{

            userId,

            status:"PENDING",

        },

        data:{

            status:"CANCELLED",

        },

    });







    const subscription =
        await prisma.subscription.create({

            data:{

                userId,

                planId,

                status:"PENDING",

                autoRenew:true,

            },


            include:{

                plan:true,

            },

        });





    return subscription;

}







/**
 * =====================================================
 * GET USER SUBSCRIPTION
 * =====================================================
 */
export async function getMySubscriptionService(
    userId:number
){

    return await prisma.subscription.findFirst({

        where:{

            userId,

        },


        orderBy:{

            createdAt:"desc",

        },


        include:{

            plan:true,

        },

    });

}









/**
 * =====================================================
 * CANCEL SUBSCRIPTION
 * =====================================================
 */
export async function cancelSubscriptionService(
    userId:number
){

    const subscription =
        await prisma.subscription.findFirst({

            where:{

                userId,

                status:"ACTIVE",

            },

        });





    if(!subscription){

        throw new Error(
            "Aucun abonnement actif trouvé"
        );

    }







    const updatedSubscription =
        await prisma.subscription.update({

            where:{

                id:subscription.id,

            },


            data:{

                status:"CANCELLED",

                autoRenew:false,

            },


            include:{

                plan:true,

            },

        });








    await prisma.user.update({

        where:{

            id:userId,

        },


        data:{

            subscriptionStatus:"CANCELLED",

        },

    });





    return updatedSubscription;

}









/**
 * =====================================================
 * CHECK ACTIVE SUBSCRIPTION
 * =====================================================
 */
export async function checkSubscription(
    userId:number
){

    const subscription =
        await prisma.subscription.findFirst({

            where:{

                userId,

                status:"ACTIVE",

            },

        });





    if(!subscription){

        return false;

    }







    // Vérifier expiration

    if(

        subscription.endDate &&

        subscription.endDate < new Date()

    ){


        await prisma.subscription.update({

            where:{

                id:subscription.id,

            },


            data:{

                status:"EXPIRED",

            },

        });




        return false;

    }





    return true;

}









/**
 * =====================================================
 * CHECK PRODUCT LIMIT
 * =====================================================
 *
 * Vérifie si un utilisateur peut créer
 * un nouveau produit selon son plan.
 *
 * Starter  -> 10 produits
 * Business -> 100 produits
 * Premium  -> illimité
 *
 * =====================================================
 */
export async function checkProductLimit(
    userId:number
){

    const subscription =
        await prisma.subscription.findFirst({

            where:{

                userId,

                status:"ACTIVE",

            },


            include:{

                plan:true,

            },

        });







    if(!subscription){

        throw new Error(
            "Un abonnement actif est requis"
        );

    }








    const maxProducts =
        subscription.plan.maxProducts;







    const currentProducts =
        await prisma.product.count({

            where:{

                userId,

            },

        });









    // =====================================================
    // PREMIUM = ILLIMITÉ
    // =====================================================

    if(maxProducts === null){


        return {


            allowed:true,


            currentProducts,


            maxProducts:null,


            plan:
            subscription.plan.name,


        };


    }









    // =====================================================
    // LIMITE ATTEINTE
    // =====================================================

    if(currentProducts >= maxProducts){


        return {


            allowed:false,


            currentProducts,


            maxProducts,


            plan:
            subscription.plan.name,


        };


    }









    // =====================================================
    // AUTORISÉ
    // =====================================================

    return {


        allowed:true,


        currentProducts,


        maxProducts,


        plan:
        subscription.plan.name,


    };


}





/**
 * =====================================================
 * CHECK PAYMENT PAGE LIMIT
 * =====================================================
 *
 * Vérifie si un utilisateur peut créer
 * une nouvelle page de paiement selon son plan.
 *
 * Starter  -> 5 pages
 * Business -> 50 pages
 * Premium  -> illimité
 *
 * =====================================================
 */

export async function checkPaymentPageLimit(
    userId:number
){

    const subscription =
        await prisma.subscription.findFirst({

            where:{

                userId,

                status:"ACTIVE",

            },


            include:{

                plan:true,

            },

        });





    if(!subscription){

        throw new Error(
            "Un abonnement actif est requis"
        );

    }







    const maxPaymentPages =
        subscription.plan.maxPaymentPages;







    const currentPages =
        await prisma.paymentPage.count({

            where:{

                userId,

            },

        });









    // =====================================================
    // PREMIUM = ILLIMITÉ
    // =====================================================

    if(maxPaymentPages === null){


        return {


            allowed:true,


            currentPages,


            maxPaymentPages:null,


            plan:
            subscription.plan.name,


        };


    }









    // =====================================================
    // LIMITE ATTEINTE
    // =====================================================

    if(currentPages >= maxPaymentPages){


        return {


            allowed:false,


            currentPages,


            maxPaymentPages,


            plan:
            subscription.plan.name,


        };


    }









    // =====================================================
    // AUTORISÉ
    // =====================================================

    return {


        allowed:true,


        currentPages,


        maxPaymentPages,


        plan:
        subscription.plan.name,


    };


}