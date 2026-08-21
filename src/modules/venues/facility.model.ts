import mongoose, { Schema, Document } from "mongoose";

export interface IFacility extends Document {
  ownerId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  location: string;
  address: string;
  sports: string[];
  amenities: string[];
  photos: string[];
  rating: number;
  reviewCount: number;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  isActive: boolean;
  bookingCount: number;
  /** Soft-delete timestamp — null means the facility is not deleted */
  deletedAt: Date | null;
  /** Audit trail — ID of the user who last modified this facility */
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const facilitySchema = new Schema<IFacility>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      default: "",
    },
    sports: {
      type: [String],
      default: [],
    },
    amenities: {
      type: [String],
      default: [],
    },
    photos: {
      type: [String],
      default: [],
    },
    rating: {
      type: Number,
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    approvalStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    bookingCount: {
      type: Number,
      default: 0,
    },
    /** Soft-delete: set to a Date when the facility is deleted, null otherwise */
    deletedAt: {
      type: Date,
      default: null,
    },
    /** Audit trail: the User._id of whoever last updated this document */
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

facilitySchema.index({ approvalStatus: 1, isActive: 1 });
facilitySchema.index({ sports: 1 });
facilitySchema.index({ location: 1 });
facilitySchema.index({ rating: 1 });
facilitySchema.index({ bookingCount: -1 });
// Index for efficient soft-delete queries
facilitySchema.index({ ownerId: 1, deletedAt: 1 });

export const Facility = mongoose.model<IFacility>("Facility", facilitySchema);
