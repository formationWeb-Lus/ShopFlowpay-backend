import { Router } from "express";

import {
  getSocialAccounts,
  disconnectSocialAccount,
} from "../controllers/social-account.controller";

import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

/*
GET /api/marketing/social-accounts
*/
router.get(
  "/",
  authenticateToken,
  getSocialAccounts
);

/*
DELETE /api/marketing/social-accounts/:id
*/
router.delete(
  "/:id",
  authenticateToken,
  disconnectSocialAccount
);

export default router;