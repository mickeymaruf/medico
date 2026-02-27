import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { validateRequest } from "../../middlewares/validateRequest";
import { updatePatientProfileZodSchema } from "./patient.validation";
import { PatientController } from "./patient.controller";
import { parser } from "../../config/multer.config";
import { updateMyPatientProfileMiddleware } from "./patient.middlewares";

const router = Router();

router.patch(
  "/update-my-profile",
  checkAuth(Role.PATIENT),
  parser.fields([
    { name: "profilePhoto", maxCount: 1 },
    { name: "medicalReports", maxCount: 5 },
  ]),
  updateMyPatientProfileMiddleware,
  validateRequest(updatePatientProfileZodSchema),
  PatientController.updateMyProfile,
);

export const PatientRoutes = router;
