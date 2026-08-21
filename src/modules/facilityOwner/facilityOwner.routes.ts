/**
 * Facility Owner API Routes
 *
 * All routes under /api/v1/owner are guarded by facilityOwnerAuthMiddleware,
 * which validates the JWT and enforces role === "FACILITY_OWNER".
 *
 * Route map:
 *   Facilities
 *     GET    /facilities
 *     POST   /facilities                         (multipart/form-data, "photos" field)
 *     GET    /facilities/:facilityId
 *     PUT    /facilities/:facilityId             (multipart/form-data)
 *     DELETE /facilities/:facilityId             (soft-delete)
 *
 *   Courts
 *     GET    /facilities/:facilityId/courts
 *     POST   /facilities/:facilityId/courts
 *     PUT    /facilities/:facilityId/courts/:courtId
 *     DELETE /facilities/:facilityId/courts/:courtId
 *
 *   Slot / Availability
 *     GET    /facilities/:facilityId/courts/:courtId/availability?date=YYYY-MM-DD
 *
 *   Maintenance blocks
 *     POST   /maintenance
 *     GET    /maintenance
 *     PUT    /maintenance/:blockId
 *     DELETE /maintenance/:blockId
 *
 *   Bookings (owner-facing)
 *     GET    /bookings
 *     GET    /bookings/:bookingId
 *
 *   Notifications
 *     GET    /notifications
 *     PATCH  /notifications/read-all
 *     PATCH  /notifications/:notificationId/read
 *
 *   Profile
 *     GET    /profile
 *     PUT    /profile
 *
 *   Dashboard
 *     GET    /dashboard/summary
 *     GET    /dashboard/trends
 *     GET    /dashboard/earnings
 *     GET    /dashboard/peak-hours
 *     GET    /dashboard/growth
 */

import { Router } from "express";
import { facilityOwnerAuthMiddleware } from "../../middleware/facilityOwnerAuth.middleware";
import { facilityPhotoUpload } from "../../utils/upload";

// Controllers
import { FacilityOwnerFacilityController } from "./facilityOwner.facility.controller";
import { FacilityOwnerCourtController } from "./facilityOwner.court.controller";
import { FacilityOwnerSlotController } from "./facilityOwner.slot.controller";
import { FacilityOwnerBookingController } from "./facilityOwner.booking.controller";
import { FacilityOwnerProfileController } from "./facilityOwner.profile.controller";
import { FacilityOwnerDashboardController } from "./facilityOwner.dashboard.controller";

const router = Router();

// ---------------------------------------------------------------------------
// Apply owner auth guard to ALL routes in this router
// ---------------------------------------------------------------------------
router.use(facilityOwnerAuthMiddleware);

// ---------------------------------------------------------------------------
// Facilities
// ---------------------------------------------------------------------------
router.get("/facilities", FacilityOwnerFacilityController.listFacilities);
router.post(
  "/facilities",
  facilityPhotoUpload.array("photos"),
  FacilityOwnerFacilityController.createFacility
);
router.get("/facilities/:facilityId", FacilityOwnerFacilityController.getFacility);
router.put(
  "/facilities/:facilityId",
  facilityPhotoUpload.array("photos"),
  FacilityOwnerFacilityController.updateFacility
);
router.delete(
  "/facilities/:facilityId",
  FacilityOwnerFacilityController.softDeleteFacility
);

// ---------------------------------------------------------------------------
// Courts (nested under facility)
// ---------------------------------------------------------------------------
router.get(
  "/facilities/:facilityId/courts",
  FacilityOwnerCourtController.listCourts
);
router.post(
  "/facilities/:facilityId/courts",
  FacilityOwnerCourtController.createCourt
);
router.put(
  "/facilities/:facilityId/courts/:courtId",
  FacilityOwnerCourtController.updateCourt
);
router.delete(
  "/facilities/:facilityId/courts/:courtId",
  FacilityOwnerCourtController.softDeleteCourt
);

// ---------------------------------------------------------------------------
// Slot availability
// ---------------------------------------------------------------------------
router.get(
  "/facilities/:facilityId/courts/:courtId/availability",
  FacilityOwnerSlotController.getAvailability
);

// ---------------------------------------------------------------------------
// Maintenance blocks
// ---------------------------------------------------------------------------
router.post("/maintenance", FacilityOwnerSlotController.createMaintenanceBlock);
router.get("/maintenance", FacilityOwnerSlotController.listMaintenanceBlocks);
router.put("/maintenance/:blockId", FacilityOwnerSlotController.updateMaintenanceBlock);
router.delete(
  "/maintenance/:blockId",
  FacilityOwnerSlotController.deleteMaintenanceBlock
);

// ---------------------------------------------------------------------------
// Bookings (owner-facing view of bookings on their courts)
// ---------------------------------------------------------------------------
router.get("/bookings", FacilityOwnerBookingController.listBookings);
router.get("/bookings/:bookingId", FacilityOwnerBookingController.getBookingDetail);

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
// NOTE: "read-all" must come before "/:notificationId/read" to avoid Express
// matching "read-all" as a notificationId param.
router.patch(
  "/notifications/read-all",
  FacilityOwnerBookingController.markAllNotificationsRead
);
router.get("/notifications", FacilityOwnerBookingController.listNotifications);
router.patch(
  "/notifications/:notificationId/read",
  FacilityOwnerBookingController.markNotificationRead
);

// ---------------------------------------------------------------------------
// Owner profile
// ---------------------------------------------------------------------------
router.get("/profile", FacilityOwnerProfileController.getProfile);
router.put("/profile", FacilityOwnerProfileController.updateProfile);

// ---------------------------------------------------------------------------
// Dashboard analytics
// ---------------------------------------------------------------------------
router.get("/dashboard/summary", FacilityOwnerDashboardController.getSummary);
router.get("/dashboard/trends", FacilityOwnerDashboardController.getTrends);
router.get("/dashboard/earnings", FacilityOwnerDashboardController.getEarnings);
router.get(
  "/dashboard/peak-hours",
  FacilityOwnerDashboardController.getPeakHours
);
router.get("/dashboard/growth", FacilityOwnerDashboardController.getGrowth);

export default router;
