
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
// DONNEES DE PAIEMENT
// =====================================================

export interface SerdiPayPaymentData {

    api_id: string;

    api_password: string;

    merchantCode: string;

    merchant_pin: string;

    clientPhone: string;

    amount: number;

    currency: SerdiPayCurrency;

    telecom: SerdiPayTelecom;
}


// =====================================================
// RESULTAT SERDIPAY
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

    if (cachedToken) {

        return cachedToken;

    }


    if (
        !SERDIPAY_EMAIL ||
        !SERDIPAY_PASSWORD
    ) {

        throw new Error(
            "SERDIPAY_EMAIL ou SERDIPAY_PASSWORD manquant"
        );

    }


    try {

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
                }

            );


        const token =
            response.data?.access_token;


        if (!token) {

            throw new Error(
                "Token SerdiPay absent dans la réponse"
            );

        }


        cachedToken =
            String(token);


        return cachedToken;


    } catch (error: any) {

        console.error(
            "SERDIPAY TOKEN ERROR:",
            error.response?.data ||
            error.message
        );


        throw new Error(

            error.response?.data?.message ||
            "Impossible d'obtenir le token SerdiPay"

        );

    }

}


// =====================================================
// PAIEMENT SERDIPAY
// =====================================================

export async function processSerdiPayPayment(

    data: SerdiPayPaymentData

): Promise<SerdiPayPaymentResult> {

    try {

        // -------------------------------------------------
        // TOKEN
        // -------------------------------------------------

        const token =
            await getSerdiPayToken();


        // -------------------------------------------------
        // VALIDATION
        // -------------------------------------------------

        if (!data.api_id) {

            throw new Error(
                "SERDIPAY_API_ID manquant"
            );

        }


        if (!data.api_password) {

            throw new Error(
                "SERDIPAY_API_PASSWORD manquant"
            );

        }


        if (!data.merchantCode) {

            throw new Error(
                "SERDIPAY_MERCHANT_CODE manquant"
            );

        }


        if (!data.merchant_pin) {

            throw new Error(
                "SERDIPAY_MERCHANT_PIN manquant"
            );

        }


        // -------------------------------------------------
        // APPEL SERDIPAY
        // -------------------------------------------------

        const response =
            await axios.post(

                SERDIPAY_PAYMENT_URL,

                {

                    api_id:
                        data.api_id,

                    api_password:
                        data.api_password,

                    merchantCode:
                        data.merchantCode,

                    merchant_pin:
                        data.merchant_pin,

                    clientPhone:
                        data.clientPhone,

                    amount:
                        data.amount,

                    currency:
                        data.currency,

                    telecom:
                        data.telecom,

                },

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
        // REPONSE
        // -------------------------------------------------

        const body =
            response.data || {};


        const payment =
            body.payment || {};


        const statusCode =
            response.status;


        const sessionId =
            payment.sessionId
                ? String(payment.sessionId)
                : null;


        const transactionId =
            payment.transactionId
                ? String(payment.transactionId)
                : null;


        let status:
            | "pending"
            | "success"
            | "failed";


        // -------------------------------------------------
        // SUCCESS
        // -------------------------------------------------

        if (
            payment.status === "success" ||
            statusCode === 200
        ) {

            status =
                "success";

        }

        // -------------------------------------------------
        // FAILED
        // -------------------------------------------------

        else if (
            payment.status === "failed" ||
            statusCode === 402
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


        return {

            success:
                status !== "failed",

            statusCode,

            message:
                body.message ||
                "Transaction envoyée à SerdiPay",

            sessionId,

            transactionId,

            status,

            raw:
                body,

        };


    } catch (error: any) {

        const statusCode =
            error.response?.status || 500;


        const body =
            error.response?.data || {};


        const payment =
            body.payment || {};


        console.error(

            "SERDIPAY PAYMENT ERROR:",

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
                "Erreur lors du paiement SerdiPay",

            sessionId:
                payment.sessionId
                    ? String(payment.sessionId)
                    : null,

            transactionId:
                payment.transactionId
                    ? String(payment.transactionId)
                    : null,

            status:
                "failed",

            raw:
                body,

        };

    }

}

// =====================================================
// INITIATE SERDIPAY PAYMENT
// =====================================================
//
// Alias utilisé par le subscription.controller.ts
//
// =====================================================

export async function initiateSerdiPayPayment(
    data: SerdiPayPaymentData
): Promise<SerdiPayPaymentResult> {

    return processSerdiPayPayment(data);

}


