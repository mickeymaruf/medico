import { Router } from "express";
import { SpecialtyRoutes } from "../modules/specialty/specialty.route";
import { AuthRoutes } from "../modules/auth/auth.route";

const router = Router();

router.use("/auth", AuthRoutes);
router.use("/specialty", SpecialtyRoutes);

export const IndexRoutes = router;
