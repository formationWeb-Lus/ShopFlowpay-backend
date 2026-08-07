import { Router } from "express";
import {
  getMyMarketingStore
} from "../controllers/myStore.controller";

import {
  authenticateToken
} from "../middlewares/auth.middleware";


const router = Router();


router.get(
  "/my-store",
  authenticateToken,
  getMyMarketingStore
);


export default router;