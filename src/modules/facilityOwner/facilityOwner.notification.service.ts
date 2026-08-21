import mongoose from "mongoose";
import { OwnerNotification } from "./ownerNotification.model";

/**
 * Lightweight notification service for facility owners.
 *
 * Writes a record to the OwnerNotification collection whenever
 * a booking event occurs on one of the owner's courts.
 * This is designed as a fire-and-forget call — callers should
 * not await it on the critical path.
 */
export class OwnerNotificationService {
  /**
   * Persist a notification for the given owner.
   *
   * @param ownerId   - Facility owner's User._id
   * @param type      - Event type: "NEW_BOOKING" | "BOOKING_CANCELLED"
   * @param bookingId - The Booking._id that triggered the event
   * @param message   - Human-readable notification text
   */
  static async trigger(
    ownerId: string,
    type: "NEW_BOOKING" | "BOOKING_CANCELLED",
    bookingId: string,
    message: string
  ): Promise<void> {
    await OwnerNotification.create({
      ownerId: new mongoose.Types.ObjectId(ownerId),
      type,
      bookingId: new mongoose.Types.ObjectId(bookingId),
      message,
    });
  }

  /**
   * List notifications for an owner, newest first.
   * Optionally filter by isRead status.
   */
  static async listForOwner(
    ownerId: string,
    options: { onlyUnread?: boolean; page?: number; limit?: number } = {}
  ) {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      ownerId: new mongoose.Types.ObjectId(ownerId),
    };
    if (options.onlyUnread) filter.isRead = false;

    const [notifications, total] = await Promise.all([
      OwnerNotification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      OwnerNotification.countDocuments(filter),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mark a single notification as read. Verifies ownership.
   */
  static async markRead(ownerId: string, notificationId: string) {
    const notification = await OwnerNotification.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(notificationId),
        ownerId: new mongoose.Types.ObjectId(ownerId),
      },
      { isRead: true },
      { new: true }
    );

    return notification;
  }

  /**
   * Mark ALL unread notifications for an owner as read.
   */
  static async markAllRead(ownerId: string) {
    const result = await OwnerNotification.updateMany(
      { ownerId: new mongoose.Types.ObjectId(ownerId), isRead: false },
      { isRead: true }
    );
    return { updatedCount: result.modifiedCount };
  }
}
