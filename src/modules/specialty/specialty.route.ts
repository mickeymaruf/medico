import { Router } from "express";
import { SpecialtyController } from "./secialty.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { parser } from "../../config/multer.config";
import { createSpecialtyZodSchema } from "./specialty.validation";
import { validateRequest } from "../../middlewares/validateRequest";

const router = Router();

router.get(
  "/",
  // checkAuth(Role.PATIENT),
  SpecialtyController.getAllSpecialties,
);
router.post(
  "/",
  parser.single("file"),
  validateRequest(createSpecialtyZodSchema),
  SpecialtyController.createSpecialty,
);
router.delete("/:id", SpecialtyController.deleteSpecialty);

export const SpecialtyRoutes = router;
