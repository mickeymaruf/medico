import express from "express";
import { Role } from "../../../generated/prisma/enums";
import { ReviewController } from "./review.controller";
import {
  createReviewZodSchema,
  updateReviewZodSchema,
} from "./review.validation";
import { validateRequest } from "../../middlewares/validateRequest";
import { checkAuth } from "../../middlewares/checkAuth";

const router = express.Router();

router.get("/", ReviewController.getAllReviews);

router.post(
  "/",
  checkAuth(Role.PATIENT),
  validateRequest(createReviewZodSchema),
  ReviewController.giveReview,
);

router.get(
  "/my-reviews",
  checkAuth(Role.PATIENT, Role.DOCTOR),
  ReviewController.myReviews,
);

router.patch(
  "/:id",
  checkAuth(Role.PATIENT),
  validateRequest(updateReviewZodSchema),
  ReviewController.updateReview,
);

router.delete("/:id", checkAuth(Role.PATIENT), ReviewController.deleteReview);

export const ReviewRoutes = router;
