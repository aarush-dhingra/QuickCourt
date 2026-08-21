import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const timeString = z
  .string()
  .regex(timeRegex, "Time must be in HH:mm format (24-hour)");

// ---------------------------------------------------------------------------
// Create Court
// ---------------------------------------------------------------------------
export const createCourtSchema = z
  .object({
    name: z
      .string({ error: "Court name is required" })
      .min(1, "Court name cannot be empty")
      .max(100)
      .trim(),
    sportType: z
      .string({ error: "Sport type is required" })
      .min(1)
      .trim(),
    /** Base / standard hourly rate */
    pricePerHour: z.coerce
      .number({ error: "pricePerHour is required" })
      .min(0, "Price cannot be negative"),
    /**
     * Optional peak-hour rate. When > 0 and peakHours is configured,
     * this rate applies during the peak window.
     */
    peakPricePerHour: z.coerce.number().min(0).optional().default(0),
    /**
     * Optional off-peak rate. When > 0 and peakHours is configured,
     * this rate applies outside the peak window.
     */
    offPeakPricePerHour: z.coerce.number().min(0).optional().default(0),
    operatingHours: z
      .object({
        open: timeString,
        close: timeString,
      })
      .optional()
      .default({ open: "06:00", close: "22:00" }),
    /** Optional peak time window — e.g. { start: "17:00", end: "21:00" } */
    peakHours: z
      .object({
        start: timeString,
        end: timeString,
      })
      .nullable()
      .optional(),
  })
  .refine(
    (data) => data.operatingHours.open < data.operatingHours.close,
    {
      message: "Operating hours: open time must be before close time",
      path: ["operatingHours"],
    }
  )
  .refine(
    (data) =>
      !data.peakHours || data.peakHours.start < data.peakHours.end,
    {
      message: "Peak hours: start must be before end",
      path: ["peakHours"],
    }
  );

// ---------------------------------------------------------------------------
// Update Court (all fields optional)
// ---------------------------------------------------------------------------
export const updateCourtSchema = z
  .object({
    name: z.string().min(1).max(100).trim().optional(),
    sportType: z.string().min(1).trim().optional(),
    pricePerHour: z.coerce.number().min(0).optional(),
    peakPricePerHour: z.coerce.number().min(0).optional(),
    offPeakPricePerHour: z.coerce.number().min(0).optional(),
    operatingHours: z
      .object({
        open: timeString,
        close: timeString,
      })
      .optional(),
    peakHours: z
      .object({
        start: timeString,
        end: timeString,
      })
      .nullable()
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) =>
      !data.operatingHours ||
      data.operatingHours.open < data.operatingHours.close,
    {
      message: "Operating hours: open time must be before close time",
      path: ["operatingHours"],
    }
  )
  .refine(
    (data) =>
      !data.peakHours || data.peakHours.start < data.peakHours.end,
    {
      message: "Peak hours: start must be before end",
      path: ["peakHours"],
    }
  );

export type CreateCourtInput = z.infer<typeof createCourtSchema>;
export type UpdateCourtInput = z.infer<typeof updateCourtSchema>;
