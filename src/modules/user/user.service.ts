import status from "http-status";
import { Specialty } from "../../../generated/prisma/client";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { ICreateDoctorPayload } from "./user.interface";
import { AppError } from "../../utils/AppError";

const createDoctor = async (payload: ICreateDoctorPayload) => {
  const specialties: Specialty[] = [];

  for (const specialtyId of payload.specialties) {
    const specialty = await prisma.specialty.findUnique({
      where: {
        id: specialtyId,
      },
    });
    if (!specialty) {
      throw new AppError(
        `Specialty with id ${specialtyId} not found`,
        status.NOT_FOUND,
      );
    }
    specialties.push(specialty);
  }

  const data = await auth.api.signUpEmail({
    body: {
      email: payload.doctor.email,
      password: payload.password,
      name: payload.doctor.name,
      role: Role.DOCTOR,
      needPasswordChange: true,
    },
  });

  try {
    //   const doctor = await prisma.doctor.create({
    //     data: {
    //       userId: data.user.id,
    //       ...payload.doctor,
    //       specialties: {
    //         create: payload.specialties.map((specialtyId) => ({
    //           specialty: {
    //             connect: {
    //               id: specialtyId,
    //             },
    //           },
    //         })),
    //       },
    //     },
    //     include: {...},
    //   });

    const result = await prisma.$transaction(async (tx) => {
      const doctor = await tx.doctor.create({
        data: {
          userId: data.user.id,
          ...payload.doctor,
        },
      });

      await tx.doctorSpecialty.createMany({
        data: specialties.map((specialty) => ({
          doctorId: doctor.id,
          specialtyId: specialty.id,
        })),
      });

      return await tx.doctor.findUnique({
        where: {
          id: doctor.id,
        },
        include: {
          user: true,
          specialties: {
            select: {
              specialty: {
                select: {
                  title: true,
                  id: true,
                },
              },
            },
          },
        },
      });
    });

    return result;
  } catch (error) {
    console.log("Transaction error : ", error);
    await prisma.user.delete({
      where: {
        id: data.user.id,
      },
    });
    throw error;
  }
};

export const UserService = {
  createDoctor,
};
