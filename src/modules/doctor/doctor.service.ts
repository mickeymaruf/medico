import status from "http-status";
import { Doctor, Prisma, UserStatus } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { IQueryParams, QueryBuilder } from "../../utils/QueryBuilder";
import {
  doctorFilterableFields,
  doctorIncludeConfig,
  doctorSearchableFields,
} from "./doctor.constant";
import { IUpdateDoctorPayload } from "./doctor.interface";
import { AppError } from "../../utils/AppError";

const getAllDoctors = async (query: IQueryParams) => {
  // const doctors = await prisma.doctor.findMany({
  //   include: {
  //     user: true,
  //     specialties: {
  //       include: {
  //         specialty: true,
  //       },
  //     },
  //   },
  // });
  // return doctors;

  const queryBuilder = new QueryBuilder<
    Doctor,
    Prisma.DoctorWhereInput,
    Prisma.DoctorInclude
  >(prisma.doctor, query, {
    searchableFields: doctorSearchableFields,
    filterableFields: doctorFilterableFields,
  });

  return await queryBuilder
    .search()
    .filter()
    .where({ isDeleted: false })
    .include({
      user: true,
      // specialties: {
      //   include: {
      //     specialty: true,
      //   },
      // },
    })
    .dynamicInclude(doctorIncludeConfig)
    .paginate()
    .sort()
    .fields()
    .execute();
};

const getDoctorById = async (id: string) => {
  return await prisma.doctor.findUnique({
    where: { id },
    include: {
      user: true,
      specialties: {
        include: {
          specialty: true,
        },
      },
      appointments: {
        include: {
          patient: true,
          // schedule: true, ??
          doctorSchedule: true,
          prescription: true,
        },
      },
      doctorSchedules: {
        include: {
          schedule: true,
        },
      },
      reviews: true,
    },
  });
};

const updateDoctor = async (id: string, payload: IUpdateDoctorPayload) => {
  const isDoctorExist = await prisma.doctor.findUnique({
    where: {
      id,
    },
  });

  if (!isDoctorExist) {
    throw new AppError("Doctor not found", status.NOT_FOUND);
  }

  const { doctor: doctorData, specialties } = payload;

  await prisma.$transaction(async (tx) => {
    if (doctorData) {
      await tx.doctor.update({
        where: {
          id,
        },
        data: { ...doctorData },
      });
    }

    if (specialties && specialties.length > 0) {
      const toDelete = specialties
        .filter((s) => s.shouldDelete)
        .map((s) => s.specialtyId);

      const toCreate = specialties
        .filter((s) => !s.shouldDelete)
        .map((s) => ({
          doctorId: id,
          specialtyId: s.specialtyId,
        }));

      await tx.doctorSpecialty.deleteMany({
        where: {
          doctorId: id,
          specialtyId: { in: toDelete },
        },
      });

      await tx.doctorSpecialty.createMany({
        data: toCreate,
        skipDuplicates: true,
      });

      // for (const specialty of specialties) {
      //   const { specialtyId, shouldDelete } = specialty;
      //   if (shouldDelete) {
      //     await tx.doctorSpecialty.delete({
      //       where: {
      //         doctorId_specialtyId: {
      //           doctorId: id,
      //           specialtyId,
      //         },
      //       },
      //     });
      //   } else {
      //     await tx.doctorSpecialty.upsert({
      //       where: {
      //         doctorId_specialtyId: {
      //           doctorId: id,
      //           specialtyId,
      //         },
      //       },
      //       create: {
      //         doctorId: id,
      //         specialtyId,
      //       },
      //       update: {},
      //     });
      //   }
      // }

      const doctor = await getDoctorById(id);

      return doctor;
    }
  });
};

//soft delete
const deleteDoctor = async (id: string) => {
  const isDoctorExist = await prisma.doctor.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!isDoctorExist) {
    throw new AppError("Doctor not found", status.NOT_FOUND);
  }

  await prisma.$transaction(async (tx) => {
    await tx.doctor.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    await tx.user.update({
      where: { id: isDoctorExist.userId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: UserStatus.DELETED, // Optional: you may also want to block the user
      },
    });

    await tx.session.deleteMany({
      where: { userId: isDoctorExist.userId },
    });

    await tx.doctorSpecialty.deleteMany({
      where: { doctorId: id },
    });

    return { message: "Doctor deleted successfully" };
  });
};

export const DoctorService = {
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
};
