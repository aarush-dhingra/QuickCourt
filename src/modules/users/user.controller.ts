import { Request, Response, NextFunction } from "express";
import { UserService } from "./user.service";
import { updateProfileSchema } from "./user.validation";
import { sendSuccess } from "../../utils/apiResponse";
import { ZodError } from "zod";

export class UserController {
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await UserService.getProfile(req.user!.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = updateProfileSchema.parse(req.body);
      const result = await UserService.updateProfile(req.user!.id, validated);
      sendSuccess(res, result, "Profile updated successfully.");
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation failed.",
          errorCode: "VALIDATION_ERROR",
          errors: error.issues.map((e) => ({ field: e.path.join("."), message: e.message })),
        });
      }
      next(error);
    }
  }
}
