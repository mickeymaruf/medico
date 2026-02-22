import { Router } from "express";
import { UserController } from "./user.controller";
import { createDoctorZodSchema } from "./user.validation";
import { validateRequest } from "../../middlewares/validateRequest";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.post(
  "/create-doctor",
  validateRequest(createDoctorZodSchema),
  UserController.createDoctor,
);
// admin, superadmin handles both
router.post(
  "/create-admin",
  checkAuth(Role.SUPER_ADMIN, Role.ADMIN),
  UserController.createAdmin,
);

export const UserRoutes = router;
