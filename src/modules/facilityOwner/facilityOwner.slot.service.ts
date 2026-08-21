import mongoose from "mongoose";
import { Court } from "../venues/court.model";
import { Facility } from "../venues/facility.model";
import { Booking } from "../bookings/booking.model";
import { MaintenanceSlot } from "./maintenanceSlot.model";
import { NotFoundError, ForbiddenError, BadRequestError } from "../../utils/errors";
import {
  CreateMaintenanceBlockInput,
  UpdateMaintenanceBlockInput,
} from "./facilityOwner.slot.validation";

export class FacilityOwnerSlotService {
  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Assert the facility exists, is not deleted, and is owned by `ownerId`. */
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

  /**
   * Generate all 1-hour slot windows from courtOpen to courtClose.
   * Returns an array of { startTime: "HH:mm", endTime: "HH:mm" }.
   */
  private static generateHourlySlots(
    openTime: string,
    closeTime: string
  ): Array<{ startTime: string; endTime: string }> {
    const slots: Array<{ startTime: string; endTime: string }> = [];
    let [hour] = openTime.split(":").map(Number);
    const [closeHour] = closeTime.split(":").map(Number);

    while (hour < closeHour) {
      const start = `${String(hour).padStart(2, "0")}:00`;
      const end = `${String(hour + 1).padStart(2, "0")}:00`;
      slots.push({ startTime: start, endTime: end });
      hour++;
    }
    return slots;
  }

  // ---------------------------------------------------------------------------
  // Get availability for a court on a given date
  // ---------------------------------------------------------------------------
  /**
   * Returns each 1-hour slot for the given court and date, labelled as:
   * - "AVAILABLE"   — no booking, no maintenance block
   * - "BOOKED"      — a confirmed booking exists
   * - "MAINTENANCE" — a maintenance block covers this slot
   *
   * @param date - YYYY-MM-DD string
   */
  static async getAvailability(
    ownerId: string,
    facilityId: string,
    courtId: string,
    date: string
  ) {
    await this.assertFacilityOwnership(ownerId, facilityId);

    const court = await Court.findById(courtId).lean();
    if (!court) {
      throw new NotFoundError("Court not found", "COURT_NOT_FOUND");
    }
    if (court.facilityId.toString() !== facilityId) {
      throw new BadRequestError(
        "Court does not belong to this facility",
        "COURT_NOT_FOUND"
      );
    }

    const slots = this.generateHourlySlots(
      court.operatingHours.open,
      court.operatingHours.close
    );

    // Fetch all CONFIRMED bookings for this court on this date
    const bookings = await Booking.find({
      courtId: new mongoose.Types.ObjectId(courtId),
      bookingDate: date,
      bookingStatus: "CONFIRMED",
    })
      .select("startTime endTime")
      .lean();

    // Fetch active SINGLE maintenance blocks for this date
    const singleBlocks = await MaintenanceSlot.find({
      courtId: new mongoose.Types.ObjectId(courtId),
      blockType: "SINGLE",
      date,
      isActive: true,
    })
      .select("startTime endTime title")
      .lean();

    // Fetch active RECURRING blocks that apply to this day-of-week
    const dayOfWeek = new Date(date + "T00:00:00").getDay();
    const recurringBlocks = await MaintenanceSlot.find({
      courtId: new mongoose.Types.ObjectId(courtId),
      blockType: "RECURRING",
      isActive: true,
      "recurringRule.daysOfWeek": dayOfWeek,
      "recurringRule.startDate": { $lte: date },
    })
      .select("startTime endTime title recurringRule")
      .lean();

    // Filter recurring blocks: endDate must be absent or >= date
    const activeRecurring = recurringBlocks.filter(
      (b) => !b.recurringRule?.endDate || b.recurringRule.endDate >= date
    );

    // Annotate each slot
    const annotatedSlots = slots.map(({ startTime, endTime }) => {
      // Check booking conflict
      const isBooked = bookings.some(
        (b) => b.startTime < endTime && b.endTime > startTime
      );
      if (isBooked) {
        return { startTime, endTime, status: "BOOKED" as const };
      }

      // Check single maintenance conflict
      const singleBlock = singleBlocks.find(
        (b) => b.startTime < endTime && b.endTime > startTime
      );
      if (singleBlock) {
        return {
          startTime,
          endTime,
          status: "MAINTENANCE" as const,
          maintenanceTitle: singleBlock.title,
        };
      }

      // Check recurring maintenance conflict
      const recurringBlock = activeRecurring.find(
        (b) => b.startTime < endTime && b.endTime > startTime
      );
      if (recurringBlock) {
        return {
          startTime,
          endTime,
          status: "MAINTENANCE" as const,
          maintenanceTitle: recurringBlock.title,
        };
      }

      return { startTime, endTime, status: "AVAILABLE" as const };
    });

    return {
      courtId,
      facilityId,
      date,
      operatingHours: court.operatingHours,
      slots: annotatedSlots,
    };
  }

  // ---------------------------------------------------------------------------
  // Create maintenance block
  // ---------------------------------------------------------------------------
  /**
   * Creates a new SINGLE or RECURRING maintenance block.
   * Validates that the court belongs to a facility owned by `ownerId`.
   */
  static async createMaintenanceBlock(
    ownerId: string,
    input: CreateMaintenanceBlockInput
  ) {
    await this.assertFacilityOwnership(ownerId, input.facilityId);

    const court = await Court.findById(input.courtId).lean();
    if (!court) {
      throw new NotFoundError("Court not found", "COURT_NOT_FOUND");
    }
    if (court.facilityId.toString() !== input.facilityId) {
      throw new BadRequestError(
        "Court does not belong to this facility",
        "COURT_NOT_FOUND"
      );
    }

    const blockData: Record<string, unknown> = {
      courtId: new mongoose.Types.ObjectId(input.courtId),
      facilityId: new mongoose.Types.ObjectId(input.facilityId),
      ownerId: new mongoose.Types.ObjectId(ownerId),
      title: input.title,
      blockType: input.blockType,
      startTime: input.startTime,
      endTime: input.endTime,
      isActive: true,
    };

    if (input.blockType === "SINGLE") {
      blockData.date = input.date;
    } else {
      blockData.recurringRule = input.recurringRule;
    }

    const block = await MaintenanceSlot.create(blockData);
    return block;
  }

  // ---------------------------------------------------------------------------
  // List maintenance blocks (for owner's facilities)
  // ---------------------------------------------------------------------------
  /**
   * Lists all active maintenance blocks for the owner, optionally filtered by
   * facilityId or courtId.
   */
  static async listMaintenanceBlocks(
    ownerId: string,
    filters: { facilityId?: string; courtId?: string; includeInactive?: boolean }
  ) {
    const query: Record<string, unknown> = {
      ownerId: new mongoose.Types.ObjectId(ownerId),
    };

    if (!filters.includeInactive) {
      query.isActive = true;
    }
    if (filters.facilityId) {
      query.facilityId = new mongoose.Types.ObjectId(filters.facilityId);
    }
    if (filters.courtId) {
      query.courtId = new mongoose.Types.ObjectId(filters.courtId);
    }

    const blocks = await MaintenanceSlot.find(query)
      .sort({ createdAt: -1 })
      .populate("courtId", "name sportType")
      .populate("facilityId", "name")
      .lean();

    return blocks;
  }

  // ---------------------------------------------------------------------------
  // Update maintenance block
  // ---------------------------------------------------------------------------
  static async updateMaintenanceBlock(
    ownerId: string,
    blockId: string,
    input: UpdateMaintenanceBlockInput
  ) {
    const block = await MaintenanceSlot.findById(blockId);
    if (!block) {
      throw new NotFoundError(
        "Maintenance block not found",
        "MAINTENANCE_NOT_FOUND"
      );
    }
    if (block.ownerId.toString() !== ownerId) {
      throw new ForbiddenError("You do not own this maintenance block");
    }

    if (input.title !== undefined) block.title = input.title;
    if (input.startTime !== undefined) block.startTime = input.startTime;
    if (input.endTime !== undefined) block.endTime = input.endTime;
    if (input.date !== undefined) block.date = input.date;
    if (input.isActive !== undefined) block.isActive = input.isActive;
    if (input.recurringRule !== undefined && block.recurringRule) {
      if (input.recurringRule.daysOfWeek !== undefined) {
        block.recurringRule.daysOfWeek = input.recurringRule.daysOfWeek;
      }
      if (input.recurringRule.startDate !== undefined) {
        block.recurringRule.startDate = input.recurringRule.startDate;
      }
      if (input.recurringRule.endDate !== undefined) {
        block.recurringRule.endDate = input.recurringRule.endDate;
      }
    }

    await block.save();
    return block;
  }

  // ---------------------------------------------------------------------------
  // Delete (deactivate) maintenance block
  // ---------------------------------------------------------------------------
  static async deleteMaintenanceBlock(ownerId: string, blockId: string) {
    const block = await MaintenanceSlot.findById(blockId);
    if (!block) {
      throw new NotFoundError(
        "Maintenance block not found",
        "MAINTENANCE_NOT_FOUND"
      );
    }
    if (block.ownerId.toString() !== ownerId) {
      throw new ForbiddenError("You do not own this maintenance block");
    }

    block.isActive = false;
    await block.save();

    return { message: "Maintenance block removed." };
  }
}
