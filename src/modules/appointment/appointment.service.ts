import { v7 as uuidv7 } from "uuid";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import {
  AppointmentStatus,
  PaymentStatus,
  Role,
} from "./../../../generated/prisma/enums";
import { IBookAppointmentPayload } from "./appointment.interface";
import { AppError } from "../../utils/AppError";
import status from "http-status";
import { Appointment } from "../../../generated/prisma/client";
import { stripe } from "../../config/stripe.config";
import { env } from "../../config/env";

// Pay Now Book Appointment
const bookAppointment = async (
  payload: IBookAppointmentPayload,
  user: IRequestUser,
) => {
  const patientData = await prisma.patient.findUniqueOrThrow({
    where: {
      email: user.email,
    },
  });

  const doctorData = await prisma.doctor.findUniqueOrThrow({
    where: {
      id: payload.doctorId,
      isDeleted: false,
    },
  });

  const scheduleData = await prisma.schedule.findUniqueOrThrow({
    where: {
      id: payload.scheduleId,
    },
  });

  // check if the schedule is already booked for the doctor, if booked then throw error
  await prisma.doctorSchedules.findUniqueOrThrow({
    where: {
      doctorId_scheduleId: {
        doctorId: doctorData.id,
        scheduleId: scheduleData.id,
      },
      isBooked: false,
    },
  });

  const videoCallingId = String(uuidv7());

  const result = await prisma.$transaction(async (tx) => {
    const appointmentData = await tx.appointment.create({
      data: {
        doctorId: doctorData.id,
        patientId: patientData.id,
        scheduleId: scheduleData.id,
        videoCallingId,
      },
    });

    await tx.doctorSchedules.update({
      where: {
        doctorId_scheduleId: {
          doctorId: doctorData.id,
          scheduleId: scheduleData.id,
        },
      },
      data: {
        isBooked: true,
      },
    });

    //TODO : Payment Integration will be here
    const transactionId = String(uuidv7());

    const paymentData = await prisma.payment.create({
      data: {
        appointmentId: appointmentData.id,
        transactionId,
        amount: doctorData.appointmentFee,
      },
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "bdt",
            product_data: { name: `Appointment with Dr. ${doctorData.name}` },
            unit_amount: doctorData.appointmentFee * 100,
          },
          quantity: 1,
        },
      ],
      metadata: {
        appointmentId: appointmentData.id,
        paymentId: paymentData.id,
      },
      success_url: `${env.FRONTEND_URL}/dashboard/payment-success`,

      // cancel_url: `${env.FRONTEND_URL}/dashboard/payment/payment-failed`,
      cancel_url: `${env.FRONTEND_URL}/dashboard/appointments`,
    });

    return {
      appointment: appointmentData,
      payment: paymentData,
      paymentUrl: session.url,
    };
  });

  return result;
};

const getMyAppointments = async (user: IRequestUser) => {
  const patientData = await prisma.patient.findUnique({
    where: {
      email: user.email,
    },
  });

  const doctorData = await prisma.doctor.findUnique({
    where: {
      email: user.email,
    },
  });

  let appointments: Appointment[] = [];

  if (patientData) {
    appointments = await prisma.appointment.findMany({
      where: {
        patientId: patientData.id,
      },
      include: {
        doctor: true,
        schedule: true,
      },
    });
  } else if (doctorData) {
    appointments = await prisma.appointment.findMany({
      where: {
        patientId: doctorData.id,
      },
      include: {
        patient: true,
        schedule: true,
      },
    });
  } else {
    throw new Error("User not found");
  }

  return appointments;
};

// 1. Completed Or Cancelled Appointments should not be allowed to update status
// 2. Doctors can only update Appoinment status from schedule to inprogress or inprogress to complted or schedule to cancelled.
// 3. Patients can only cancel the scheduled appointment if it scheduled not completed or cancelled or inprogress.
// 4. Admin and Super admin can update to any status.

const changeAppointmentStatus = async (
  appointmentId: string,
  appointmentStatus: AppointmentStatus,
  user: IRequestUser,
) => {
  const appointmentData = await prisma.appointment.findUniqueOrThrow({
    where: {
      id: appointmentId,
    },
    include: {
      doctor: true,
    },
  });

  if (user?.role === Role.DOCTOR) {
    if (!(user?.email === appointmentData.doctor.email))
      throw new AppError("This is not your appointment", status.BAD_REQUEST);
  }

  return await prisma.appointment.update({
    where: {
      id: appointmentId,
      doctorId: user.userId,
    },
    data: { status: appointmentStatus },
  });
};

// refactoring on include of doctor and patient data in appointment details, we can use query builder to get the data in single query instead of multiple queries in case of doctor and patient both
const getMySingleAppointment = async (
  appointmentId: string,
  user: IRequestUser,
) => {
  const patientData = await prisma.patient.findUnique({
    where: {
      email: user.email,
    },
  });

  const doctorData = await prisma.doctor.findUnique({
    where: {
      email: user.email,
    },
  });

  let appointment;

  if (patientData) {
    appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        patientId: patientData.id,
      },
      include: {
        doctor: true,
        schedule: true,
      },
    });
  } else if (doctorData) {
    appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        patientId: doctorData.id,
      },
      include: {
        patient: true,
        schedule: true,
      },
    });
  }

  if (!appointment) {
    throw new AppError("Appointment not found", status.NOT_FOUND);
  }

  return appointment;
};

// integrate query builder
const getAllAppointments = async () => {
  const appointments = await prisma.appointment.findMany({
    include: {
      doctor: true,
      patient: true,
      schedule: true,
    },
  });
  return appointments;
};

const bookAppointmentWithPayLater = async (
  payload: IBookAppointmentPayload,
  user: IRequestUser,
) => {
  const patientData = await prisma.patient.findUniqueOrThrow({
    where: {
      email: user.email,
    },
  });

  const doctorData = await prisma.doctor.findUniqueOrThrow({
    where: {
      id: payload.doctorId,
      isDeleted: false,
    },
  });

  const scheduleData = await prisma.schedule.findUniqueOrThrow({
    where: {
      id: payload.scheduleId,
    },
  });

  const doctorSchedule = await prisma.doctorSchedules.findUniqueOrThrow({
    where: {
      doctorId_scheduleId: {
        doctorId: doctorData.id,
        scheduleId: scheduleData.id,
      },
    },
  });

  const videoCallingId = String(uuidv7());

  const result = await prisma.$transaction(async (tx) => {
    const appointmentData = await tx.appointment.create({
      data: {
        doctorId: doctorData.id,
        patientId: patientData.id,
        scheduleId: scheduleData.id,
        videoCallingId,
      },
    });

    await tx.doctorSchedules.update({
      where: {
        doctorId_scheduleId: {
          doctorId: doctorData.id,
          scheduleId: scheduleData.id,
        },
      },
      data: {
        isBooked: true,
      },
    });

    //TODO : Payment Integration will be here
    const transactionId = String(uuidv7());

    const paymentData = await prisma.payment.create({
      data: {
        appointmentId: appointmentData.id,
        transactionId,
        amount: doctorData.appointmentFee,
      },
    });

    return {
      appointment: appointmentData,
      payment: paymentData,
    };
  });

  return result;
};

const initiatePayment = async (appointmentId: string, user: IRequestUser) => {
  const patientData = await prisma.patient.findUniqueOrThrow({
    where: {
      email: user.email,
    },
  });

  const appointmentData = await prisma.appointment.findUniqueOrThrow({
    where: {
      id: appointmentId,
      patientId: patientData.id,
    },
    include: {
      payment: true,
      doctor: true,
    },
  });

  if (!appointmentData.payment) {
    throw new AppError(
      "Payment data not found for this appointment",
      status.NOT_FOUND,
    );
  }

  if (appointmentData.payment.status === PaymentStatus.PAID) {
    throw new AppError(
      "Payment already completed for this appointment",
      status.BAD_REQUEST,
    );
  }

  if (appointmentData.status === AppointmentStatus.CANCELED) {
    throw new AppError("Appointment is canceled", status.BAD_REQUEST);
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "bdt",
          product_data: {
            name: `Appointment with Dr. ${appointmentData.doctor.name}`,
          },
          unit_amount: appointmentData.doctor.appointmentFee * 100,
        },
        quantity: 1,
      },
    ],
    metadata: {
      appointmentId: appointmentData.id,
      paymentId: appointmentData.payment.id,
    },
    success_url: `${env.FRONTEND_URL}/dashboard/payment-success`,

    // cancel_url: `${env.FRONTEND_URL}/dashboard/payment/payment-failed`,
    cancel_url: `${env.FRONTEND_URL}/dashboard/appointments`,
  });

  return {
    paymentUrl: session.url,
  };
};

const cancelUnpaidAppointments = async () => {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  const unpaidAppointments = await prisma.appointment.findMany({
    where: {
      createdAt: { lte: thirtyMinutesAgo },
      paymentStatus: PaymentStatus.UNPAID,
    },
  });

  const appointmentToCancel = unpaidAppointments.map(
    (appointment) => appointment.id,
  );

  await prisma.$transaction(async (tx) => {
    await tx.appointment.updateMany({
      where: {
        id: {
          in: appointmentToCancel,
        },
      },
      data: {
        status: AppointmentStatus.CANCELED,
      },
    });

    await tx.payment.deleteMany({
      where: {
        appointmentId: {
          in: appointmentToCancel,
        },
      },
    });

    // 🐢 slow
    // for (const unpaidAppointment of unpaidAppointments) {
    //   await tx.doctorSchedules.update({
    //     where: {
    //       doctorId_scheduleId: {
    //         doctorId: unpaidAppointment.doctorId,
    //         scheduleId: unpaidAppointment.scheduleId,
    //       },
    //     },
    //     data: {
    //       isBooked: false,
    //     },
    //   });
    // }

    // better ✅
    await tx.doctorSchedules.updateMany({
      where: {
        OR: unpaidAppointments.map((unpaidAppointment) => ({
          doctorId: unpaidAppointment.doctorId,
          scheduleId: unpaidAppointment.scheduleId,
        })),
        // *** replaced by above code***
        // doctorId: {
        //   in: unpaidAppointments.map(
        //     (unpaidAppointment) => unpaidAppointment.doctorId,
        //   ),
        // },
        // scheduleId: {
        //   in: unpaidAppointments.map(
        //     (unpaidAppointment) => unpaidAppointment.scheduleId,
        //   ),
        // },
      },
      data: {
        isBooked: false,
      },
    });
  });
};

export const AppointmentService = {
  bookAppointment,
  getMyAppointments,
  changeAppointmentStatus,
  getMySingleAppointment,
  getAllAppointments,
  bookAppointmentWithPayLater,
  initiatePayment,
  cancelUnpaidAppointments,
};
