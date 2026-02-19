import z from "zod";

export const createSpecialtyZodSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().optional(),
});
