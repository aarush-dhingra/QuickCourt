import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { FacilityOwnerSlotService } from "./facilityOwner.slot.service";
import {
  availabilityQuerySchema,
  createMaintenanceBlockSchema,
  updateMaintenanceBlockSchema,
} from "./facilityOwner.slot.validation";
import { sendSuccess } from "../../utils/apiResponse";

const formatZodErrors = (error: ZodError) =>
  error.issues.map((e) => ({ field: e.path.join("."), message: e.message }));

/**
 * Controller for the Facility Owner — Time Slot & Maintenance endpoints.
 *
 * Availability:
 *   GET  /api/v1/owner/facilities/:facilityId/courts/:courtId/availability?date=YYYY-MM-DD
 *
 * Maintenance blocks:
 *   POST   /api/v1/owner/maintenance
 *   GET    /api/v1/owner/maintenance
 *   PUT    /api/v1/owner/maintenance/:blockId
 *   DELETE /api/v1/owner/maintenance/:blockId
 */
export class FacilityOwnerSlotController {
  /**
   * GET /api/v1/owner/facilities/:facilityId/courts/:courtId/availability
   * Returns each hourly slot for the court on the requested date, with
   * status: "AVAILABLE" | "BOOKED" | "MAINTENANCE".
   */
  static async getAvailability(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const ownerId = req.user!.id;
      const { facilityId, courtId } = req.params;
      const { date } = availabilityQuerySchema.parse(req.query);

      const result = await FacilityOwnerSlotService.getAvailability(
        ownerId,
        facilityId,
        courtId,
        date
      );
      sendSuccess(res, result);
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
   * POST /api/v1/owner/maintenance
   * Create a SINGLE or RECURRING maintenance block for a court.
   */
  static async createMaintenanceBlock(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const ownerId = req.user!.id;
      const validated = createMaintenanceBlockSchema.parse(req.body);

      const result = await FacilityOwnerSlotService.createMaintenanceBlock(
        ownerId,
        validated
      );
      sendSuccess(res, result, "Maintenance block created.", 201);
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
   * GET /api/v1/owner/maintenance
   * List maintenance blocks for the authenticated owner.
   * Query params: facilityId?, courtId?, includeInactive?
   */
  static async listMaintenanceBlocks(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const ownerId = req.user!.id;
      const {
        facilityId,
        courtId,
        includeInactive,
      } = req.query as Record<string, string | undefined>;

      const result = await FacilityOwnerSlotService.listMaintenanceBlocks(
        ownerId,
        {
          facilityId,
          courtId,
          includeInactive: includeInactive === "true",
        }
      );
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/owner/maintenance/:blockId
   * Update an existing maintenance block.
   */
  static async updateMaintenanceBlock(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const ownerId = req.user!.id;
      const { blockId } = req.params;
      const validated = updateMaintenanceBlockSchema.parse(req.body);

      const result = await FacilityOwnerSlotService.updateMaintenanceBlock(
        ownerId,
        blockId,
        validated
      );
      sendSuccess(res, result, "Maintenance block updated.");
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
   * DELETE /api/v1/owner/maintenance/:blockId
   * Deactivate (soft-remove) a maintenance block.
   */
  static async deleteMaintenanceBlock(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const ownerId = req.user!.id;
      const { blockId } = req.params;

      const result = await FacilityOwnerSlotService.deleteMaintenanceBlock(
        ownerId,
        blockId
      );
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }
}
