import { Router } from "express";
import { getPublicStore } from "../controllers/publicStore.controller";

const router = Router();

// Endpoint public pour récupérer la boutique
router.get("/store/:vendorId", getPublicStore);

export default router;