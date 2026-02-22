import z from "zod";
import { Gender } from "../../../generated/prisma/enums";

export const updateDoctorZodSchema = z.object({
  doctor: z
    .object({
      name: z
        .string("Name is required")
        .min(5, "Name must be at least 5 characters")
        .max(30, "Name cannot be upper than 30 characters"),

      contactNumber: z
        .string("Contact number is required")
        .min(11, "Contact number must be at least 11 characters")
        .max(14, "Contact number must be most 14 characters"),

      address: z
        .string("Address is required")
        .min(10, "Address must be at least 10 characters")
        .max(100, "Address must be at most 100 characters")
        .optional(),

      registrationNumber: z.string("Registration number is required"),

      experience: z
        .int("Experience must be an integer")
        .nonnegative("Experience cannot be negative")
        .optional(),

      gender: z.enum(
        [Gender.MALE, Gender.FEMALE],
        "Gender must be either MALE or FEMALE",
      ),

      appointmentFee: z
        .number("Appointment fee must be a number")
        .nonnegative("Appointment fee cannot be negative"),

      qualification: z
        .string("Qualification is required")
        .min(2, "Qualification must be at least 2 characters")
        .max(50, "Qualification must be at most 50 characters"),

      currentWorkingPlace: z
        .string("Current working place is required")
        .min(2, "Current working place must be at least 2 characters")
        .max(50, "Current working place must be at most 50 characters"),

      designation: z
        .string("Designation is required")
        .min(2, "Designation must be at least 2 characters")
        .max(50, "Designation must be at most 50 characters"),
    })
    .optional(),

  specialties: z.array(
    z
      .object({
        specialtyId: z.uuid("Specialty ID must be a valid UUID"),
        shouldDelete: z.boolean("shouldDelete must be a boolean").optional(),
      })
      .optional(),
  ),
});
