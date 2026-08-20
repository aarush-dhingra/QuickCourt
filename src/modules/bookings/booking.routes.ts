import { Router } from "express";
import { BookingController } from "./booking.controller";
import { authMiddleware } from "../../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.post("/", BookingController.createBooking);
router.get("/", BookingController.getMyBookings);
router.get("/:bookingId", BookingController.getBookingDetail);
router.patch("/:bookingId/cancel", BookingController.cancelBooking);

export default router;
