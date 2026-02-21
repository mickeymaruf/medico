import { Doctor, Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { IQueryParams, QueryBuilder } from "../../utils/QueryBuilder";
import {
  doctorFilterableFields,
  doctorIncludeConfig,
  doctorSearchableFields,
} from "./doctor.constant";

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

// const getDoctorById = async (id: string) => {}

// const updateDoctor = async (id: string, payload: IUpdateDoctorPayload) => {}

// const deleteDoctor = async (id: string) => {} //soft delete

export const DoctorService = {
  getAllDoctors,
};
