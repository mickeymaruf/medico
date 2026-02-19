import { SpecialtyService } from "./specialty.service";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";

const createSpecialty = catchAsync(async (req, res) => {
  const payload = { ...req.body, icon: req.file?.path };
  const result = await SpecialtyService.createSpecialty(payload);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Specialty created successfully",
    data: result,
  });
});

const getAllSpecialties = catchAsync(async (req, res) => {
  const result = await SpecialtyService.getAllSpecialties();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Specialties fetched successfully",
    data: result,
  });
});

const deleteSpecialty = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await SpecialtyService.deleteSpecialty(id as string);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Specialty deleted successfully",
    data: result,
  });
});

export const SpecialtyController = {
  createSpecialty,
  getAllSpecialties,
  deleteSpecialty,
};
