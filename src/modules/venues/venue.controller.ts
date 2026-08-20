import { Request, Response, NextFunction } from "express";
import { VenueService } from "./venue.service";
import { venueQuerySchema, availabilityQuerySchema } from "./venue.validation";
import { sendSuccess } from "../../utils/apiResponse";
import { ZodError } from "zod";

export class VenueController {
  static async listVenues(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = venueQuerySchema.parse(req.query);
      const result = await VenueService.listVenues(validated);
      sendSuccess(res, result);
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

  static async getPopularVenues(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await VenueService.getPopularVenues();
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async getPopularSports(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await VenueService.getPopularSports();
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async getVenueDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const venueId = req.params.venueId as string;
      const result = await VenueService.getVenueDetail(venueId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async getCourtAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const venueId = req.params.venueId as string;
      const courtId = req.params.courtId as string;
      const validated = availabilityQuerySchema.parse(req.query);
      const result = await VenueService.getCourtAvailability(venueId, courtId, validated.date);
      sendSuccess(res, result);
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
