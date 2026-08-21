import mongoose, { Schema, Document } from "mongoose";

export interface IMaintenanceSlot extends Document {
  courtId: mongoose.Types.ObjectId;
  facilityId: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  /** Human-readable label e.g. "Net repair", "Court resurfacing" */
  title: string;
  /** SINGLE = one-off block on a specific date; RECURRING = repeats by day-of-week */
  blockType: "SINGLE" | "RECURRING";
  /** YYYY-MM-DD — required when blockType is "SINGLE" */
  date?: string;
  /** HH:mm — block start time */
  startTime: string;
  /** HH:mm — block end time */
  endTime: string;
  /** Only present when blockType is "RECURRING" */
  recurringRule?: {
    /** JS day-of-week numbers: 0 = Sunday … 6 = Saturday */
    daysOfWeek: number[];
    /** YYYY-MM-DD — when the recurring rule begins */
    startDate: string;
    /** YYYY-MM-DD — when the recurring rule ends (optional, open-ended if omitted) */
    endDate?: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const maintenanceSlotSchema = new Schema<IMaintenanceSlot>(
  {
    courtId: {
      type: Schema.Types.ObjectId,
      ref: "Court",
      required: true,
    },
    facilityId: {
      type: Schema.Types.ObjectId,
      ref: "Facility",
      required: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    blockType: {
      type: String,
      enum: ["SINGLE", "RECURRING"],
      required: true,
    },
    date: {
      type: String, // YYYY-MM-DD
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    recurringRule: {
      daysOfWeek: { type: [Number] },
      startDate: { type: String },
      endDate: { type: String },
      _id: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

maintenanceSlotSchema.index({ courtId: 1, isActive: 1 });
maintenanceSlotSchema.index({ facilityId: 1, ownerId: 1 });

/**
 * Static helper used by booking.service.ts to detect maintenance conflicts.
 *
 * Returns true if the given [startTime, endTime) window on the given date
 * is blocked by any active maintenance slot on that court.
 */
maintenanceSlotSchema.statics.isSlotBlockedByMaintenance = async function (
  courtId: string,
  dateStr: string,
  startTime: string,
  endTime: string
): Promise<boolean> {
  const dayOfWeek = new Date(dateStr + "T00:00:00").getDay();

  // Check SINGLE blocks on this exact date
  const singleBlock = await MaintenanceSlot.findOne({
    courtId: new mongoose.Types.ObjectId(courtId),
    blockType: "SINGLE",
    date: dateStr,
    isActive: true,
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  });
  if (singleBlock) return true;

  // Check RECURRING blocks that apply to this day of week + date range
  const recurringBlocks = await MaintenanceSlot.find({
    courtId: new mongoose.Types.ObjectId(courtId),
    blockType: "RECURRING",
    isActive: true,
    "recurringRule.daysOfWeek": dayOfWeek,
    "recurringRule.startDate": { $lte: dateStr },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  });

  // Filter: endDate must be absent (open-ended) OR >= dateStr
  const applicable = recurringBlocks.filter((block) => {
    const ed = block.recurringRule?.endDate;
    return !ed || ed >= dateStr;
  });

  return applicable.length > 0;
};

export interface MaintenanceSlotModel
  extends mongoose.Model<IMaintenanceSlot> {
  isSlotBlockedByMaintenance(
    courtId: string,
    dateStr: string,
    startTime: string,
    endTime: string
  ): Promise<boolean>;
}

export const MaintenanceSlot = mongoose.model<
  IMaintenanceSlot,
  MaintenanceSlotModel
>("MaintenanceSlot", maintenanceSlotSchema);
