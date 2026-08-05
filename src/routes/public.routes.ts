import { Router } from "express";
import {
  getPublicPaymentPage,
} from "../controllers/public.controller";

const router = Router();

router.get(
  "/payment-pages/:slug",
  getPublicPaymentPage
);

export default router;