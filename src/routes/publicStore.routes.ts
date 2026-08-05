
import { Router } from "express";

import {
  getPublicStore,
} from "../controllers/publicStore.controller";

const router = Router();

/**
 * GET
 * Boutique publique d'un entrepreneur
 *
 * Exemple :
 * GET /api/public/store/coderise
 *
 * Aucun token nécessaire.
 */
router.get(
  "/store/:slug",
  getPublicStore
);

export default router;
