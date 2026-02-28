import status from "http-status";
import { PaymentStatus, Role } from "../../../generated/prisma/enums";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import { ICreateReviewPayload, IUpdateReviewPayload } from "./review.interface";
import { AppError } from "../../utils/AppError";

const giveReview = async (
  user: IRequestUser,
  payload: ICreateReviewPayload,
) => {
  const patient = await prisma.patient.findUniqueOrThrow({
    where: {
      email: user.email,
    },
  });

  const appointment = await prisma.appointment.findUniqueOrThrow({
    where: {
      id: payload.appointmentId,
    },
    include: {
      review: true,
    },
  });

  if (appointment.patientId !== patient.id) {
    throw new AppError(
      "You can only review your own appointments",
      status.FORBIDDEN,
    );
  }

  if (appointment.paymentStatus !== PaymentStatus.PAID) {
    throw new AppError(
      "You can only review appointments that have been paid for",
      status.BAD_REQUEST,
    );
  }

  if (appointment.review) {
    throw new AppError(
      "You have already reviewed this appointment",
      status.BAD_REQUEST,
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: {
        ...payload,
        patientId: patient.id,
        doctorId: appointment.doctorId,
      },
    });

    const avgRating = await tx.review.aggregate({
      where: {
        doctorId: appointment.doctorId,
      },
      _avg: {
        rating: true,
      },
    });

    await tx.doctor.update({
      where: {
        id: appointment.doctorId,
      },
      data: {
        averageRating: avgRating._avg.rating || 0,
      },
    });

    return review;
  });

  return result;
};

const getAllReviews = async () => {
  const reviews = await prisma.review.findMany({
    include: {
      doctor: true,
      patient: true,
      appointment: true,
    },
  });

  return reviews;
};

const myReviews = async (user: IRequestUser) => {
  let reviews;

  if (user.role === Role.PATIENT) {
    const patient = await prisma.patient.findUniqueOrThrow({
      where: {
        email: user.email,
      },
    });

    reviews = await prisma.review.findMany({
      where: {
        patientId: patient.id,
      },
      include: {
        doctor: true,
        appointment: true,
      },
    });
  } else if (user.role === Role.DOCTOR) {
    const doctor = await prisma.doctor.findUniqueOrThrow({
      where: {
        email: user.email,
      },
    });
    reviews = await prisma.review.findMany({
      where: {
        doctorId: doctor.id,
      },
      include: {
        patient: true,
        appointment: true,
      },
    });
  }

  return reviews;
};

const updateReview = async (
  user: IRequestUser,
  reviewId: string,
  payload: IUpdateReviewPayload,
) => {
  const patient = await prisma.patient.findUniqueOrThrow({
    where: {
      email: user.email,
    },
  });

  const review = await prisma.review.findUniqueOrThrow({
    where: {
      id: reviewId,
    },
  });

  if (review.patientId !== patient.id) {
    throw new AppError(
      "You can only review your own appointments",
      status.FORBIDDEN,
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedReview = await tx.review.update({
      where: {
        id: reviewId,
      },
      data: payload,
    });

    const avgRating = await tx.review.aggregate({
      where: {
        doctorId: updatedReview.doctorId,
      },
      _avg: {
        rating: true,
      },
    });

    await tx.doctor.update({
      where: {
        id: updatedReview.doctorId,
      },
      data: {
        averageRating: avgRating._avg.rating || 0,
      },
    });

    return updatedReview;
  });

  return result;
};

const deleteReview = async (user: IRequestUser, reviewId: string) => {
  const patient = await prisma.patient.findUniqueOrThrow({
    where: {
      email: user.email,
    },
  });

  const review = await prisma.review.findUniqueOrThrow({
    where: {
      id: reviewId,
    },
  });

  if (review.patientId !== patient.id) {
    throw new AppError(
      "You can only review your own appointments",
      status.FORBIDDEN,
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const deletedReview = await tx.review.delete({
      where: {
        id: reviewId,
      },
    });

    const avgRating = await tx.review.aggregate({
      where: {
        id: deletedReview.doctorId,
      },
      _avg: {
        rating: true,
      },
    });

    await tx.doctor.update({
      where: {
        id: deletedReview.doctorId,
      },
      data: {
        averageRating: avgRating._avg.rating || 0,
      },
    });

    return deletedReview;
  });

  return result;
};

export const ReviewService = {
  giveReview,
  getAllReviews,
  myReviews,
  updateReview,
  deleteReview,
};
