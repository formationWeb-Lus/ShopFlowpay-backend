import { Request, Response } from "express";
import prisma from "../lib/prisma";


export const getMyMarketingStore = async (
  req: Request,
  res: Response
) => {

  try {

    const userId = Number(
      (req as any).user.id
    );


    if (!userId) {
      return res.status(401).json({
        success:false,
        message:"Utilisateur non authentifié."
      });
    }


    const products =
      await prisma.product.findMany({

        where:{
          userId,

          status:"PUBLISHED"
        },


        orderBy:{
          createdAt:"desc"
        },


        select:{

          id:true,

          name:true,

          subtitle:true,

          description:true,

          type:true,

          price:true,

          currency:true,

          imageUrl:true,


          paymentPageProducts:{

            where:{
              paymentPage:{
                active:true
              }
            },


            select:{
              paymentPage:{
                select:{
                  slug:true
                }
              }
            }

          }

        }

      });



    return res.json({

      success:true,

      products

    });


  } catch(error){

    console.error(
      "MY STORE ERROR",
      error
    );


    return res.status(500).json({

      success:false,

      message:
      "Impossible de charger votre boutique."

    });

  }

};