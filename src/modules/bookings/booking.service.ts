import { Booking } from "./booking.model";
import { Facility } from "../venues/facility.model";
import { Court } from "../venues/court.model";
import { PaymentService } from "../payments/payment.service";
import { CreateBookingInput, CancelBookingInput } from "../payments/payment.types";
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
} from "../../utils/errors";
// Facility-owner integration: maintenance conflict check + booking notification
import { MaintenanceSlot } from "../facilityOwner/maintenanceSlot.model";
import { OwnerNotificationService } from "../facilityOwner/facilityOwner.notification.service";

export class BookingService {
  static async createBooking(userId: string, input: CreateBookingInput) {
    // 1. Validate facility
    const facility = await Facility.findById(input.facilityId).lean();
    if (!facility) {
      throw new NotFoundError("Venue not found", "VENUE_NOT_FOUND");
    }
    if (facility.approvalStatus !== "APPROVED" || !facility.isActive) {
      throw new BadRequestError("Venue is not available for booking", "VENUE_NOT_APPROVED");
    }

    // 2. Validate court
    const court = await Court.findById(input.courtId).lean();
    if (!court) {
      throw new NotFoundError("Court not found", "COURT_NOT_FOUND");
    }
    if (!court.isActive) {
      throw new BadRequestError("Court is not active", "COURT_INACTIVE");
    }
    if (court.facilityId.toString() !== input.facilityId) {
      throw new BadRequestError("Court does not belong to this venue", "COURT_NOT_FOUND");
    }

    // 3. Validate date
    const bookingDate = new Date(input.bookingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (bookingDate < today) {
      throw new BadRequestError("Cannot book for past dates", "INVALID_BOOKING_DATE");
    }

    // 4. Validate time format
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(input.startTime)) {
      throw new BadRequestError("Invalid time format. Use HH:mm", "INVALID_BOOKING_TIME");
    }

    const startHour = parseInt(input.startTime.split(":")[0], 10);
    const startMinute = parseInt(input.startTime.split(":")[1], 10);

    // Calculate end time (1 hour slot)
    const endHour = startHour + 1;
    const endTime = `${endHour.toString().padStart(2, "0")}:${startMinute.toString().padStart(2, "0")}`;

    // 5. Validate operating hours
    const openHour = parseInt(court.operatingHours.open.split(":")[0], 10);
    const closeHour = parseInt(court.operatingHours.close.split(":")[0], 10);

    if (startHour < openHour || endHour > closeHour) {
      throw new BadRequestError(
        "Slot is outside court operating hours",
        "INVALID_BOOKING_TIME"
      );
    }

    // 6. Check if it's today and slot hasn't passed
    const isToday = bookingDate.toDateString() === today.toDateString();
    if (isToday) {
      const now = new Date();
      const slotStart = new Date(input.bookingDate);
      slotStart.setHours(startHour, startMinute, 0, 0);
      if (slotStart <= now) {
        throw new BadRequestError("Cannot book a slot that has already started", "INVALID_BOOKING_TIME");
      }
    }

    // 7. Check for existing booking (concurrency protection via unique index)
    const existingBooking = await Booking.findOne({
      courtId: input.courtId,
      bookingDate: input.bookingDate,
      startTime: input.startTime,
      endTime,
      bookingStatus: "CONFIRMED",
    });

    if (existingBooking) {
      throw new ConflictError("Court is already booked for this time slot", "SLOT_UNAVAILABLE");
    }

    // 7a. Check maintenance blocks — reject if this slot is under maintenance
    const isUnderMaintenance = await MaintenanceSlot.isSlotBlockedByMaintenance(
      input.courtId,
      input.bookingDate,
      input.startTime,
      endTime
    );
    if (isUnderMaintenance) {
      throw new ConflictError(
        "This court slot is blocked for maintenance",
        "SLOT_UNDER_MAINTENANCE"
      );
    }

    // 8. Calculate price from court (server-side)
    const amount = court.pricePerHour;

    // 9. Process simulated payment
    const paymentResult = await PaymentService.processPayment(amount);

    // 10. Create booking
    if (paymentResult.status === "SUCCESS") {
      const booking = await Booking.create({
        userId,
        facilityId: input.facilityId,
        courtId: input.courtId,
        sportType: court.sportType,
        bookingDate: input.bookingDate,
        startTime: input.startTime,
        endTime,
        amount,
        paymentStatus: "SUCCESS",
        bookingStatus: "CONFIRMED",
        paymentReference: paymentResult.paymentId,
      });

      // Increment facility booking count
      await Facility.findByIdAndUpdate(input.facilityId, {
        $inc: { bookingCount: 1 },
      });

      // Notify the facility owner about this new booking (fire-and-forget)
      void OwnerNotificationService.trigger(
        facility.ownerId.toString(),
        "NEW_BOOKING",
        (booking._id as import("mongoose").Types.ObjectId).toString(),
        `New booking for "${facility.name}" — Court: ${court.name}, ` +
          `Date: ${booking.bookingDate}, Time: ${booking.startTime}–${endTime}`
      ).catch((err) =>
        console.error("[Notification] Failed to trigger owner notification:", err)
      );

      return {
        id: booking._id,
        facility: {
          id: facility._id,
          name: facility.name,
        },
        court: {
          id: court._id,
          name: court.name,
        },
        sportType: booking.sportType,
        bookingDate: booking.bookingDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
        amount: booking.amount,
        paymentStatus: booking.paymentStatus,
        bookingStatus: booking.bookingStatus,
        paymentReference: booking.paymentReference,
      };
    } else {
      // Payment failed - create failed booking (or skip)
      throw new BadRequestError("Payment failed", "PAYMENT_FAILED");
    }
  }

  static async getMyBookings(
    userId: string,
    query: {
      status?: string;
      fromDate?: string;
      toDate?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const filter: any = { userId };

    if (query.status) {
      filter.bookingStatus = query.status;
    }

    if (query.fromDate || query.toDate) {
      filter.bookingDate = {};
      if (query.fromDate) filter.bookingDate.$gte = query.fromDate;
      if (query.toDate) filter.bookingDate.$lte = query.toDate;
    }

    const total = await Booking.countDocuments(filter);
    const bookings = await Booking.find(filter)
      .sort({ bookingDate: -1, startTime: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Enrich with venue and court names
    const enrichedBookings = await Promise.all(
      bookings.map(async (booking) => {
        const [facility, court] = await Promise.all([
          Facility.findById(booking.facilityId).select("name").lean(),
          Court.findById(booking.courtId).select("name").lean(),
        ]);

        // Determine display status
        let displayStatus = booking.bookingStatus;
        if (booking.bookingStatus === "CONFIRMED") {
          const endDateTime = new Date(`${booking.bookingDate}T${booking.endTime}:00`);
          if (endDateTime < new Date()) {
            displayStatus = "COMPLETED";
          }
        }

        return {
          id: booking._id,
          venueName: facility?.name || "Unknown Venue",
          sportType: booking.sportType,
          courtName: court?.name || "Unknown Court",
          bookingDate: booking.bookingDate,
          startTime: booking.startTime,
          endTime: booking.endTime,
          status: displayStatus,
          amount: booking.amount,
        };
      })
    );

    return {
      bookings: enrichedBookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getBookingDetail(userId: string, bookingId: string) {
    const booking = await Booking.findById(bookingId).lean();
    if (!booking) {
      throw new NotFoundError("Booking not found", "BOOKING_NOT_FOUND");
    }

    if (booking.userId.toString() !== userId) {
      throw new NotFoundError("Booking not found", "BOOKING_NOT_FOUND");
    }

    const [facility, court] = await Promise.all([
      Facility.findById(booking.facilityId).select("name").lean(),
      Court.findById(booking.courtId).select("name").lean(),
    ]);

    // Determine display status
    let displayStatus = booking.bookingStatus;
    if (booking.bookingStatus === "CONFIRMED") {
      const endDateTime = new Date(`${booking.bookingDate}T${booking.endTime}:00`);
      if (endDateTime < new Date()) {
        displayStatus = "COMPLETED";
      }
    }

    return {
      id: booking._id,
      facility: {
        id: facility?._id || booking.facilityId,
        name: facility?.name || "Unknown Venue",
      },
      court: {
        id: court?._id || booking.courtId,
        name: court?.name || "Unknown Court",
      },
      sportType: booking.sportType,
      bookingDate: booking.bookingDate,
      startTime: booking.startTime,
      endTime: booking.endTime,
      amount: booking.amount,
      paymentStatus: booking.paymentStatus,
      bookingStatus: displayStatus,
      paymentReference: booking.paymentReference,
    };
  }

  static async cancelBooking(userId: string, bookingId: string, input: CancelBookingInput) {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new NotFoundError("Booking not found", "BOOKING_NOT_FOUND");
    }

    if (booking.userId.toString() !== userId) {
      throw new NotFoundError("Booking not found", "BOOKING_NOT_FOUND");
    }

    if (booking.bookingStatus === "CANCELLED") {
      throw new BadRequestError("Booking is already cancelled", "BOOKING_ALREADY_CANCELLED");
    }

    if (booking.bookingStatus === "COMPLETED") {
      throw new BadRequestError("Cannot cancel a completed booking", "BOOKING_ALREADY_COMPLETED");
    }

    // Check cancellation window - must be before booking start time
    const bookingStartDateTime = new Date(`${booking.bookingDate}T${booking.startTime}:00`);
    if (new Date() >= bookingStartDateTime) {
      throw new BadRequestError(
        "Cannot cancel booking after the start time",
        "CANCELLATION_NOT_ALLOWED"
      );
    }

    booking.bookingStatus = "CANCELLED";
    booking.paymentStatus = "REFUNDED";
    booking.cancelledAt = new Date();
    booking.cancellationReason = input.reason || null;
    await booking.save();

    return {
      id: booking._id,
      bookingStatus: booking.bookingStatus,
      paymentStatus: booking.paymentStatus,
      message: "Booking cancelled successfully. Refund will be processed.",
    };
  }
}
