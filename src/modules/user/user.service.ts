import status from "http-status";
import { Specialty } from "../../../generated/prisma/client";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { ICreateAdminPayload, ICreateDoctorPayload } from "./user.interface";
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
    // consider faster way of creating doctor and setting relation
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

const createAdmin = async (payload: ICreateAdminPayload) => {
  //TODO: Validate who is creating the admin user. Only super admin can create admin user and only super admin can create super admin user but admin user cannot create super admin user

  const userExists = await prisma.user.findUnique({
    where: {
      email: payload.admin.email,
    },
  });

  if (userExists) {
    throw new AppError("User with this email already exists", status.CONFLICT);
  }

  const { admin, role, password } = payload;

  const userData = await auth.api.signUpEmail({
    body: {
      ...admin,
      password,
      role,
      needPasswordChange: true,
    },
  });

  try {
    const adminData = await prisma.admin.create({
      data: {
        userId: userData.user.id,
        ...admin,
      },
    });

    return adminData;
  } catch (error: any) {
    console.log("Error creating admin: ", error);
    await prisma.user.delete({
      where: {
        id: userData.user.id,
      },
    });
    throw error;
  }
};

export const UserService = {
  createDoctor,
  createAdmin,
};
