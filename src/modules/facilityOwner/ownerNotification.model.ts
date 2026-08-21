import mongoose, { Schema, Document } from "mongoose";

export interface IOwnerNotification extends Document {
  /** The facility owner who receives this notification */
  ownerId: mongoose.Types.ObjectId;
  /** Event type that triggered this notification */
  type: "NEW_BOOKING" | "BOOKING_CANCELLED";
  /** The booking this notification is about */
  bookingId: mongoose.Types.ObjectId;
  /** Human-readable notification message */
  message: string;
  /** Whether the owner has read/acknowledged this notification */
  isRead: boolean;
  createdAt: Date;
}

const ownerNotificationSchema = new Schema<IOwnerNotification>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["NEW_BOOKING", "BOOKING_CANCELLED"],
      required: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

ownerNotificationSchema.index({ ownerId: 1, isRead: 1, createdAt: -1 });

export const OwnerNotification = mongoose.model<IOwnerNotification>(
  "OwnerNotification",
  ownerNotificationSchema
);
