import mongoose, { Schema, Document } from "mongoose";

export interface ICourt extends Document {
  facilityId: mongoose.Types.ObjectId;
  name: string;
  sportType: string;
  /** Base price — used when tiered pricing is not configured */
  pricePerHour: number;
  /** Peak-hour price (e.g. evening rate). 0 = not set, falls back to pricePerHour */
  peakPricePerHour: number;
  /** Off-peak price (e.g. morning rate). 0 = not set, falls back to pricePerHour */
  offPeakPricePerHour: number;
  /** Time window that counts as "peak" e.g. { start: "17:00", end: "21:00" } */
  peakHours: {
    start: string;
    end: string;
  } | null;
  operatingHours: {
    open: string;
    close: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const courtSchema = new Schema<ICourt>(
  {
    facilityId: {
      type: Schema.Types.ObjectId,
      ref: "Facility",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sportType: {
      type: String,
      required: true,
    },
    pricePerHour: {
      type: Number,
      required: true,
      min: 0,
    },
    /** Peak-hour rate — 0 means not configured */
    peakPricePerHour: {
      type: Number,
      min: 0,
      default: 0,
    },
    /** Off-peak rate — 0 means not configured */
    offPeakPricePerHour: {
      type: Number,
      min: 0,
      default: 0,
    },
    /** Optional peak time window */
    peakHours: {
      start: { type: String },
      end: { type: String },
      _id: false,
      default: null,
    },
    operatingHours: {
      open: {
        type: String,
        required: true,
        default: "06:00",
      },
      close: {
        type: String,
        required: true,
        default: "22:00",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

courtSchema.index({ facilityId: 1, isActive: 1 });

export const Court = mongoose.model<ICourt>("Court", courtSchema);
