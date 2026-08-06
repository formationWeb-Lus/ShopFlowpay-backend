import { Router } from "express";

import {
  createProduct,
  getMyProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  publishProduct,
} from "../controllers/product.controller";

import { authenticateToken } from "../middlewares/auth.middleware";

import {
  requireActiveSubscription
} from "../middlewares/subscription.middleware";

import {
 requirePaymentSubscription
} from "../middlewares/paymentSubscription.middleware";
import { savePaymentConfig } from "../controllers/paymentConfig.controller";


const router = Router();



/* =========================================================
   CREATE PRODUCT
   POST /api/product

   gratiut
========================================================= */
router.post(
  "/",
  authenticateToken,
  createProduct
);




/* =========================================================
   GET MY PRODUCTS
   GET /api/product

   Lecture des produits utilisateur
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
   UPDATE PRODUCT
   PUT /api/product/:id

   Nécessite :
   - Authentification
   - Abonnement actif
========================================================= */


router.put(
  "/product/:productId",
  authenticateToken,
  requirePaymentSubscription,
  savePaymentConfig
);




/* =========================================================
   DELETE PRODUCT
   DELETE /api/product/:id

   Suppression autorisée avec authentification
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
========================================================= */

router.patch(
  "/:id/publish",
  authenticateToken,
  requireActiveSubscription,
  publishProduct
);



export default router;