import "dotenv/config";
import express from "express";

import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import paymentPageRoutes from "./routes/paymentPage.routes";
import publicRoutes from "./routes/public.routes";
import paymentConfigRoutes from "./routes/paymentConfig.routes";
import marketingRoutes from "./routes/marketing.routes";
import socialAccountRoutes from "./routes/social-account.routes";
import socialRoutes from "./routes/social.routes";
import publicPaymentPageRoutes from "./routes/publicPaymentPage.routes";
import publicProductRoutes from "./routes/publicProduct.routes";
import publicStoreRoutes from "./routes/publicStore.routes";
import myStoreRoutes from "./routes/myStore.routes";
import adminSubscriptionRoutes from "./routes/admin-subscription.routes";

const app = express();

// =====================================================
// CORS
// =====================================================

const allowedOrigins = [
  "http://localhost:3000",
  "https://paylinks.coderise-solution.com",
  "https://paylink.coderise-solution.com", // FIX CORS: Ajout du domaine au singulier
];

const isAllowedOrigin = (origin: string): boolean => {
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  return /^https:\/\/paylinks-[a-z0-9-]+-agency-school\.vercel\.app$/.test(
    origin
  );
};

// =====================================================
// MIDDLEWARE CORS MANUEL
// =====================================================

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (!origin) {
    return next();
  }

  if (isAllowedOrigin(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Accept"
    );
    res.header("Vary", "Origin");

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    return next();
  }

  console.log("❌ Origine CORS refusée :", origin);
  return next();
});

// =====================================================
// JSON
// =====================================================

app.use(express.json());

// =====================================================
// ROOT
// =====================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ShopFlowPay API fonctionne",
  });
});

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "API ShopFlow fonctionne",
  });
});

// =====================================================
// ROUTES API SPÉCIFIQUES
// =====================================================

app.use("/api/auth", authRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/payment-pages", paymentPageRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/payment-config", paymentConfigRoutes);
app.use("/api/marketing", marketingRoutes);
app.use("/api/marketing/social-accounts", socialAccountRoutes);
app.use("/api/marketing/social", socialRoutes);
app.use("/api/public", publicPaymentPageRoutes);
app.use("/api/public", publicProductRoutes);
app.use("/api/public", publicStoreRoutes);
// Ajout du préfixe dédié à la partie Admin
app.use("/api/admin", adminRoutes);
app.use("/api/admin/subscriptions", adminSubscriptionRoutes);

// =====================================================
// MY STORE (Placé APRÈS les autres routes pour éviter de capturer les endpoints spécifiques)
// =====================================================

app.use("/api", myStoreRoutes);

// =====================================================
// 404 JSON
// =====================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route introuvable: ${req.method} ${req.originalUrl}`,
  });
});

// =====================================================
// SERVER
// =====================================================

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});