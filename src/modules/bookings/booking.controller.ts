import { Request, Response, NextFunction } from "express";
import { BookingService } from "./booking.service";
import { sendSuccess } from "../../utils/apiResponse";
import { ZodError, z } from "zod";

const createBookingSchema = z.object({
  facilityId: z.string().min(1, "Facility ID is required"),
  courtId: z.string().min(1, "Court ID is required"),
  bookingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Time must be in HH:mm format"),
});

const cancelBookingSchema = z.object({
  reason: z.string().optional(),
});

const bookingsQuerySchema = z.object({
  status: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10).optional(),
});

export class BookingController {
  static async createBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createBookingSchema.parse(req.body);
      const result = await BookingService.createBooking(req.user!.id, validated);
      sendSuccess(res, result, "Booking confirmed successfully.", 201);
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

  static async getMyBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = bookingsQuerySchema.parse(req.query);
      const result = await BookingService.getMyBookings(req.user!.id, validated);
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

  static async getBookingDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const bookingId = req.params.bookingId as string;
      const result = await BookingService.getBookingDetail(req.user!.id, bookingId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async cancelBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const bookingId = req.params.bookingId as string;
      const validated = cancelBookingSchema.parse(req.body);
      const result = await BookingService.cancelBooking(req.user!.id, bookingId, validated);
      sendSuccess(res, result, result.message);
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
