import { Request, Response, NextFunction } from "express";
import { FacilityOwnerDashboardService } from "./facilityOwner.dashboard.service";
import { sendSuccess } from "../../utils/apiResponse";
import { BadRequestError } from "../../utils/errors";

/**
 * Controller for the Facility Owner — Dashboard Analytics endpoints.
 * All data is scoped strictly to the authenticated owner's facilities.
 *
 *   GET /api/v1/owner/dashboard/summary     — KPI cards
 *   GET /api/v1/owner/dashboard/trends      — line/bar chart data
 *   GET /api/v1/owner/dashboard/earnings    — bar/doughnut chart data
 *   GET /api/v1/owner/dashboard/peak-hours  — heatmap/area chart data
 *   GET /api/v1/owner/dashboard/growth      — week-over-week % change
 */
export class FacilityOwnerDashboardController {
  /**
   * GET /api/v1/owner/dashboard/summary
   * Returns total bookings, active courts, total earnings, facility counts.
   */
  static async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id;
      const result = await FacilityOwnerDashboardService.getSummary(ownerId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/owner/dashboard/trends
   * Query params:
   *   period   — "daily" (default) | "weekly" | "monthly"
   *   fromDate — YYYY-MM-DD
   *   toDate   — YYYY-MM-DD
   *
   * Response: array of { label, bookings, earnings } for line/bar charts.
   */
  static async getTrends(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id;
      const { period, fromDate, toDate } = req.query as Record<
        string,
        string | undefined
      >;

      const validPeriods = ["daily", "weekly", "monthly"] as const;
      type Period = (typeof validPeriods)[number];

      if (period && !validPeriods.includes(period as Period)) {
        throw new BadRequestError(
          "period must be one of: daily, weekly, monthly",
          "INVALID_QUERY"
        );
      }

      const result = await FacilityOwnerDashboardService.getTrends(
        ownerId,
        (period as Period) ?? "daily",
        fromDate,
        toDate
      );
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/owner/dashboard/earnings
   * Query params: fromDate?, toDate?
   *
   * Response: earnings broken down per facility — for bar/doughnut charts.
   */
  static async getEarnings(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id;
      const { fromDate, toDate } = req.query as Record<
        string,
        string | undefined
      >;
      const result = await FacilityOwnerDashboardService.getEarnings(
        ownerId,
        fromDate,
        toDate
      );
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/owner/dashboard/peak-hours
   * Query params: fromDate?, toDate?
   *
   * Response: booking count + earnings per hour (0–23) — for heatmap/area charts.
   */
  static async getPeakHours(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id;
      const { fromDate, toDate } = req.query as Record<
        string,
        string | undefined
      >;
      const result = await FacilityOwnerDashboardService.getPeakHours(
        ownerId,
        fromDate,
        toDate
      );
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/owner/dashboard/growth
   * No query params — compares current calendar week vs previous week.
   *
   * Response: { currentWeek, previousWeek, growth: { bookingsPct, earningsPct } }
   */
  static async getGrowth(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id;
      const result = await FacilityOwnerDashboardService.getGrowth(ownerId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}
