
import { Router } from "express";

import {
  getPublicProducts,
  getPublicProductsBySlug,
  getPublicProductBySlugAndId,
} from "../controllers/publicProduct.controller";

const router = Router();

/* =====================================================
   TOUS LES PRODUITS PUBLICS
===================================================== */

router.get(
  "/products",
  getPublicProducts
);

/* =====================================================
   PRODUITS D'UN ENTREPRENEUR
===================================================== */

router.get(
  "/products/:slug",
  getPublicProductsBySlug
);

/* =====================================================
   UN PRODUIT PRÉCIS
===================================================== */

router.get(
  "/products/:slug/:id",
  getPublicProductBySlugAndId
);

export default router;

