import axios from "axios";

// =====================================================
// TYPES SERDIPAY
// =====================================================

export type SerdiPayTelecom =
  | "AM"
  | "OM"
  | "MP"
  | "AF";

export type SerdiPayCurrency =
  | "USD"
  | "CDF";

export interface SerdiPayPaymentData {
  clientPhone: string;
  amount: number;
  currency: SerdiPayCurrency;
  telecom: SerdiPayTelecom;
}

export interface SerdiPayPaymentResult {
  success: boolean;
  message: string;
  sessionId?: string | null;
  transactionId?: string | null;
  payment?: any;
  raw?: any;
}

// =====================================================
// CONFIGURATION SERDIPAY
// =====================================================

const SERDIPAY_BASE_URL =
  process.env.SERDIPAY_BASE_URL ||
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
// CONFIGURATION TOKEN
// =====================================================
//
// On ne garde PAS le token indéfiniment.
//
// Même si SerdiPay ne donne pas explicitement
// une date d'expiration dans la réponse,
// on renouvelle périodiquement le token.
//
// =====================================================

const TOKEN_CACHE_MINUTES = Number(
  process.env.SERDIPAY_TOKEN_CACHE_MINUTES || 10
);

// =====================================================
// AXIOS CLIENT
// =====================================================

const api = axios.create({
  baseURL: SERDIPAY_BASE_URL,
  timeout: 120000,
  headers: {
    "Content-Type": "application/json",
  },
});

// =====================================================
// CACHE TOKEN
// =====================================================

let accessToken: string | null = null;

let tokenExpiresAt: number | null = null;

// =====================================================
// LOG CONFIGURATION
// =====================================================

console.log("========================================");
console.log("CONFIGURATION SERDIPAY");
console.log("========================================");
console.log(
  "BASE_URL :",
  SERDIPAY_BASE_URL
);
console.log(
  "EMAIL :",
  SERDIPAY_EMAIL
);
console.log(
  "API_ID présent :",
  Boolean(SERDIPAY_API_ID)
);
console.log(
  "API_PASSWORD présent :",
  Boolean(SERDIPAY_API_PASSWORD)
);
console.log(
  "MERCHANT_CODE présent :",
  Boolean(SERDIPAY_MERCHANT_CODE)
);
console.log(
  "MERCHANT_PIN présent :",
  Boolean(SERDIPAY_MERCHANT_PIN)
);
console.log(
  "TOKEN CACHE :",
  `${TOKEN_CACHE_MINUTES} minutes`
);
console.log("========================================");

// =====================================================
// VIDER LE CACHE DU TOKEN
// =====================================================

export function clearTokenCache(): void {
  accessToken = null;
  tokenExpiresAt = null;

  console.log(
    "🗑️ Cache du token SerdiPay supprimé."
  );
}

// =====================================================
// TOKEN ACTUEL
// =====================================================

export function getCurrentToken(): string | null {
  return accessToken;
}

// =====================================================
// EXPIRATION TOKEN
// =====================================================

export function getTokenExpiration(): number | null {
  return tokenExpiresAt;
}

// =====================================================
// VALIDATION CONFIGURATION
// =====================================================

function validateSerdiPayConfiguration(): void {

  if (!SERDIPAY_EMAIL) {
    throw new Error(
      "SERDIPAY_EMAIL manquant dans .env"
    );
  }

  if (!SERDIPAY_PASSWORD) {
    throw new Error(
      "SERDIPAY_PASSWORD manquant dans .env"
    );
  }

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
// VALIDATION PAIEMENT
// =====================================================

function validatePaymentData(
  data: SerdiPayPaymentData
): void {

  if (!data) {
    throw new Error(
      "Données de paiement manquantes."
    );
  }

  if (!data.clientPhone) {
    throw new Error(
      "Numéro client manquant."
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
// OBTENIR TOKEN SERDIPAY
// =====================================================

export async function getSerdiPayToken(): Promise<string> {

  // ---------------------------------------------------
  // TOKEN EN CACHE
  // ---------------------------------------------------

  if (
    accessToken &&
    tokenExpiresAt &&
    tokenExpiresAt > Date.now()
  ) {

    console.log(
      "✅ Token SerdiPay récupéré depuis le cache."
    );

    return accessToken;
  }

  // ---------------------------------------------------
  // IDENTIFIANTS
  // ---------------------------------------------------

  if (!SERDIPAY_EMAIL) {
    throw new Error(
      "SERDIPAY_EMAIL manquant dans .env"
    );
  }

  if (!SERDIPAY_PASSWORD) {
    throw new Error(
      "SERDIPAY_PASSWORD manquant dans .env"
    );
  }

  // ---------------------------------------------------
  // AUTHENTIFICATION
  // ---------------------------------------------------

  try {

    console.log("");
    console.log("========================================");
    console.log("🔐 AUTHENTIFICATION SERDIPAY");
    console.log("========================================");

    const response = await api.post(
      "/merchant/get-token",
      {
        email: SERDIPAY_EMAIL,
        password: SERDIPAY_PASSWORD,
      }
    );

    // -------------------------------------------------
    // NE PAS AFFICHER LE TOKEN
    // -------------------------------------------------

    console.log(
      "Status token SerdiPay :",
      response.status
    );

    console.log(
      "Réponse token reçue :",
      {
        success:
          response.data?.success,
        hasAccessToken:
          Boolean(
            response.data?.access_token
          ),
      }
    );

    // -------------------------------------------------
    // EXTRACTION TOKEN
    // -------------------------------------------------

    const token =
      response.data?.access_token;

    if (!token) {

      console.error(
        "❌ Token SerdiPay introuvable."
      );

      console.error(
        "Clés reçues :",
        Object.keys(
          response.data || {}
        )
      );

      throw new Error(
        "Token SerdiPay introuvable."
      );
    }

    // -------------------------------------------------
    // CACHE
    // -------------------------------------------------

    accessToken = String(token);

    tokenExpiresAt =
      Date.now() +
      TOKEN_CACHE_MINUTES *
        60 *
        1000;

    console.log(
      "✅ Nouveau token SerdiPay enregistré."
    );

    console.log(
      "⏱️ Expiration du cache :",
      new Date(
        tokenExpiresAt
      ).toISOString()
    );

    return accessToken;

  } catch (error: any) {

    console.error("");
    console.error(
      "========================================"
    );
    console.error(
      "❌ AUTHENTIFICATION SERDIPAY"
    );
    console.error(
      "========================================"
    );

    if (error.response) {

      console.error(
        "Status :",
        error.response.status
      );

      console.error(
        "Réponse :",
        error.response.data
      );

      throw new Error(
        error.response.data?.message ||
        "Erreur d'authentification SerdiPay."
      );
    }

    console.error(
      "Erreur :",
      error.message
    );

    throw new Error(
      error.message ||
      "Impossible d'obtenir le token SerdiPay."
    );
  }
}

// =====================================================
// CONSTRUIRE PAYLOAD PAIEMENT
// =====================================================

function buildPaymentPayload(
  data: SerdiPayPaymentData
) {

  return {

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
      Number(data.amount),

    currency:
      data.currency,

    telecom:
      data.telecom,

  };
}

// =====================================================
// APPEL PAYMENT-MERCHANT
// =====================================================

async function sendPaymentRequest(
  token: string,
  payload: any
) {

  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    "📤 APPEL API SERDIPAY"
  );
  console.log(
    "========================================"
  );

  console.log(
    "URL :",
    SERDIPAY_PAYMENT_URL
  );

  console.log(
    "Payload :",
    {
      api_id:
        SERDIPAY_API_ID
          ? "********"
          : "MANQUANT",

      api_password:
        SERDIPAY_API_PASSWORD
          ? "********"
          : "MANQUANT",

      merchantCode:
        SERDIPAY_MERCHANT_CODE
          ? "********"
          : "MANQUANT",

      merchant_pin:
        SERDIPAY_MERCHANT_PIN
          ? "********"
          : "MANQUANT",

      clientPhone:
        payload.clientPhone,

      amount:
        payload.amount,

      currency:
        payload.currency,

      telecom:
        payload.telecom,
    }
  );

  return api.post(
    "/merchant/payment-merchant",
    payload,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );
}

// =====================================================
// TRAITER PAIEMENT SERDIPAY
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
    // VALIDATION PAIEMENT
    // -------------------------------------------------

    validatePaymentData(data);

    // -------------------------------------------------
    // LOG PAIEMENT
    // -------------------------------------------------

    console.log("");
    console.log(
      "=============================================="
    );
    console.log(
      "💳 NOUVEAU PAIEMENT SERDIPAY"
    );
    console.log(
      "=============================================="
    );

    console.log(
      "Montant :",
      data.amount
    );

    console.log(
      "Devise :",
      data.currency
    );

    console.log(
      "Téléphone :",
      data.clientPhone
    );

    console.log(
      "Telecom :",
      data.telecom
    );

    console.log(
      "=============================================="
    );

    // -------------------------------------------------
    // TOKEN
    // -------------------------------------------------

    let token =
      await getSerdiPayToken();

    // -------------------------------------------------
    // PAYLOAD
    // -------------------------------------------------

    const payload =
      buildPaymentPayload(data);

    // -------------------------------------------------
    // PREMIER APPEL
    // -------------------------------------------------

    let response;

    try {

      response =
        await sendPaymentRequest(
          token,
          payload
        );

    } catch (error: any) {

      // -----------------------------------------------
      // TOKEN INVALIDE / EXPIRÉ
      // -----------------------------------------------

      if (
        error.response?.status === 401
      ) {

        console.log("");
        console.log(
          "⚠️ TOKEN SERDIPAY INVALIDE OU EXPIRÉ"
        );

        console.log(
          "🔄 Suppression du token..."
        );

        clearTokenCache();

        // ---------------------------------------------
        // NOUVEAU TOKEN
        // ---------------------------------------------

        token =
          await getSerdiPayToken();

        console.log(
          "🔄 Nouvelle tentative du paiement..."
        );

        // ---------------------------------------------
        // SECOND APPEL
        // ---------------------------------------------

        response =
          await sendPaymentRequest(
            token,
            payload
          );

      } else {

        throw error;
      }
    }

    // -------------------------------------------------
    // RÉPONSE SERDIPAY
    // -------------------------------------------------

    const body =
      response.data || {};

    console.log("");
    console.log(
      "========================================"
    );
    console.log(
      "📦 SERDIPAY PAYMENT RESPONSE"
    );
    console.log(
      "========================================"
    );

    console.log(
      JSON.stringify(
        body,
        null,
        2
      )
    );

    // -------------------------------------------------
    // PAYMENT
    // -------------------------------------------------

    const payment =
      body.payment || {};

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
        : null;

    // -------------------------------------------------
    // SUCCÈS
    // -------------------------------------------------

    console.log("");
    console.log(
      "========================================"
    );
    console.log(
      "✅ REQUÊTE SERDIPAY ACCEPTÉE"
    );
    console.log(
      "========================================"
    );

    console.log(
      "Session ID :",
      sessionId
    );

    console.log(
      "Transaction ID :",
      transactionId
    );

    return {

      success: true,

      message:
        body.message ||
        "Paiement SerdiPay initié avec succès.",

      sessionId,

      transactionId,

      payment,

      raw: body,

    };

  } catch (error: any) {

    console.error("");
    console.error(
      "========================================"
    );
    console.error(
      "❌ SERDIPAY PAYMENT ERROR"
    );
    console.error(
      "========================================"
    );

    // -------------------------------------------------
    // ERREUR HTTP SERDIPAY
    // -------------------------------------------------

    if (error.response) {

      console.error(
        "Status :",
        error.response.status
      );

      console.error(
        "Data :",
        error.response.data
      );

      const message =
        error.response.data?.message ||
        "Erreur lors du paiement SerdiPay.";

      throw {

        status:
          error.response.status,

        message,

        details:
          error.response.data,

      };
    }

    // -------------------------------------------------
    // ERREUR GÉNÉRALE
    // -------------------------------------------------

    console.error(
      "Message :",
      error.message
    );

    throw {

      status: 500,

      message:
        error.message ||
        "Erreur lors du paiement SerdiPay.",

      details:
        error,

    };
  }
}

// =====================================================
// TESTER LA CONFIGURATION
// =====================================================

export function getSerdiPayConfiguration() {

  return {

    baseUrl:
      SERDIPAY_BASE_URL,

    tokenUrl:
      SERDIPAY_TOKEN_URL,

    paymentUrl:
      SERDIPAY_PAYMENT_URL,

    emailConfigured:
      Boolean(SERDIPAY_EMAIL),

    passwordConfigured:
      Boolean(SERDIPAY_PASSWORD),

    apiIdConfigured:
      Boolean(SERDIPAY_API_ID),

    apiPasswordConfigured:
      Boolean(
        SERDIPAY_API_PASSWORD
      ),

    merchantCodeConfigured:
      Boolean(
        SERDIPAY_MERCHANT_CODE
      ),

    merchantPinConfigured:
      Boolean(
        SERDIPAY_MERCHANT_PIN
      ),

    tokenCached:
      Boolean(accessToken),

    tokenExpiresAt,

  };
}

// =====================================================
// EXPORT DEFAULT
// =====================================================

export default {

  getSerdiPayToken,

  processSerdiPayPayment,

  clearTokenCache,

  getCurrentToken,

  getTokenExpiration,

  getSerdiPayConfiguration,

};