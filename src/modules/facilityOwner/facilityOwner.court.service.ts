import mongoose from "mongoose";
import { Court } from "../venues/court.model";
import { Facility } from "../venues/facility.model";
import { NotFoundError, ForbiddenError, BadRequestError } from "../../utils/errors";
import { CreateCourtInput, UpdateCourtInput } from "./facilityOwner.court.validation";

export class FacilityOwnerCourtService {
  // ---------------------------------------------------------------------------
  // Ownership guard helper
  // ---------------------------------------------------------------------------
  /**
   * Verifies that the facility exists, is not soft-deleted, and belongs to
   * the given owner. Throws appropriate AppErrors if the check fails.
   */
  private static async assertFacilityOwnership(
    ownerId: string,
    facilityId: string
  ) {
    const facility = await Facility.findById(facilityId).lean();
    if (!facility || facility.deletedAt !== null) {
      throw new NotFoundError("Facility not found", "FACILITY_NOT_FOUND");
    }
    if (facility.ownerId.toString() !== ownerId) {
      throw new ForbiddenError("You do not own this facility");
    }
    return facility;
  }

  // ---------------------------------------------------------------------------
  // List courts under a facility
  // ---------------------------------------------------------------------------
  /**
   * Returns all courts (active and inactive) for a facility owned by `ownerId`.
   */
  static async listCourts(ownerId: string, facilityId: string) {
    await this.assertFacilityOwnership(ownerId, facilityId);

    const courts = await Court.find({
      facilityId: new mongoose.Types.ObjectId(facilityId),
    })
      .sort({ createdAt: 1 })
      .lean();

    return courts.map((c) => ({
      id: c._id,
      facilityId: c.facilityId,
      name: c.name,
      sportType: c.sportType,
      pricePerHour: c.pricePerHour,
      peakPricePerHour: c.peakPricePerHour,
      offPeakPricePerHour: c.offPeakPricePerHour,
      peakHours: c.peakHours ?? null,
      operatingHours: c.operatingHours,
      isActive: c.isActive,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  // ---------------------------------------------------------------------------
  // Create court
  // ---------------------------------------------------------------------------
  /**
   * Adds a new court to a facility. The court inherits the facility's
   * sport types check (warning only — courts can have any sport type).
   */
  static async createCourt(
    ownerId: string,
    facilityId: string,
    input: CreateCourtInput
  ) {
    await this.assertFacilityOwnership(ownerId, facilityId);

    const court = await Court.create({
      facilityId: new mongoose.Types.ObjectId(facilityId),
      name: input.name,
      sportType: input.sportType,
      pricePerHour: input.pricePerHour,
      peakPricePerHour: input.peakPricePerHour ?? 0,
      offPeakPricePerHour: input.offPeakPricePerHour ?? 0,
      peakHours: input.peakHours ?? null,
      operatingHours: input.operatingHours,
      isActive: true,
    });

    return {
      id: court._id,
      facilityId: court.facilityId,
      name: court.name,
      sportType: court.sportType,
      pricePerHour: court.pricePerHour,
      peakPricePerHour: court.peakPricePerHour,
      offPeakPricePerHour: court.offPeakPricePerHour,
      peakHours: court.peakHours ?? null,
      operatingHours: court.operatingHours,
      isActive: court.isActive,
      createdAt: court.createdAt,
    };
  }

  // ---------------------------------------------------------------------------
  // Update court
  // ---------------------------------------------------------------------------
  /**
   * Updates a court, asserting facility ownership.
   * `isActive` can be toggled directly via this endpoint.
   */
  static async updateCourt(
    ownerId: string,
    facilityId: string,
    courtId: string,
    input: UpdateCourtInput
  ) {
    await this.assertFacilityOwnership(ownerId, facilityId);

    const court = await Court.findById(courtId);
    if (!court) {
      throw new NotFoundError("Court not found", "COURT_NOT_FOUND");
    }
    if (court.facilityId.toString() !== facilityId) {
      throw new BadRequestError(
        "Court does not belong to this facility",
        "COURT_NOT_FOUND"
      );
    }

    if (input.name !== undefined) court.name = input.name;
    if (input.sportType !== undefined) court.sportType = input.sportType;
    if (input.pricePerHour !== undefined) court.pricePerHour = input.pricePerHour;
    if (input.peakPricePerHour !== undefined)
      court.peakPricePerHour = input.peakPricePerHour;
    if (input.offPeakPricePerHour !== undefined)
      court.offPeakPricePerHour = input.offPeakPricePerHour;
    if (input.operatingHours !== undefined)
      court.operatingHours = input.operatingHours;
    if (input.peakHours !== undefined)
      court.peakHours = input.peakHours ?? null;
    if (input.isActive !== undefined) court.isActive = input.isActive;

    await court.save();

    return {
      id: court._id,
      name: court.name,
      sportType: court.sportType,
      pricePerHour: court.pricePerHour,
      peakPricePerHour: court.peakPricePerHour,
      offPeakPricePerHour: court.offPeakPricePerHour,
      peakHours: court.peakHours ?? null,
      operatingHours: court.operatingHours,
      isActive: court.isActive,
      updatedAt: court.updatedAt,
    };
  }

  // ---------------------------------------------------------------------------
  // Soft-delete (deactivate) court
  // ---------------------------------------------------------------------------
  /**
   * Deactivates a court by setting `isActive = false`.
   * The court document is never hard-deleted.
   */
  static async softDeleteCourt(
    ownerId: string,
    facilityId: string,
    courtId: string
  ) {
    await this.assertFacilityOwnership(ownerId, facilityId);

    const court = await Court.findById(courtId);
    if (!court) {
      throw new NotFoundError("Court not found", "COURT_NOT_FOUND");
    }
    if (court.facilityId.toString() !== facilityId) {
      throw new BadRequestError(
        "Court does not belong to this facility",
        "COURT_NOT_FOUND"
      );
    }

    court.isActive = false;
    await court.save();

    return { message: "Court deactivated successfully." };
  }

  // ---------------------------------------------------------------------------
  // Resolve effective price for a given time slot
  // ---------------------------------------------------------------------------
  /**
   * Helper used by slot service: returns the correct rate for a given startTime.
   * - If peakHours is set and startTime falls within it → peakPricePerHour (if > 0)
   * - If peakHours is set and startTime is outside it → offPeakPricePerHour (if > 0)
   * - Otherwise → pricePerHour (base rate)
   */
  static resolvePrice(
    court: {
      pricePerHour: number;
      peakPricePerHour: number;
      offPeakPricePerHour: number;
      peakHours: { start: string; end: string } | null;
    },
    startTime: string
  ): number {
    if (
      court.peakHours &&
      startTime >= court.peakHours.start &&
      startTime < court.peakHours.end
    ) {
      return court.peakPricePerHour > 0
        ? court.peakPricePerHour
        : court.pricePerHour;
    }

    if (court.peakHours && court.offPeakPricePerHour > 0) {
      return court.offPeakPricePerHour;
    }

    return court.pricePerHour;
  }
}
