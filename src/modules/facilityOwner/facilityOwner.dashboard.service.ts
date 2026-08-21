import mongoose from "mongoose";
import { Facility } from "../venues/facility.model";
import { Court } from "../venues/court.model";
import { Booking } from "../bookings/booking.model";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get all facility ObjectIds for an owner (excluding soft-deleted). */
async function getOwnerFacilityIds(
  ownerId: string
): Promise<mongoose.Types.ObjectId[]> {
  const facilities = await Facility.find({
    ownerId: new mongoose.Types.ObjectId(ownerId),
    deletedAt: null,
  })
    .select("_id")
    .lean();
  return facilities.map((f) => f._id as mongoose.Types.ObjectId);
}

/** ISO week start (Monday) for a given date. */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day); // adjust to Monday
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + diff);
  return d;
}

/** Format a Date to "YYYY-MM-DD". */
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------
export class FacilityOwnerDashboardService {
  // ---------------------------------------------------------------------------
  // 1. Summary card
  // ---------------------------------------------------------------------------
  /**
   * Returns top-level KPIs scoped to this owner's facilities:
   *   - totalFacilities, activeFacilities
   *   - totalCourts, activeCourts
   *   - totalBookings, confirmedBookings, completedBookings, cancelledBookings
   *   - totalEarnings (sum of amount where paymentStatus = "SUCCESS")
   */
  static async getSummary(ownerId: string) {
    const facilityIds = await getOwnerFacilityIds(ownerId);

    const [
      totalFacilities,
      activeFacilities,
      totalCourts,
      activeCourts,
      bookingAgg,
    ] = await Promise.all([
      Facility.countDocuments({
        ownerId: new mongoose.Types.ObjectId(ownerId),
        deletedAt: null,
      }),
      Facility.countDocuments({
        ownerId: new mongoose.Types.ObjectId(ownerId),
        deletedAt: null,
        isActive: true,
      }),
      Court.countDocuments({ facilityId: { $in: facilityIds } }),
      Court.countDocuments({
        facilityId: { $in: facilityIds },
        isActive: true,
      }),
      // Single aggregation for all booking stats
      Booking.aggregate([
        { $match: { facilityId: { $in: facilityIds } } },
        {
          $group: {
            _id: null,
            totalBookings: { $sum: 1 },
            confirmedBookings: {
              $sum: { $cond: [{ $eq: ["$bookingStatus", "CONFIRMED"] }, 1, 0] },
            },
            cancelledBookings: {
              $sum: { $cond: [{ $eq: ["$bookingStatus", "CANCELLED"] }, 1, 0] },
            },
            completedBookings: {
              $sum: { $cond: [{ $eq: ["$bookingStatus", "COMPLETED"] }, 1, 0] },
            },
            totalEarnings: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "SUCCESS"] }, "$amount", 0],
              },
            },
          },
        },
      ]),
    ]);

    const stats = bookingAgg[0] ?? {
      totalBookings: 0,
      confirmedBookings: 0,
      cancelledBookings: 0,
      completedBookings: 0,
      totalEarnings: 0,
    };

    return {
      facilities: {
        total: totalFacilities,
        active: activeFacilities,
      },
      courts: {
        total: totalCourts,
        active: activeCourts,
      },
      bookings: {
        total: stats.totalBookings,
        confirmed: stats.confirmedBookings,
        cancelled: stats.cancelledBookings,
        completed: stats.completedBookings,
      },
      earnings: {
        total: stats.totalEarnings,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // 2. Booking & earnings trend (for line / bar charts)
  // ---------------------------------------------------------------------------
  /**
   * Returns daily, weekly, or monthly aggregated booking counts and earnings.
   *
   * @param period - "daily" | "weekly" | "monthly"
   * @param fromDate - YYYY-MM-DD (default: 30 days ago)
   * @param toDate   - YYYY-MM-DD (default: today)
   */
  static async getTrends(
    ownerId: string,
    period: "daily" | "weekly" | "monthly" = "daily",
    fromDate?: string,
    toDate?: string
  ) {
    const facilityIds = await getOwnerFacilityIds(ownerId);
    const to = toDate ?? toDateStr(new Date());
    const from =
      fromDate ??
      (() => {
        const d = new Date();
        d.setDate(d.getDate() - (period === "monthly" ? 180 : 30));
        return toDateStr(d);
      })();

    const matchStage = {
      $match: {
        facilityId: { $in: facilityIds },
        paymentStatus: "SUCCESS",
        bookingDate: { $gte: from, $lte: to },
      },
    };

    let groupId: Record<string, unknown>;

    if (period === "daily") {
      groupId = { date: "$bookingDate" };
    } else if (period === "weekly") {
      // Group by ISO week (year-week)
      groupId = {
        year: {
          $isoWeekYear: {
            $dateFromString: { dateString: "$bookingDate" },
          },
        },
        week: {
          $isoWeek: {
            $dateFromString: { dateString: "$bookingDate" },
          },
        },
      };
    } else {
      // monthly — group by YYYY-MM
      groupId = {
        yearMonth: { $substr: ["$bookingDate", 0, 7] },
      };
    }

    const results = await Booking.aggregate([
      matchStage,
      {
        $group: {
          _id: groupId,
          bookings: { $sum: 1 },
          earnings: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.date": 1, "_id.yearMonth": 1, "_id.year": 1, "_id.week": 1 } },
    ]);

    return {
      period,
      fromDate: from,
      toDate: to,
      data: results.map((r) => ({
        label:
          period === "daily"
            ? r._id.date
            : period === "monthly"
            ? r._id.yearMonth
            : `${r._id.year}-W${String(r._id.week).padStart(2, "0")}`,
        bookings: r.bookings,
        earnings: r.earnings,
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // 3. Earnings by facility (for bar / doughnut charts)
  // ---------------------------------------------------------------------------
  /**
   * Returns total earnings per facility owned by this owner.
   */
  static async getEarnings(ownerId: string, fromDate?: string, toDate?: string) {
    const facilityIds = await getOwnerFacilityIds(ownerId);

    const dateFilter: Record<string, string> = {};
    if (fromDate) dateFilter.$gte = fromDate;
    if (toDate) dateFilter.$lte = toDate;

    const matchStage: Record<string, unknown> = {
      facilityId: { $in: facilityIds },
      paymentStatus: "SUCCESS",
    };
    if (fromDate || toDate) matchStage.bookingDate = dateFilter;

    const results = await Booking.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$facilityId",
          totalEarnings: { $sum: "$amount" },
          totalBookings: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "facilities",
          localField: "_id",
          foreignField: "_id",
          as: "facility",
        },
      },
      { $unwind: { path: "$facility", preserveNullAndEmpty: true } },
      {
        $project: {
          facilityId: "$_id",
          facilityName: "$facility.name",
          totalEarnings: 1,
          totalBookings: 1,
        },
      },
      { $sort: { totalEarnings: -1 } },
    ]);

    return {
      fromDate: fromDate ?? null,
      toDate: toDate ?? null,
      data: results,
    };
  }

  // ---------------------------------------------------------------------------
  // 4. Peak booking hours (for heatmap / area charts)
  // ---------------------------------------------------------------------------
  /**
   * Returns booking count grouped by hour-of-day (0–23).
   * Useful for rendering a heatmap or area chart of busiest times.
   */
  static async getPeakHours(ownerId: string, fromDate?: string, toDate?: string) {
    const facilityIds = await getOwnerFacilityIds(ownerId);

    const matchStage: Record<string, unknown> = {
      facilityId: { $in: facilityIds },
      paymentStatus: "SUCCESS",
    };
    if (fromDate || toDate) {
      const range: Record<string, string> = {};
      if (fromDate) range.$gte = fromDate;
      if (toDate) range.$lte = toDate;
      matchStage.bookingDate = range;
    }

    const results = await Booking.aggregate([
      { $match: matchStage },
      {
        $addFields: {
          // Extract hour from "HH:mm" startTime string
          hour: { $toInt: { $substr: ["$startTime", 0, 2] } },
        },
      },
      {
        $group: {
          _id: "$hour",
          bookings: { $sum: 1 },
          earnings: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill in missing hours with 0 so the chart has a complete 0–23 array
    const hourMap = new Map(results.map((r) => [r._id as number, r]));
    const data = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: `${String(hour).padStart(2, "0")}:00`,
      bookings: hourMap.get(hour)?.bookings ?? 0,
      earnings: hourMap.get(hour)?.earnings ?? 0,
    }));

    return { fromDate: fromDate ?? null, toDate: toDate ?? null, data };
  }

  // ---------------------------------------------------------------------------
  // 5. Week-over-week growth
  // ---------------------------------------------------------------------------
  /**
   * Compares current week vs previous week for:
   *   - bookings count
   *   - earnings (paymentStatus = "SUCCESS")
   *
   * Returns percentage change (null if previous week had 0 data).
   */
  static async getGrowth(ownerId: string) {
    const facilityIds = await getOwnerFacilityIds(ownerId);

    const now = new Date();
    const thisWeekStart = getWeekStart(now);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);

    const thisWeekStr = toDateStr(thisWeekStart);
    const lastWeekStartStr = toDateStr(lastWeekStart);
    const lastWeekEndStr = toDateStr(lastWeekEnd);
    const todayStr = toDateStr(now);

    const [thisWeek, lastWeek] = await Promise.all([
      Booking.aggregate([
        {
          $match: {
            facilityId: { $in: facilityIds },
            bookingDate: { $gte: thisWeekStr, $lte: todayStr },
          },
        },
        {
          $group: {
            _id: null,
            bookings: { $sum: 1 },
            earnings: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "SUCCESS"] }, "$amount", 0],
              },
            },
          },
        },
      ]),
      Booking.aggregate([
        {
          $match: {
            facilityId: { $in: facilityIds },
            bookingDate: { $gte: lastWeekStartStr, $lte: lastWeekEndStr },
          },
        },
        {
          $group: {
            _id: null,
            bookings: { $sum: 1 },
            earnings: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "SUCCESS"] }, "$amount", 0],
              },
            },
          },
        },
      ]),
    ]);

    const cur = thisWeek[0] ?? { bookings: 0, earnings: 0 };
    const prev = lastWeek[0] ?? { bookings: 0, earnings: 0 };

    const pct = (cur: number, prev: number): number | null => {
      if (prev === 0) return cur > 0 ? 100 : null;
      return parseFloat((((cur - prev) / prev) * 100).toFixed(2));
    };

    return {
      currentWeek: {
        start: thisWeekStr,
        end: todayStr,
        bookings: cur.bookings,
        earnings: cur.earnings,
      },
      previousWeek: {
        start: lastWeekStartStr,
        end: lastWeekEndStr,
        bookings: prev.bookings,
        earnings: prev.earnings,
      },
      growth: {
        bookingsPct: pct(cur.bookings, prev.bookings),
        earningsPct: pct(cur.earnings, prev.earnings),
      },
    };
  }
}
