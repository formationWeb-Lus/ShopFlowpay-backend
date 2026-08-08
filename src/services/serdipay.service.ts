import axios from "axios";

// =====================================================
// TYPES SERDIPAY
// =====================================================

export type SerdiPayCurrency =
  | "USD"
  | "CDF";

export type SerdiPayTelecom =
  | "AM"
  | "OM"
  | "MP"
  | "AF";

// =====================================================
// DONNÉES DE PAIEMENT
// =====================================================
//
// IMPORTANT :
// Les identifiants API et marchand restent uniquement
// dans le backend.
//
// Le controller n'envoie donc que :
// - clientPhone
// - amount
// - currency
// - telecom
//
// =====================================================

export interface SerdiPayPaymentData {
  clientPhone: string;

  amount: number;

  currency: SerdiPayCurrency;

  telecom: SerdiPayTelecom;
}

// =====================================================
// RÉSULTAT SERDIPAY
// =====================================================

export interface SerdiPayPaymentResult {
  success: boolean;

  statusCode: number;

  message: string;

  sessionId: string | null;

  transactionId: string | null;

  status:
    | "pending"
    | "success"
    | "failed";

  raw?: unknown;
}

// =====================================================
// RÉSULTAT VÉRIFICATION
// =====================================================

export interface SerdiPayPaymentStatusResult {
  success: boolean;

  status:
    | "pending"
    | "success"
    | "failed";

  transactionId: string;

  message: string;

  raw?: unknown;
}

// =====================================================
// CONFIGURATION
// =====================================================

const SERDIPAY_BASE_URL =
  "https://serdipay.com/api/public-api/v1";

const SERDIPAY_TOKEN_URL =
  `${SERDIPAY_BASE_URL}/merchant/get-token`;

const SERDIPAY_PAYMENT_URL =
  `${SERDIPAY_BASE_URL}/merchant/payment-merchant`;

// =====================================================
// IDENTIFIANTS SERDIPAY
// =====================================================

const SERDIPAY_EMAIL =
  process.env.SERDIPAY_EMAIL || "";

const SERDIPAY_PASSWORD =
  process.env.SERDIPAY_PASSWORD || "";

const SERDIPAY_API_ID =
  process.env.SERDIPAY_API_ID || "";

const SERDIPAY_API_PASSWORD =
  process.env.SERDIPAY_API_PASSWORD || "";

const SERDIPAY_MERCHANT_CODE =
  process.env.SERDIPAY_MERCHANT_CODE || "";

const SERDIPAY_MERCHANT_PIN =
  process.env.SERDIPAY_MERCHANT_PIN || "";

// =====================================================
// TOKEN CACHE
// =====================================================

let cachedToken: string | null = null;

// =====================================================
// OBTENIR LE TOKEN SERDIPAY
// =====================================================

export async function getSerdiPayToken(): Promise<string> {

  // ---------------------------------------------------
  // TOKEN DÉJÀ EN CACHE
  // ---------------------------------------------------

  if (cachedToken) {
    return cachedToken;
  }

  // ---------------------------------------------------
  // VÉRIFICATION IDENTIFIANTS
  // ---------------------------------------------------

  if (
    !SERDIPAY_EMAIL ||
    !SERDIPAY_PASSWORD
  ) {
    throw new Error(
      "SERDIPAY_EMAIL ou SERDIPAY_PASSWORD manquant dans .env"
    );
  }

  try {

    console.log(
      "🔐 Demande du token SerdiPay..."
    );

    const response =
      await axios.post(

        SERDIPAY_TOKEN_URL,

        {
          email:
            SERDIPAY_EMAIL,

          password:
            SERDIPAY_PASSWORD,
        },

        {
          headers: {
            "Content-Type":
              "application/json",
          },

          timeout:
            30000,
        }

      );

    const token =
      response.data?.access_token;

    if (!token) {

      console.error(
        "❌ Réponse token SerdiPay :",
        response.data
      );

      throw new Error(
        "Token SerdiPay absent dans la réponse."
      );
    }

    cachedToken =
      String(token);

    console.log(
      "✅ Token SerdiPay obtenu."
    );

    return cachedToken;

  } catch (error: any) {

    console.error(
      "❌ SERDIPAY TOKEN ERROR:",
      error.response?.data ||
      error.message
    );

    throw new Error(

      error.response?.data?.message ||
      "Impossible d'obtenir le token SerdiPay."

    );
  }
}

// =====================================================
// VÉRIFIER LA CONFIGURATION
// =====================================================

function validateSerdiPayConfiguration() {

  if (!SERDIPAY_API_ID) {
    throw new Error(
      "SERDIPAY_API_ID manquant dans .env"
    );
  }

  if (!SERDIPAY_API_PASSWORD) {
    throw new Error(
      "SERDIPAY_API_PASSWORD manquant dans .env"
    );
  }

  if (!SERDIPAY_MERCHANT_CODE) {
    throw new Error(
      "SERDIPAY_MERCHANT_CODE manquant dans .env"
    );
  }

  if (!SERDIPAY_MERCHANT_PIN) {
    throw new Error(
      "SERDIPAY_MERCHANT_PIN manquant dans .env"
    );
  }
}

// =====================================================
// VALIDATION DONNÉES PAIEMENT
// =====================================================

function validatePaymentData(
  data: SerdiPayPaymentData
) {

  if (!data.clientPhone) {
    throw new Error(
      "Numéro client manquant."
    );
  }

  if (!data.amount) {
    throw new Error(
      "Montant paiement manquant."
    );
  }

  if (
    typeof data.amount !== "number" ||
    !Number.isFinite(data.amount) ||
    data.amount <= 0
  ) {
    throw new Error(
      "Montant paiement invalide."
    );
  }

  if (
    data.currency !== "USD" &&
    data.currency !== "CDF"
  ) {
    throw new Error(
      "Devise paiement invalide."
    );
  }

  if (
    data.telecom !== "AM" &&
    data.telecom !== "OM" &&
    data.telecom !== "MP" &&
    data.telecom !== "AF"
  ) {
    throw new Error(
      "Opérateur Mobile Money invalide."
    );
  }
}

// =====================================================
// TRAITER UN PAIEMENT SERDIPAY
// =====================================================

export async function processSerdiPayPayment(
  data: SerdiPayPaymentData
): Promise<SerdiPayPaymentResult> {

  try {

    // -------------------------------------------------
    // VALIDATION CONFIGURATION
    // -------------------------------------------------

    validateSerdiPayConfiguration();

    // -------------------------------------------------
    // VALIDATION DONNÉES
    // -------------------------------------------------

    validatePaymentData(data);

    // -------------------------------------------------
    // TOKEN
    // -------------------------------------------------

    const token =
      await getSerdiPayToken();

    // -------------------------------------------------
    // PAYLOAD SERDIPAY
    // -------------------------------------------------
    //
    // C'est ici que le montant choisi par le client
    // arrive directement chez SerdiPay.
    //
    // Exemple :
    //
    // USD :
    // amount: 15
    // currency: "USD"
    //
    // CDF :
    // amount: 33450
    // currency: "CDF"
    //
    // -------------------------------------------------

    const payload = {

      api_id:
        SERDIPAY_API_ID,

      api_password:
        SERDIPAY_API_PASSWORD,

      merchantCode:
        SERDIPAY_MERCHANT_CODE,

      merchant_pin:
        SERDIPAY_MERCHANT_PIN,

      clientPhone:
        data.clientPhone,

      amount:
        data.amount,

      currency:
        data.currency,

      telecom:
        data.telecom,

    };

    console.log(
      "💳 SERDIPAY PAYMENT REQUEST:",
      {
        clientPhone:
          data.clientPhone,

        amount:
          data.amount,

        currency:
          data.currency,

        telecom:
          data.telecom,
      }
    );

    // -------------------------------------------------
    // APPEL API SERDIPAY
    // -------------------------------------------------

    const response =
      await axios.post(

        SERDIPAY_PAYMENT_URL,

        payload,

        {
          headers: {

            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,

          },

          timeout:
            120000,
        }

      );

    // -------------------------------------------------
    // RÉPONSE
    // -------------------------------------------------

    const body =
      response.data || {};

    console.log(
      "📦 SERDIPAY PAYMENT RESPONSE:",
      body
    );

    const payment =
      body.payment || {};

    // -------------------------------------------------
    // STATUS HTTP
    // -------------------------------------------------

    const statusCode =
      response.status;

    // -------------------------------------------------
    // SESSION ID
    // -------------------------------------------------

    const sessionId =
      payment.sessionId
        ? String(
            payment.sessionId
          )
        : null;

    // -------------------------------------------------
    // TRANSACTION ID
    // -------------------------------------------------

    const transactionId =
      payment.transactionId
        ? String(
            payment.transactionId
          )
        : payment.txId
          ? String(
              payment.txId
            )
          : null;

    // -------------------------------------------------
    // STATUS
    // -------------------------------------------------

    let status:
      | "pending"
      | "success"
      | "failed";

    const apiStatus =
      String(
        payment.status ||
        body.status ||
        ""
      ).toLowerCase();

    // -------------------------------------------------
    // SUCCESS
    // -------------------------------------------------

    if (
      apiStatus === "success" ||
      apiStatus === "successful" ||
      apiStatus === "completed"
    ) {

      status =
        "success";

    }

    // -------------------------------------------------
    // FAILED
    // -------------------------------------------------

    else if (
      apiStatus === "failed" ||
      apiStatus === "failure" ||
      apiStatus === "cancelled" ||
      apiStatus === "canceled"
    ) {

      status =
        "failed";

    }

    // -------------------------------------------------
    // HTTP 4xx / 5xx
    // -------------------------------------------------

    else if (
      statusCode >= 400
    ) {

      status =
        "failed";

    }

    // -------------------------------------------------
    // PENDING
    // -------------------------------------------------

    else {

      status =
        "pending";

    }

    // -------------------------------------------------
    // RÉSULTAT
    // -------------------------------------------------

    return {

      success:
        status !== "failed",

      statusCode,

      message:
        body.message ||
        payment.message ||
        "Transaction envoyée à SerdiPay.",

      sessionId,

      transactionId,

      status,

      raw:
        body,

    };

  } catch (error: any) {

    // -------------------------------------------------
    // ERREUR AXIOS
    // -------------------------------------------------

    const statusCode =
      error.response?.status ||
      500;

    const body =
      error.response?.data ||
      {};

    const payment =
      body.payment ||
      {};

    console.error(
      "❌ SERDIPAY PAYMENT ERROR:",
      body ||
      error.message
    );

    return {

      success:
        false,

      statusCode,

      message:
        body.message ||
        error.message ||
        "Erreur lors du paiement SerdiPay.",

      sessionId:
        payment.sessionId
          ? String(
              payment.sessionId
            )
          : null,

      transactionId:
        payment.transactionId
          ? String(
              payment.transactionId
            )
          : payment.txId
            ? String(
                payment.txId
              )
            : null,

      status:
        "failed",

      raw:
        body,

    };
  }
}

// =====================================================
// ALIAS INITIATE
// =====================================================
//
// Utilisé par les controllers.
//
// =====================================================

export async function initiateSerdiPayPayment(
  data: SerdiPayPaymentData
): Promise<SerdiPayPaymentResult> {

  return processSerdiPayPayment(
    data
  );
}

// =====================================================
// VÉRIFICATION DU STATUT
// =====================================================
//
// IMPORTANT :
// Nous ne supposons pas ici un endpoint SerdiPay
// de vérification qui n'est pas confirmé.
//
// SerdiPay indique utiliser des webhooks pour notifier
// les changements de statut.
//
// Cette fonction permet au controller de compiler,
// mais elle ne doit PAS être utilisée comme source
// définitive de confirmation d'un paiement.
//
// La confirmation définitive doit être faite via
// le webhook SerdiPay.
//
// =====================================================

export async function checkSerdiPayPaymentStatus(
  transactionId: string
): Promise<SerdiPayPaymentStatusResult> {

  if (!transactionId) {

    return {

      success:
        false,

      status:
        "failed",

      transactionId:
        "",

      message:
        "TransactionId manquant.",

    };
  }

  // -------------------------------------------------
  // IMPORTANT
  // -------------------------------------------------
  //
  // Pour l'instant, on ne marque jamais une transaction
  // comme SUCCESS simplement parce qu'elle possède
  // un transactionId.
  //
  // La confirmation doit venir de SerdiPay/webhook.
  //
  // -------------------------------------------------

  return {

    success:
      false,

    status:
      "pending",

    transactionId,

    message:
      "Statut en attente de confirmation SerdiPay.",

  };
}