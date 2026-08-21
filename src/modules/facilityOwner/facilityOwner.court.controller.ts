import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { FacilityOwnerCourtService } from "./facilityOwner.court.service";
import {
  createCourtSchema,
  updateCourtSchema,
} from "./facilityOwner.court.validation";
import { sendSuccess } from "../../utils/apiResponse";

const formatZodErrors = (error: ZodError) =>
  error.issues.map((e) => ({ field: e.path.join("."), message: e.message }));

/**
 * Controller for the Facility Owner — Court Management endpoints.
 *
 * Route prefix: /api/v1/owner/facilities/:facilityId/courts
 * All routes are protected by facilityOwnerAuthMiddleware.
 */
export class FacilityOwnerCourtController {
  /**
   * GET /api/v1/owner/facilities/:facilityId/courts
   * List all courts under a facility (includes inactive ones for owner view).
   */
  static async listCourts(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id;
      const { facilityId } = req.params;
      const result = await FacilityOwnerCourtService.listCourts(
        ownerId,
        facilityId
      );
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/owner/facilities/:facilityId/courts
   * Add a new court to the facility.
   * Supports tiered pricing via peakPricePerHour / offPeakPricePerHour / peakHours.
   */
  static async createCourt(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id;
      const { facilityId } = req.params;

      const validated = createCourtSchema.parse(req.body);
      const result = await FacilityOwnerCourtService.createCourt(
        ownerId,
        facilityId,
        validated
      );
      sendSuccess(res, result, "Court created successfully.", 201);
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
   * PUT /api/v1/owner/facilities/:facilityId/courts/:courtId
   * Update court details including tiered pricing fields.
   */
  static async updateCourt(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id;
      const { facilityId, courtId } = req.params;

      const validated = updateCourtSchema.parse(req.body);
      const result = await FacilityOwnerCourtService.updateCourt(
        ownerId,
        facilityId,
        courtId,
        validated
      );
      sendSuccess(res, result, "Court updated successfully.");
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
   * DELETE /api/v1/owner/facilities/:facilityId/courts/:courtId
   * Soft-delete (deactivate) a court. Sets isActive=false; never hard-deletes.
   */
  static async softDeleteCourt(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const ownerId = req.user!.id;
      const { facilityId, courtId } = req.params;

      const result = await FacilityOwnerCourtService.softDeleteCourt(
        ownerId,
        facilityId,
        courtId
      );
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }
}
