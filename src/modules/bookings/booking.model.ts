import mongoose, { Schema, Document } from "mongoose";

export interface IBooking extends Document {
  userId: mongoose.Types.ObjectId;
  facilityId: mongoose.Types.ObjectId;
  courtId: mongoose.Types.ObjectId;
  sportType: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  amount: number;
  paymentStatus: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
  bookingStatus: "CONFIRMED" | "CANCELLED" | "COMPLETED";
  paymentReference: string | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    facilityId: {
      type: Schema.Types.ObjectId,
      ref: "Facility",
      required: true,
    },
    courtId: {
      type: Schema.Types.ObjectId,
      ref: "Court",
      required: true,
    },
    sportType: {
      type: String,
      required: true,
    },
    bookingDate: {
      type: String,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED", "REFUNDED"],
      default: "PENDING",
    },
    bookingStatus: {
      type: String,
      enum: ["CONFIRMED", "CANCELLED", "COMPLETED"],
      default: "CONFIRMED",
    },
    paymentReference: {
      type: String,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
bookingSchema.index({ userId: 1, bookingDate: 1 });
bookingSchema.index({ facilityId: 1, bookingDate: 1 });
bookingSchema.index({ courtId: 1, bookingDate: 1, startTime: 1, endTime: 1 }, { unique: true });

export const Booking = mongoose.model<IBooking>("Booking", bookingSchema);
