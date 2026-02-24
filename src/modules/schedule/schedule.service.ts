import { prisma } from "../../lib/prisma";
import { IQueryParams, QueryBuilder } from "../../utils/QueryBuilder";
import {
  ICreateSchedulePayload,
  IUpdateSchedulePayload,
} from "./schedule.interface";
import { addHours, addMinutes } from "date-fns";
import { convertDateTime } from "./schedule.utils";
import { Prisma, Schedule } from "../../../generated/prisma/client";
import { doctorIncludeConfig } from "../doctor/doctor.constant";
import { scheduleFilterableFields } from "./schedule.constant";

const createSchedule = async (payload: ICreateSchedulePayload) => {
  const {
    startDate: startDateString,
    endDate: endDateString,
    startTime,
    endTime,
  } = payload;

  const interval = 30;

  const currentDate = new Date(startDateString);
  const endDate = new Date(endDateString);
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  const schedules = [];

  while (currentDate <= endDate) {
    // const startDateTime = new Date(
    //   addMinutes(
    //     addHours(
    //       `${format(currentDate, "yyyy-MM-dd")}`,
    //       Number(startTime.split(":")[0]),
    //     ),
    //     Number(startTime.split(":")[1]),
    //   ),
    // );

    // const endDateTime = new Date(
    //   addMinutes(
    //     addHours(
    //       `${format(currentDate, "yyyy-MM-dd")}`,
    //       Number(endTime.split(":")[0]),
    //     ),
    //     Number(endTime.split(":")[1]),
    //   ),
    // );

    const startDateTime = addMinutes(
      addHours(currentDate, startHour),
      startMinute,
    );
    // prettier-ignore
    const endDateTime = addMinutes(
      addHours(currentDate, endHour),
      endMinute
    );

    while (startDateTime <= endDateTime) {
      const s = convertDateTime(startDateTime);
      const e = convertDateTime(addMinutes(startDateTime, interval));

      const scheduleData = {
        startDateTime: s,
        endDateTime: e,
      };

      const existingSchedule = await prisma.schedule.findFirst({
        where: {
          startDateTime: scheduleData.startDateTime,
          endDateTime: scheduleData.endDateTime,
        },
      });

      if (!existingSchedule) {
        const result = await prisma.schedule.create({
          data: scheduleData,
        });
        schedules.push(result);
      }

      schedules.push(scheduleData);

      startDateTime.setMinutes(startDateTime.getMinutes() + interval);
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return schedules;
};

const getAllSchedules = async (query: IQueryParams) => {
  const queryBuilder = new QueryBuilder<
    Schedule,
    Prisma.ScheduleWhereInput,
    Prisma.ScheduleInclude
  >(prisma.schedule, query, {
    searchableFields: scheduleFilterableFields,
    filterableFields: scheduleFilterableFields,
  });

  const result = await queryBuilder
    .search()
    .filter()
    .paginate()
    .dynamicInclude(doctorIncludeConfig)
    .sort()
    .fields()
    .execute();

  return result;
};

const getScheduleById = async (id: string) => {
  const schedule = await prisma.schedule.findUnique({
    where: {
      id: id,
    },
  });
  return schedule;
};

const updateSchedule = async (
  id: string,
  { startDate, endDate, startTime, endTime }: IUpdateSchedulePayload,
) => {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  // setting the hours and minutes together with the date
  const startDateTime = addMinutes(addHours(startDate, startHour), startMinute);
  const endDateTime = addMinutes(addHours(endDate, endHour), endMinute);

  // TODO: prevent the time conflicts

  const updatedSchedule = await prisma.schedule.update({
    where: { id },
    data: { startDateTime, endDateTime },
  });

  return updatedSchedule;
};

const deleteSchedule = async (id: string) => {
  await prisma.schedule.delete({
    where: {
      id: id,
    },
  });
  return true;
};

export const ScheduleService = {
  createSchedule,
  getAllSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
};

// better version
// export const createSchedule = async (payload: ICreateSchedulePayload) => {
//   const {
//     startDate,
//     endDate,
//     startTime,
//     endTime,
//     interval = 30,
//     timezone = "Asia/Dhaka",
//   } = payload;

//   const schedulesToCreate = [];

//   const [startHour, startMinute] = startTime.split(":").map(Number);
//   const [endHour, endMinute] = endTime.split(":").map(Number);

//   let currentDate = new Date(startDate);
//   const lastDate = new Date(endDate);

//   while (currentDate <= lastDate) {
//     // Build local DateTime for current day in BDT (or provided timezone)
//     const localStart = new Date(currentDate);
//     localStart.setHours(startHour, startMinute, 0, 0);

//     const localEnd = new Date(currentDate);
//     localEnd.setHours(endHour, endMinute, 0, 0);

//     let slotStart = localStart;

//     while (slotStart < localEnd) {
//       const slotEnd = addMinutes(slotStart, interval);

//       // Convert the local slot to UTC for DB storage
//       const startUtc = zonedTimeToUtc(slotStart, timezone); // import { zonedTimeToUtc } from "date-fns-tz";
//       const endUtc = zonedTimeToUtc(slotEnd, timezone);

//       schedulesToCreate.push({
//         startDateTime: startUtc,
//         endDateTime: endUtc,
//       });

//       slotStart = slotEnd;
//     }

//     // Next day
//     currentDate.setDate(currentDate.getDate() + 1);
//   }

//   // Bulk insert
//   const created = await prisma.schedule.createMany({
//     data: schedulesToCreate,
//     skipDuplicates: true,
//   });

//   return created;
// };
