import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { DoctorService } from "./doctor.service";
import { IQueryParams } from "../../utils/QueryBuilder";

const getAllDoctors = catchAsync(async (req: Request, res: Response) => {
  const result = await DoctorService.getAllDoctors(req.query as IQueryParams);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Doctors fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

// const getDoctorById = catchAsync(
// const updateDoctor = catchAsync(
// const deleteDoctor = catchAsync(

export const DoctorController = {
  getAllDoctors,
  // getDoctorById,
  // updateDoctor,
  // deleteDoctor,
};
