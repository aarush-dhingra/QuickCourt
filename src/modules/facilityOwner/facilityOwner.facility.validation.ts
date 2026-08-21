import { z } from "zod";

// ---------------------------------------------------------------------------
// Create Facility
// ---------------------------------------------------------------------------
export const createFacilitySchema = z.object({
  name: z
    .string({ required_error: "Facility name is required" })
    .min(2, "Name must be at least 2 characters")
    .max(100)
    .trim(),
  description: z.string().max(1000).trim().optional().default(""),
  location: z
    .string({ required_error: "Location is required" })
    .min(2, "Location must be at least 2 characters")
    .max(200)
    .trim(),
  address: z.string().max(300).trim().optional().default(""),
  sports: z
    .preprocess(
      // support JSON-stringified arrays from multipart form-data
      (val) => {
        if (typeof val === "string") {
          try {
            return JSON.parse(val);
          } catch {
            return val.split(",").map((s: string) => s.trim());
          }
        }
        return val;
      },
      z.array(z.string().trim()).min(1, "At least one sport type is required")
    ),
  amenities: z
    .preprocess(
      (val) => {
        if (typeof val === "string") {
          try {
            return JSON.parse(val);
          } catch {
            return val.split(",").map((s: string) => s.trim());
          }
        }
        return val ?? [];
      },
      z.array(z.string().trim())
    )
    .optional()
    .default([]),
});

// ---------------------------------------------------------------------------
// Update Facility
// ---------------------------------------------------------------------------
export const updateFacilitySchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  description: z.string().max(1000).trim().optional(),
  location: z.string().min(2).max(200).trim().optional(),
  address: z.string().max(300).trim().optional(),
  sports: z
    .preprocess(
      (val) => {
        if (typeof val === "string") {
          try {
            return JSON.parse(val);
          } catch {
            return val.split(",").map((s: string) => s.trim());
          }
        }
        return val;
      },
      z.array(z.string().trim()).min(1)
    )
    .optional(),
  amenities: z
    .preprocess(
      (val) => {
        if (typeof val === "string") {
          try {
            return JSON.parse(val);
          } catch {
            return val.split(",").map((s: string) => s.trim());
          }
        }
        return val;
      },
      z.array(z.string().trim())
    )
    .optional(),
  /**
   * URLs of existing photos to remove.
   * Pass as JSON array or comma-separated string.
   */
  removePhotos: z
    .preprocess(
      (val) => {
        if (typeof val === "string") {
          try {
            return JSON.parse(val);
          } catch {
            return val.split(",").map((s: string) => s.trim());
          }
        }
        return val ?? [];
      },
      z.array(z.string())
    )
    .optional()
    .default([]),
});

export type CreateFacilityInput = z.infer<typeof createFacilitySchema>;
export type UpdateFacilityInput = z.infer<typeof updateFacilitySchema>;
