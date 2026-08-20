import { Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service";
import { registerSchema, verifyOtpSchema, resendOtpSchema, loginSchema } from "./auth.validation";
import { sendSuccess } from "../../utils/apiResponse";
import { ZodError } from "zod";

const formatZodErrors = (error: ZodError) => {
  return error.issues.map((e) => ({
    field: e.path.join("."),
    message: e.message,
  }));
};

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = registerSchema.parse(req.body);
      const result = await AuthService.register(validated);
      sendSuccess(res, result, "Registration successful. Verify your email with the OTP.", 201);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation failed.",
          errorCode: "VALIDATION_ERROR",
          errors: formatZodErrors(error),
        });
      }
      next(error);
    }
  }

  static async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = verifyOtpSchema.parse(req.body);
      const result = await AuthService.verifyOtp(validated.email, validated.otp);
      sendSuccess(res, result, "Email verified successfully.");
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation failed.",
          errorCode: "VALIDATION_ERROR",
          errors: formatZodErrors(error),
        });
      }
      next(error);
    }
  }

  static async resendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = resendOtpSchema.parse(req.body);
      const result = await AuthService.resendOtp(validated.email);
      sendSuccess(res, result, result.message);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation failed.",
          errorCode: "VALIDATION_ERROR",
          errors: formatZodErrors(error),
        });
      }
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await AuthService.login(validated);
      sendSuccess(res, result, "Login successful.");
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation failed.",
          errorCode: "VALIDATION_ERROR",
          errors: formatZodErrors(error),
        });
      }
      next(error);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.getMe(req.user!.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async logout(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.logout();
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }
}
