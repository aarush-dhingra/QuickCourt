import { z } from "zod";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const dateStr = z
  .string()
  .regex(dateRegex, "Date must be in YYYY-MM-DD format");
const timeStr = z
  .string()
  .regex(timeRegex, "Time must be in HH:mm format (24-hour)");

// ---------------------------------------------------------------------------
// Get availability for a court on a date
// ---------------------------------------------------------------------------
export const availabilityQuerySchema = z.object({
  date: dateStr,
});

// ---------------------------------------------------------------------------
// Create maintenance block (SINGLE or RECURRING)
// ---------------------------------------------------------------------------
export const createMaintenanceBlockSchema = z
  .discriminatedUnion("blockType", [
    // --- SINGLE block ---
    z.object({
      blockType: z.literal("SINGLE"),
      courtId: z.string().min(1, "courtId is required"),
      facilityId: z.string().min(1, "facilityId is required"),
      title: z.string().min(1, "Title is required").max(100).trim(),
      date: dateStr,
      startTime: timeStr,
      endTime: timeStr,
    }),
    // --- RECURRING block ---
    z.object({
      blockType: z.literal("RECURRING"),
      courtId: z.string().min(1, "courtId is required"),
      facilityId: z.string().min(1, "facilityId is required"),
      title: z.string().min(1, "Title is required").max(100).trim(),
      startTime: timeStr,
      endTime: timeStr,
      recurringRule: z.object({
        daysOfWeek: z
          .array(z.number().int().min(0).max(6))
          .min(1, "At least one day of the week is required"),
        startDate: dateStr,
        endDate: dateStr.optional(),
      }),
    }),
  ])
  .refine(
    (data) => data.startTime < data.endTime,
    { message: "startTime must be before endTime", path: ["startTime"] }
  );

// ---------------------------------------------------------------------------
// Update maintenance block
// ---------------------------------------------------------------------------
export const updateMaintenanceBlockSchema = z
  .object({
    title: z.string().min(1).max(100).trim().optional(),
    startTime: timeStr.optional(),
    endTime: timeStr.optional(),
    date: dateStr.optional(),
    recurringRule: z
      .object({
        daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).optional(),
        startDate: dateStr.optional(),
        endDate: dateStr.optional(),
      })
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) =>
      !data.startTime || !data.endTime || data.startTime < data.endTime,
    { message: "startTime must be before endTime", path: ["startTime"] }
  );

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
export type CreateMaintenanceBlockInput = z.infer<
  typeof createMaintenanceBlockSchema
>;
export type UpdateMaintenanceBlockInput = z.infer<
  typeof updateMaintenanceBlockSchema
>;
