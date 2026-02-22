import { Router } from "express";
import { DoctorController } from "./doctor.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { validateRequest } from "../../middlewares/validateRequest";
import { updateDoctorZodSchema } from "./doctor.validation";

const router = Router();

router.get("/", DoctorController.getAllDoctors);
router.get(
  "/:id",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  DoctorController.getDoctorById,
);
router.patch(
  "/:id",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(updateDoctorZodSchema),
  DoctorController.updateDoctor,
);
router.delete(
  "/:id",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  DoctorController.deleteDoctor,
);

export const DoctorRoutes = router;
