import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { FacilityOwnerFacilityService } from "./facilityOwner.facility.service";
import {
  createFacilitySchema,
  updateFacilitySchema,
} from "./facilityOwner.facility.validation";
import { sendSuccess } from "../../utils/apiResponse";
import { toPublicUrl } from "../../utils/upload";

/** Reusable Zod error formatter matching the project convention */
const formatZodErrors = (error: ZodError) =>
  error.issues.map((e) => ({ field: e.path.join("."), message: e.message }));

/**
 * Controller for the Facility Owner — Facility Management endpoints.
 *
 * Route prefix: /api/v1/owner/facilities
 * All routes are protected by facilityOwnerAuthMiddleware.
 */
export class FacilityOwnerFacilityController {
  /**
   * GET /api/v1/owner/facilities
   * List all non-deleted facilities belonging to the authenticated owner.
   */
  static async listFacilities(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const ownerId = req.user!.id;
      const result = await FacilityOwnerFacilityService.listFacilities(ownerId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/owner/facilities/:facilityId
   * Get a single facility (ownership-checked).
   */
  static async getFacility(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id;
      const { facilityId } = req.params;
      const result = await FacilityOwnerFacilityService.getFacilityById(
        ownerId,
        facilityId
      );
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/owner/facilities
   * Create a new facility. Accepts multipart/form-data with optional
   * "photos" file field (up to MAX_PHOTOS_PER_FACILITY images).
   */
  static async createFacility(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const ownerId = req.user!.id;

      const validated = createFacilitySchema.parse(req.body);

      // Extract uploaded photo public URLs (multer populated req.files)
      const uploadedFiles = (req.files as Express.Multer.File[]) ?? [];
      const photoUrls = uploadedFiles.map((f) => toPublicUrl(f.path));

      const result = await FacilityOwnerFacilityService.createFacility(
        ownerId,
        validated,
        photoUrls
      );
      sendSuccess(res, result, "Facility created successfully.", 201);
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

  /**
   * PUT /api/v1/owner/facilities/:facilityId
   * Update a facility. Accepts multipart/form-data.
   * New files in "photos" field are appended; pass "removePhotos" to drop old ones.
   */
  static async updateFacility(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const ownerId = req.user!.id;
      const { facilityId } = req.params;

      const validated = updateFacilitySchema.parse(req.body);

      const uploadedFiles = (req.files as Express.Multer.File[]) ?? [];
      const newPhotoUrls = uploadedFiles.map((f) => toPublicUrl(f.path));

      const result = await FacilityOwnerFacilityService.updateFacility(
        ownerId,
        facilityId,
        validated,
        newPhotoUrls
      );
      sendSuccess(res, result, "Facility updated successfully.");
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

  /**
   * DELETE /api/v1/owner/facilities/:facilityId
   * Soft-delete a facility (sets isActive=false, deletedAt=now).
   * Also deactivates all courts under the facility.
   * The document is never hard-deleted from the database.
   */
  static async softDeleteFacility(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const ownerId = req.user!.id;
      const { facilityId } = req.params;

      const result = await FacilityOwnerFacilityService.softDeleteFacility(
        ownerId,
        facilityId
      );
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }
}
