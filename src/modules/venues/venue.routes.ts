import { Router } from "express";
import { VenueController } from "./venue.controller";
import { authMiddleware } from "../../middleware/auth.middleware";

const router = Router();

router.get("/popular", VenueController.getPopularVenues);
router.get("/popular-sports", VenueController.getPopularSports);
router.get("/", VenueController.listVenues);
router.get("/:venueId", VenueController.getVenueDetail);
router.get(
  "/:venueId/courts/:courtId/availability",
  authMiddleware,
  VenueController.getCourtAvailability
);

export default router;
