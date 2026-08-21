import { Request, Response, NextFunction } from "express";
import { FacilityOwnerBookingService } from "./facilityOwner.booking.service";
import { OwnerNotificationService } from "./facilityOwner.notification.service";
import { sendSuccess } from "../../utils/apiResponse";
import { NotFoundError } from "../../utils/errors";

/**
 * Controller for the Facility Owner — Booking Overview & Notifications.
 *
 * Bookings:
 *   GET /api/v1/owner/bookings              — list all bookings on owner's courts
 *   GET /api/v1/owner/bookings/:bookingId   — single booking detail
 *
 * Notifications:
 *   GET   /api/v1/owner/notifications                    — list notifications
 *   PATCH /api/v1/owner/notifications/:id/read           — mark one as read
 *   PATCH /api/v1/owner/notifications/read-all           — mark all as read
 */
export class FacilityOwnerBookingController {
  /**
   * GET /api/v1/owner/bookings
   *
   * Query params:
   *   view        — "upcoming" | "past"  (convenience shortcuts)
   *   status      — "CONFIRMED" | "CANCELLED" | "COMPLETED"
   *   fromDate    — YYYY-MM-DD
   *   toDate      — YYYY-MM-DD
   *   facilityId  — filter to one facility
   *   courtId     — filter to one court
   *   page        — default 1
   *   limit       — default 20, max 100
   */
  static async listBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id;
      const {
        view,
        status,
        fromDate,
        toDate,
        facilityId,
        courtId,
        page,
        limit,
      } = req.query as Record<string, string | undefined>;

      const result = await FacilityOwnerBookingService.listBookings(ownerId, {
        view,
        status,
        fromDate,
        toDate,
        facilityId,
        courtId,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      });

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/owner/bookings/:bookingId
   * Returns full detail for a single booking (only if it's on an owner's court).
   */
  static async getBookingDetail(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const ownerId = req.user!.id;
      const { bookingId } = req.params;

      const result = await FacilityOwnerBookingService.getBookingDetail(
        ownerId,
        bookingId
      );
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/owner/notifications
   * Query params: onlyUnread=true, page, limit
   */
  static async listNotifications(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const ownerId = req.user!.id;
      const { onlyUnread, page, limit } = req.query as Record<
        string,
        string | undefined
      >;

      const result = await OwnerNotificationService.listForOwner(ownerId, {
        onlyUnread: onlyUnread === "true",
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      });

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/owner/notifications/:notificationId/read
   * Mark a single notification as read.
   */
  static async markNotificationRead(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const ownerId = req.user!.id;
      const { notificationId } = req.params;

      const notification = await OwnerNotificationService.markRead(
        ownerId,
        notificationId
      );

      if (!notification) {
        throw new NotFoundError("Notification not found", "NOTIFICATION_NOT_FOUND");
      }

      sendSuccess(res, notification, "Notification marked as read.");
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/owner/notifications/read-all
   * Mark all unread notifications for this owner as read.
   */
  static async markAllNotificationsRead(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const ownerId = req.user!.id;
      const result = await OwnerNotificationService.markAllRead(ownerId);
      sendSuccess(res, result, "All notifications marked as read.");
    } catch (error) {
      next(error);
    }
  }
}
