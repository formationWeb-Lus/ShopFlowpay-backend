
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

const router = Router();

/* =========================================================
   CREATE PRODUCT
   POST /api/product
========================================================= */

router.post(
  "/",
  authenticateToken,
  createProduct
);

/* =========================================================
   GET MY PRODUCTS
   GET /api/product
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
========================================================= */

router.put(
  "/:id",
  authenticateToken,
  updateProduct
);

/* =========================================================
   DELETE PRODUCT
   DELETE /api/product/:id
========================================================= */

router.delete(
  "/:id",
  authenticateToken,
  deleteProduct
);

/* =========================================================
   PUBLISH PRODUCT
   PATCH /api/product/:id/publish
========================================================= */

router.patch(
  "/:id/publish",
  authenticateToken,
  publishProduct
);

export default router;

