import mongoose from "mongoose";
import { Booking } from "../bookings/booking.model";
import { Facility } from "../venues/facility.model";
import { Court } from "../venues/court.model";
import { User } from "../users/user.model";
import { NotFoundError, ForbiddenError } from "../../utils/errors";

export class FacilityOwnerBookingService {
  // ---------------------------------------------------------------------------
  // Helper — get all facility IDs owned by this owner (non-deleted)
  // ---------------------------------------------------------------------------
  private static async getOwnerFacilityIds(
    ownerId: string
  ): Promise<mongoose.Types.ObjectId[]> {
    const facilities = await Facility.find({
      ownerId: new mongoose.Types.ObjectId(ownerId),
      deletedAt: null,
    })
      .select("_id")
      .lean();

    return facilities.map((f) => f._id as mongoose.Types.ObjectId);
  }

  // ---------------------------------------------------------------------------
  // List bookings for all owner facilities
  // ---------------------------------------------------------------------------
  /**
   * Returns a paginated list of bookings across ALL of this owner's facilities.
   *
   * Filters:
   *   - status: "CONFIRMED" | "CANCELLED" | "COMPLETED"
   *   - fromDate / toDate: YYYY-MM-DD date range
   *   - facilityId: limit to a specific facility
   *   - courtId: limit to a specific court
   *   - view: "upcoming" | "past" (convenience shortcuts)
   */
  static async listBookings(
    ownerId: string,
    query: {
      status?: string;
      fromDate?: string;
      toDate?: string;
      facilityId?: string;
      courtId?: string;
      view?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const facilityIds = await this.getOwnerFacilityIds(ownerId);
    if (facilityIds.length === 0) {
      return {
        bookings: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };
    }

    // Build filter
    const filter: Record<string, unknown> = {
      facilityId: { $in: facilityIds },
    };

    if (query.facilityId) {
      filter.facilityId = new mongoose.Types.ObjectId(query.facilityId);
    }
    if (query.courtId) {
      filter.courtId = new mongoose.Types.ObjectId(query.courtId);
    }
    if (query.status) {
      filter.bookingStatus = query.status;
    }

    // "upcoming" / "past" convenience views
    const today = new Date().toISOString().slice(0, 10);
    if (query.view === "upcoming") {
      filter.bookingDate = { $gte: today };
      if (!query.status) filter.bookingStatus = "CONFIRMED";
    } else if (query.view === "past") {
      filter.bookingDate = { $lt: today };
    }

    // Explicit date range overrides view
    if (query.fromDate || query.toDate) {
      const range: Record<string, string> = {};
      if (query.fromDate) range.$gte = query.fromDate;
      if (query.toDate) range.$lte = query.toDate;
      filter.bookingDate = range;
    }

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .sort({ bookingDate: -1, startTime: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments(filter),
    ]);

    // Enrich with user name, court name, facility name
    const enriched = await Promise.all(
      bookings.map(async (booking) => {
        const [user, facility, court] = await Promise.all([
          User.findById(booking.userId).select("fullName email").lean(),
          Facility.findById(booking.facilityId).select("name").lean(),
          Court.findById(booking.courtId).select("name").lean(),
        ]);

        // Auto-derive COMPLETED status for display
        let displayStatus = booking.bookingStatus;
        if (booking.bookingStatus === "CONFIRMED") {
          const endDT = new Date(
            `${booking.bookingDate}T${booking.endTime}:00`
          );
          if (endDT < new Date()) displayStatus = "COMPLETED";
        }

        return {
          id: booking._id,
          user: {
            id: booking.userId,
            name: user?.fullName ?? "Unknown User",
            email: user?.email ?? "",
          },
          facility: {
            id: booking.facilityId,
            name: facility?.name ?? "Unknown Facility",
          },
          court: {
            id: booking.courtId,
            name: court?.name ?? "Unknown Court",
          },
          sportType: booking.sportType,
          bookingDate: booking.bookingDate,
          startTime: booking.startTime,
          endTime: booking.endTime,
          amount: booking.amount,
          paymentStatus: booking.paymentStatus,
          status: displayStatus,
          createdAt: booking.createdAt,
        };
      })
    );

    return {
      bookings: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Get single booking detail
  // ---------------------------------------------------------------------------
  /**
   * Returns full detail for a single booking, asserting it belongs to one
   * of the owner's facilities.
   */
  static async getBookingDetail(ownerId: string, bookingId: string) {
    const booking = await Booking.findById(bookingId).lean();
    if (!booking) {
      throw new NotFoundError("Booking not found", "BOOKING_NOT_FOUND");
    }

    // Verify the booking's facility belongs to this owner
    const facility = await Facility.findById(booking.facilityId).lean();
    if (!facility || facility.ownerId.toString() !== ownerId) {
      throw new ForbiddenError("Booking does not belong to your facility");
    }

    const [user, court] = await Promise.all([
      User.findById(booking.userId).select("fullName email").lean(),
      Court.findById(booking.courtId).select("name sportType").lean(),
    ]);

    let displayStatus = booking.bookingStatus;
    if (booking.bookingStatus === "CONFIRMED") {
      const endDT = new Date(`${booking.bookingDate}T${booking.endTime}:00`);
      if (endDT < new Date()) displayStatus = "COMPLETED";
    }

    return {
      id: booking._id,
      user: {
        id: booking.userId,
        name: user?.fullName ?? "Unknown User",
        email: user?.email ?? "",
      },
      facility: {
        id: facility._id,
        name: facility.name,
      },
      court: {
        id: booking.courtId,
        name: court?.name ?? "Unknown Court",
        sportType: court?.sportType ?? booking.sportType,
      },
      bookingDate: booking.bookingDate,
      startTime: booking.startTime,
      endTime: booking.endTime,
      amount: booking.amount,
      paymentStatus: booking.paymentStatus,
      status: displayStatus,
      paymentReference: booking.paymentReference,
      cancelledAt: booking.cancelledAt,
      cancellationReason: booking.cancellationReason,
      createdAt: booking.createdAt,
    };
  }
}
