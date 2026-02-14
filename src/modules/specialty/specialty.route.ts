import { Router } from "express";
import { SpecialtyController } from "./secialty.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.post("/", SpecialtyController.createSpecialty);
router.get("/", checkAuth(Role.PATIENT), SpecialtyController.getAllSpecialties);
router.delete("/:id", SpecialtyController.deleteSpecialty);

export const SpecialtyRoutes = router;
