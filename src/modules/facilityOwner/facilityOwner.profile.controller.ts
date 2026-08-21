import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { FacilityOwnerProfileService } from "./facilityOwner.profile.service";
import { updateProfileSchema } from "./facilityOwner.profile.validation";
import { sendSuccess } from "../../utils/apiResponse";

const formatZodErrors = (error: ZodError) =>
  error.issues.map((e) => ({ field: e.path.join("."), message: e.message }));

/**
 * Controller for the Facility Owner — Profile endpoints.
 *
 *   GET /api/v1/owner/profile  — view profile
 *   PUT /api/v1/owner/profile  — update fullName / avatar
 */
export class FacilityOwnerProfileController {
  /** GET /api/v1/owner/profile */
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id;
      const result = await FacilityOwnerProfileService.getProfile(ownerId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /** PUT /api/v1/owner/profile — updatable fields: fullName, avatar */
  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id;
      const validated = updateProfileSchema.parse(req.body);

      const result = await FacilityOwnerProfileService.updateProfile(
        ownerId,
        validated
      );
      sendSuccess(res, result, "Profile updated successfully.");
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
}
