import { Request, Response } from "express";
import axios from "axios";

// =====================================================
// CALLBACK CENTRALISATEUR SERDIPAY
// =====================================================
//
// SerdiPay appelle UNE SEULE URL:
//
// https://api.coderise-solution.com/api/serdipay/callback
//
// Le callback est ensuite transmis aux différents
// backends qui utilisent SerdiPay.
//
// =====================================================

export async function serdiPayCentralCallback(
  req: Request,
  res: Response
) {
  console.log("");
  console.log("=================================================");
  console.log("📩 CALLBACK CENTRALISATEUR SERDIPAY");
  console.log("=================================================");
  console.log("Date :", new Date().toISOString());
  console.log("Body :", JSON.stringify(req.body, null, 2));

  try {
    const callback = req.body;

    if (!callback || Object.keys(callback).length === 0) {
      console.error("❌ Callback vide.");

      return res.status(400).json({
        success: false,
        message: "Callback SerdiPay vide.",
      });
    }

    // =================================================
    // CONFIGURATION DES BACKENDS
    // =================================================

    const targets = [
      {
        name: "ShopFlow",
        url:
          process.env.SHOPFLOW_SERDIPAY_CALLBACK_URL ||
          "https://api.coderise-solution.com/api/payment/callback",
      },

      {
        name: "PayLink",
        url:
          process.env.PAYLINK_SERDIPAY_CALLBACK_URL ||
          "https://paylink.coderise-solution.com/api/payment/callback",
      },
    ];

    console.log("");
    console.log("📡 BACKENDS CIBLES :");

    for (const target of targets) {
      console.log(
        `➡️ ${target.name} : ${target.url}`
      );
    }

    // =================================================
    // ENVOYER LE CALLBACK AUX BACKENDS
    // =================================================

    const results = [];

    for (const target of targets) {
      try {
        console.log("");
        console.log(
          `📤 Envoi callback → ${target.name}`
        );

        const response = await axios.post(
          target.url,
          callback,
          {
            headers: {
              "Content-Type": "application/json",
            },
            timeout: 15000,
          }
        );

        console.log(
          `✅ ${target.name} a accepté le callback.`
        );

        results.push({
          project: target.name,
          success: true,
          status: response.status,
          response: response.data,
        });

      } catch (error: any) {
        console.error(
          `⚠️ ${target.name} n'a pas accepté le callback.`
        );

        console.error(
          error.response?.data ||
          error.message
        );

        results.push({
          project: target.name,
          success: false,
          status:
            error.response?.status ||
            500,
          message:
            error.response?.data?.message ||
            error.message,
        });
      }
    }

    // =================================================
    // RÉPONSE À SERDIPAY
    // =================================================

    console.log("");
    console.log(
      "================================================="
    );
    console.log(
      "✅ CALLBACK CENTRAL TRAITÉ"
    );
    console.log(
      "================================================="
    );

    return res.status(200).json({
      success: true,
      message:
        "Callback SerdiPay reçu et distribué.",
      results,
    });

  } catch (error: any) {

    console.error("");
    console.error(
      "================================================="
    );
    console.error(
      "❌ ERREUR CALLBACK CENTRAL"
    );
    console.error(
      "================================================="
    );

    console.error(error);

    return res.status(500).json({
      success: false,
      message:
        "Erreur traitement callback central.",
    });
  }
}