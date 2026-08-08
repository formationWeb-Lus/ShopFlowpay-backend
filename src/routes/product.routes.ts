
import { Router } from "express";

import {
  createProduct,
  getMyProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  publishProduct,
} from "../controllers/product.controller";

import {
  authenticateToken,
} from "../middlewares/auth.middleware";

import {
  requireActiveSubscription,
} from "../middlewares/subscription.middleware";

import {
  requirePaymentSubscription,
} from "../middlewares/paymentSubscription.middleware";

import {
  savePaymentConfig,
} from "../controllers/paymentConfig.controller";

import {
  uploadProductImage,
} from "../middlewares/upload.middleware";

const router = Router();

/* =========================================================
   CREATE PRODUCT
   POST /api/product

   Authentification uniquement.
   L'utilisateur peut créer son produit gratuitement.

   Image :
   multipart/form-data
   champ : image
========================================================= */

router.post(
  "/",
  authenticateToken,
  uploadProductImage.single("image"),
  createProduct
);

/* =========================================================
   GET MY PRODUCTS
   GET /api/product

   Lecture des produits de l'utilisateur.
========================================================= */

router.get(
  "/",
  authenticateToken,
  getMyProducts
);

/* =========================================================
   GET PRODUCT BY ID
   GET /api/product/:id
========================================================= */

router.get(
  "/:id",
  authenticateToken,
  getProductById
);

/* =========================================================
   UPDATE PAYMENT CONFIG
   PUT /api/product/:productId

   IMPORTANT :
   Cette route existait déjà dans ton projet.

   Elle appelle savePaymentConfig().
   On ne la remplace PAS par updateProduct(),
   afin de ne pas casser ton système de paiement.

   Nécessite :
   - Authentification
   - Payment Subscription
========================================================= */

router.put(
  "/product/:productId",
  authenticateToken,
  requirePaymentSubscription,
  savePaymentConfig
);

/* =========================================================
   UPDATE PRODUCT
   PUT /api/product/:id

   Cette route est séparée de la route payment config
   ci-dessus.

   Nécessite :
   - Authentification
   - Payment Subscription

   Image :
   multipart/form-data
   champ : image
========================================================= */

router.put(
  "/:id",
  authenticateToken,
  requirePaymentSubscription,
  uploadProductImage.single("image"),
  updateProduct
);

/* =========================================================
   DELETE PRODUCT
   DELETE /api/product/:id

   Suppression autorisée avec authentification.
========================================================= */

router.delete(
  "/:id",
  authenticateToken,
  deleteProduct
);

/* =========================================================
   PUBLISH PRODUCT
   PATCH /api/product/:id/publish

   Nécessite :
   - Authentification
   - Abonnement actif

   Le middleware requireActiveSubscription
   reste présent ici.
========================================================= */

router.patch(
  "/:id/publish",
  authenticateToken,
  requireActiveSubscription,
  publishProduct
);

export default router;
