import { Request, Response } from "express";
import prisma from "../lib/prisma";
import {
  initiateSerdiPayPayment,
  checkSerdiPayPaymentStatus,
} from "../services/serdipay.service";



/**
 * =====================================================
 * INITIER UN PAIEMENT
 * =====================================================
 *
 * POST /api/payment/initiate
 */
export async function initiatePayment(
  req: Request,
  res: Response
) {

  try {


    const {
      userId,
      courseId,
      amount,
      phone,
      telecom,
      currency,
    } = req.body;



    if (
      !amount ||
      !phone ||
      !telecom
    ) {

      return res.status(400).json({
        success:false,
        message:"Informations paiement incomplètes."
      });

    }



    const payment =
      await prisma.payment.create({

        data: {

          userId:
            userId
              ? Number(userId)
              : null,

          amount:
            Number(amount),

          currency,

          phone,

          telecom,

          status:
            "PENDING"

        }

      });



    const serdiResponse =
      await initiateSerdiPayPayment({

        amount,

        phone,

        telecom,

        currency,

        reference:
          String(payment.id)

      });



    await prisma.payment.update({

      where:{
        id:payment.id
      },

      data:{

        transactionId:
          serdiResponse.transactionId ||
          null,

        sessionId:
          serdiResponse.sessionId ||
          null

      }

    });



    return res.json({

      success:true,

      paymentId:
        payment.id,

      data:
        serdiResponse

    });



  } catch(error){


    console.error(
      "INITIATE PAYMENT ERROR:",
      error
    );


    return res.status(500).json({

      success:false,

      message:
        "Erreur initialisation paiement."

    });


  }

}





/**
 * =====================================================
 * VERIFIER STATUS PAIEMENT
 * =====================================================
 *
 * GET /api/payment/status/:transactionId
 */
export async function checkPaymentStatus(
  req: Request,
  res: Response
){

  try {


    const {
      transactionId
    } = req.params;



    const payment =
      await prisma.payment.findFirst({

        where:{
          transactionId
        }

      });



    if(!payment){

      return res.status(404).json({

        success:false,

        message:
          "Paiement introuvable."

      });

    }




    const status =
      await checkSerdiPayPaymentStatus(
        transactionId
      );




    await prisma.payment.update({

      where:{
        id:payment.id
      },

      data:{

        status:
          status.success
            ? "SUCCESS"
            : "PENDING"

      }

    });



    return res.json({

      success:true,

      status

    });



  } catch(error){


    console.error(
      "CHECK PAYMENT ERROR",
      error
    );


    return res.status(500).json({

      success:false,

      message:
        "Erreur vérification paiement."

    });


  }

}





/**
 * =====================================================
 * MES TRANSACTIONS
 * =====================================================
 *
 * GET /api/payment/transactions
 */
export async function getMyTransactions(
  req: Request,
  res: Response
) {


  try {


    const userId =
      Number(
        (req as any).user.id
      );



    const payments =
      await prisma.payment.findMany({

        where:{
          userId
        },


        include:{
          customer:true
        },


        orderBy:{
          createdAt:"desc"
        }

      });



    const transactions =
      payments.map(
        (payment)=>({

          id:
            payment.id,


          reference:
            payment.transactionId ||
            `TRX-${payment.id}`,


          customer:
            payment.customer?.name ||
            "Client inconnu",


          amount:
            payment.amount,


          currency:
            payment.currency,


          method:
            payment.telecom ||
            "AUTRE",


          status:
            payment.status,


          createdAt:
            payment.createdAt

        })
      );



    return res.json({

      success:true,

      transactions

    });



  } catch(error){


    console.error(
      "GET TRANSACTIONS ERROR",
      error
    );


    return res.status(500).json({

      success:false,

      message:
        "Erreur récupération transactions."

    });


  }

}