import { z } from "zod";

export const venueQuerySchema = z.object({
  search: z.string().optional(),
  sport: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  venueType: z.string().optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10).optional(),
  sort: z.string().optional(),
});

export const availabilityQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
});
