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

const getDoctorById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const doctor = await DoctorService.getDoctorById(id as string);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Doctor fetched successfully",
    data: doctor,
  });
});

const updateDoctor = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const updatedDoctor = await DoctorService.updateDoctor(
    id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Doctor updated successfully",
    data: updatedDoctor,
  });
});

const deleteDoctor = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await DoctorService.deleteDoctor(id as string);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Doctor deleted successfully",
    data: result,
  });
});

export const DoctorController = {
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
};
