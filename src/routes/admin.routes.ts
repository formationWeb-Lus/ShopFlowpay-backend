import { Router } from "express";
import { getActiveSubscriptions } from "../controllers/subscriptionController";

const router = Router();

router.get("/subscriptions/active", getActiveSubscriptions);

export default router;