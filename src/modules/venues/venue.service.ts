import { Facility } from "./facility.model";
import { Court } from "./court.model";
import { Booking } from "../bookings/booking.model";
import { NotFoundError, BadRequestError } from "../../utils/errors";

export class VenueService {
  static async listVenues(query: {
    search?: string;
    sport?: string;
    minPrice?: number;
    maxPrice?: number;
    venueType?: string;
    rating?: number;
    page?: number;
    limit?: number;
    sort?: string;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const filter: any = {
      approvalStatus: "APPROVED",
      isActive: true,
    };

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: "i" } },
        { location: { $regex: query.search, $options: "i" } },
      ];
    }

    if (query.sport) {
      filter.sports = { $in: [query.sport.toUpperCase()] };
    }

    if (query.rating) {
      filter.rating = { $gte: query.rating };
    }

    // Get venues with courts to filter by price
    let venues = await Facility.find(filter).lean();

    // If price filter, we need to check court prices
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      const venueIds = venues.map((v) => v._id);
      const courts = await Court.find({
        facilityId: { $in: venueIds },
        isActive: true,
      }).lean();

      const courtsByFacility: Record<string, any[]> = {};
      for (const court of courts) {
        const fid = court.facilityId.toString();
        if (!courtsByFacility[fid]) courtsByFacility[fid] = [];
        courtsByFacility[fid].push(court);
      }

      venues = venues.filter((venue) => {
        const venueCourts = courtsByFacility[venue._id.toString()] || [];
        if (venueCourts.length === 0) return false;
        const minCourtPrice = Math.min(...venueCourts.map((c) => c.pricePerHour));
        if (query.minPrice !== undefined && minCourtPrice < query.minPrice) return false;
        if (query.maxPrice !== undefined && minCourtPrice > query.maxPrice) return false;
        return true;
      });
    }

    // Sort
    if (query.sort) {
      const sortField = query.sort.startsWith("-") ? query.sort.slice(1) : query.sort;
      const sortDir = query.sort.startsWith("-") ? -1 : 1;
      venues.sort((a: any, b: any) => {
        if (a[sortField] < b[sortField]) return -1 * sortDir;
        if (a[sortField] > b[sortField]) return 1 * sortDir;
        return 0;
      });
    }

    const total = venues.length;
    const paginatedVenues = venues.slice(skip, skip + limit);

    // Enrich with startingPrice from courts
    const enrichedVenues = await Promise.all(
      paginatedVenues.map(async (venue) => {
        const courts = await Court.find({
          facilityId: venue._id,
          isActive: true,
        })
          .select("pricePerHour")
          .lean();

        const startingPrice =
          courts.length > 0
            ? Math.min(...courts.map((c) => c.pricePerHour))
            : 0;

        return {
          id: venue._id,
          name: venue.name,
          sports: venue.sports,
          startingPrice,
          location: venue.location,
          rating: venue.rating,
          reviewCount: venue.reviewCount,
          thumbnail: venue.photos?.[0] || null,
        };
      })
    );

    return {
      venues: enrichedVenues,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getPopularVenues() {
    const venues = await Facility.find({
      approvalStatus: "APPROVED",
      isActive: true,
    })
      .sort({ bookingCount: -1, rating: -1 })
      .limit(10)
      .lean();

    const enrichedVenues = await Promise.all(
      venues.map(async (venue) => {
        const courts = await Court.find({
          facilityId: venue._id,
          isActive: true,
        })
          .select("pricePerHour")
          .lean();

        const startingPrice =
          courts.length > 0
            ? Math.min(...courts.map((c) => c.pricePerHour))
            : 0;

        return {
          id: venue._id,
          name: venue.name,
          sports: venue.sports,
          startingPrice,
          location: venue.location,
          rating: venue.rating,
          reviewCount: venue.reviewCount,
          thumbnail: venue.photos?.[0] || null,
        };
      })
    );

    return enrichedVenues;
  }

  static async getPopularSports() {
    const venues = await Facility.find({
      approvalStatus: "APPROVED",
      isActive: true,
    })
      .select("sports")
      .lean();

    const sportCounts: Record<string, number> = {};
    for (const venue of venues) {
      for (const sport of venue.sports) {
        sportCounts[sport] = (sportCounts[sport] || 0) + 1;
      }
    }

    return Object.entries(sportCounts)
      .map(([sport, venueCount]) => ({ sport, venueCount }))
      .sort((a, b) => b.venueCount - a.venueCount);
  }

  static async getVenueDetail(venueId: string) {
    const facility = await Facility.findById(venueId).lean();
    if (!facility) {
      throw new NotFoundError("Venue not found", "VENUE_NOT_FOUND");
    }

    if (facility.approvalStatus !== "APPROVED" || !facility.isActive) {
      throw new NotFoundError("Venue not found", "VENUE_NOT_FOUND");
    }

    const courts = await Court.find({
      facilityId: venueId,
      isActive: true,
    })
      .select("name sportType pricePerHour")
      .lean();

    return {
      id: facility._id,
      name: facility.name,
      description: facility.description,
      address: facility.address,
      location: facility.location,
      sports: facility.sports,
      amenities: facility.amenities,
      photos: facility.photos,
      rating: facility.rating,
      reviewCount: facility.reviewCount,
      courts: courts.map((c) => ({
        id: c._id,
        name: c.name,
        sportType: c.sportType,
        pricePerHour: c.pricePerHour,
      })),
      reviews: [],
    };
  }

  static async getCourtAvailability(
    venueId: string,
    courtId: string,
    date: string
  ) {
    // Validate facility
    const facility = await Facility.findById(venueId).lean();
    if (!facility) {
      throw new NotFoundError("Venue not found", "VENUE_NOT_FOUND");
    }
    if (facility.approvalStatus !== "APPROVED" || !facility.isActive) {
      throw new BadRequestError("Venue is not available", "VENUE_NOT_APPROVED");
    }

    // Validate court
    const court = await Court.findById(courtId).lean();
    if (!court) {
      throw new NotFoundError("Court not found", "COURT_NOT_FOUND");
    }
    if (!court.isActive) {
      throw new BadRequestError("Court is not active", "COURT_INACTIVE");
    }
    if (court.facilityId.toString() !== venueId) {
      throw new BadRequestError("Court does not belong to this venue", "COURT_NOT_FOUND");
    }

    // Validate date - not in the past
    const requestDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (requestDate < today) {
      throw new BadRequestError("Cannot check availability for past dates", "INVALID_BOOKING_DATE");
    }

    // Generate time slots from operating hours
    const openHour = parseInt(court.operatingHours.open.split(":")[0], 10);
    const closeHour = parseInt(court.operatingHours.close.split(":")[0], 10);

    const slots: Array<{
      startTime: string;
      endTime: string;
      price: number;
      available: boolean;
    }> = [];

    // Get existing confirmed bookings for this court on this date
    const existingBookings = await Booking.find({
      courtId: courtId,
      bookingDate: date,
      bookingStatus: "CONFIRMED",
    })
      .select("startTime endTime")
      .lean();

    const bookedSlots = new Set(
      existingBookings.map((b) => `${b.startTime}-${b.endTime}`)
    );

    // Check if it's today - filter past slots
    const now = new Date();
    const isToday = requestDate.toDateString() === now.toDateString();

    for (let hour = openHour; hour < closeHour; hour++) {
      const startTime = `${hour.toString().padStart(2, "0")}:00`;
      const endTime = `${(hour + 1).toString().padStart(2, "0")}:00`;

      let available = true;

      // Check if slot is in the past (for today)
      if (isToday) {
        const slotStart = new Date(date);
        slotStart.setHours(hour, 0, 0, 0);
        if (slotStart <= now) {
          available = false;
        }
      }

      // Check if slot is booked
      if (available && bookedSlots.has(`${startTime}-${endTime}`)) {
        available = false;
      }

      slots.push({
        startTime,
        endTime,
        price: court.pricePerHour,
        available,
      });
    }

    return {
      venueId,
      courtId,
      date,
      slots,
    };
  }
}
