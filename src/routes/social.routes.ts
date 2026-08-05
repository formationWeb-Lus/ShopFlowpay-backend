import { Router } from "express";

import {
  getSocialAccounts,
  disconnectSocialAccount,
} from "../controllers/social.controller";

import {
  authenticateToken,
} from "../middlewares/auth.middleware";

const router = Router();

router.get(
  "/accounts",
  authenticateToken,
  getSocialAccounts
);

router.delete(
  "/accounts/:id",
  authenticateToken,
  disconnectSocialAccount
);

export default router;