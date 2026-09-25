import { Router } from "express";

import {
  serdiPayCentralCallback,
} from "../controllers/serdipayCallback.controller";

const router = Router();

// =====================================================
// CALLBACK CENTRAL SERDIPAY
// =====================================================
//
// POST /api/serdipay/callback
//
// URL publique finale:
//
// https://api.coderise-solution.com/api/serdipay/callback
//
// =====================================================

router.post(
  "/callback",
  serdiPayCentralCallback
);

export default router;