import "dotenv/config";

import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import productRoutes from "./routes/product.routes";

import paymentPageRoutes
  from "./routes/paymentPage.routes";

import publicPaymentRoutes
  from "./routes/publicPayment.routes";

import publicRoutes
  from "./routes/public.routes";

import paymentConfigRoutes
  from "./routes/paymentConfig.routes";

import marketingRoutes
  from "./routes/marketing.routes";

import socialAccountRoutes
  from "./routes/social-account.routes";

import socialRoutes
  from "./routes/social.routes";

  import publicPaymentPageRoutes from "./routes/publicPaymentPage.routes";
  import publicProductRoutes from "./routes/publicProduct.routes";
import publicStoreRoutes from "./routes/publicStore.routes";
import myStoreRoutes from "./routes/myStore.routes";
import paymentRoutes from "./routes/payment.routes";

const app = express();


// =====================================================
// CORS
// =====================================================

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);


// =====================================================
// JSON
// =====================================================

app.use(express.json());


// =====================================================
// HEALTH
// =====================================================

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      success: true,
      message:
        "API ShopFlow fonctionne",
    });
  }
);


// =====================================================
// AUTH
// =====================================================

app.use(
  "/api/auth",
  authRoutes
);


// =====================================================
// SUBSCRIPTIONS
// =====================================================

app.use(
  "/api/subscriptions",
  subscriptionRoutes
);


// =====================================================
// PRODUCTS
// =====================================================

app.use(
  "/api/product",
  productRoutes
);


// =====================================================
// PAYMENT PAGES PRIVÉES
// =====================================================

app.use(
  "/api/payment-pages",
  paymentPageRoutes
);


// =====================================================
// PAYMENT PAGES PUBLIQUES
// =====================================================

app.use(
  "/api/public",
  publicPaymentRoutes
);

app.use(
  "/api/public",
  publicRoutes
);


// =====================================================
// PAYMENT CONFIG
// =====================================================

app.use(
  "/api/payment-config",
  paymentConfigRoutes
);


// =====================================================
// MARKETING
// =====================================================

app.use(
  "/api/marketing",
  marketingRoutes
);


// =====================================================
// COMPTES SOCIAUX
// =====================================================

app.use(
  "/api/marketing/social-accounts",
  socialAccountRoutes
);


// =====================================================
// PUBLICATIONS SOCIALES
// =====================================================

app.use(
  "/api/marketing/social",
  socialRoutes
);


app.use(
  "/api/public",
  publicPaymentPageRoutes
);


app.use("/api/public", publicProductRoutes);

app.use(
  "/api/public",
  publicStoreRoutes
);


app.use(
 "/api",
 myStoreRoutes
);


app.use(
  "/api/payment",
  paymentRoutes
);

// =====================================================
// 404 JSON
// =====================================================

app.use(
  (req, res) => {
    res.status(404).json({
      success: false,
      message:
        `Route introuvable: ${req.method} ${req.originalUrl}`,
    });
  }
);


// =====================================================
// SERVER
// =====================================================

const PORT =
  Number(process.env.PORT) || 5000;

app.listen(
  PORT,
  () => {
    console.log(
      `Server running on port ${PORT}`
    );
  }
);