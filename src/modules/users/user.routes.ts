import { Router } from "express";
import { UserController } from "./user.controller";
import { authMiddleware } from "../../middleware/auth.middleware";

const router = Router();

router.get("/me", authMiddleware, UserController.getProfile);
router.patch("/me", authMiddleware, UserController.updateProfile);

export default router;
