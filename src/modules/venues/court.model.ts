import mongoose, { Schema, Document } from "mongoose";

export interface ICourt extends Document {
  facilityId: mongoose.Types.ObjectId;
  name: string;
  sportType: string;
  pricePerHour: number;
  operatingHours: {
    open: string;
    close: string;
  };
  isActive: boolean;
  createdAt: Date;
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
