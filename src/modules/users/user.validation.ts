import { z } from "zod";

export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be at most 100 characters")
    .trim()
    .optional(),
  avatar: z.string().url("Invalid URL").nullish().optional(),
});
