import { Router } from "express";

import {
  getMarketingProducts,
  verifyMarketingProduct,
} from "../controllers/marketing.controller";

import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.get(
  "/products",
  authenticateToken,
  getMarketingProducts
);

router.get(
  "/products/:id/verify",
  authenticateToken,
  verifyMarketingProduct
);

export default router;