import { Router } from "express";
import {
  getPublicPaymentPage,
} from "../controllers/publicPaymentPage.controller";

const router = Router();

/* =====================================================
   PUBLIC PAYMENT PAGE
   GET /api/public/payment-pages/:slug

   Exemple :
   GET /api/public/payment-pages/coderise-formations
===================================================== */

router.get(
  "/payment-pages/:slug",
  getPublicPaymentPage
);

export default router;