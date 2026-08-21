import { z } from "zod";

/**
 * Allowed fields for profile update.
 * email, role, passwordHash, isActive — NOT editable here.
 */
export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be at most 100 characters")
    .trim()
    .optional(),
  avatar: z
    .string()
    .url("Avatar must be a valid URL")
    .nullable()
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
