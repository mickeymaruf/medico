import status from "http-status";
import { Role } from "../../../generated/prisma/enums";
import {
  deleteFileFromCloudinary,
  uploadFileToCloudinary,
} from "../../config/cloudinary.config";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import { sendEmail } from "../../utils/email";
import { ICreatePrescriptionPayload } from "./prescription.interface";
import { AppError } from "../../utils/errorHelpers/AppError";
import { generatePrescriptionPDF } from "./prescription.utils";

const givePrescription = async (
  user: IRequestUser,
  payload: ICreatePrescriptionPayload,
) => {
  const doctorData = await prisma.doctor.findUniqueOrThrow({
    where: {
      email: user?.email,
    },
  });

  const appointmentData = await prisma.appointment.findUniqueOrThrow({
    where: {
      id: payload.appointmentId,
      doctorId: doctorData.id,
    },
    include: {
      doctor: { include: { specialties: true } },
      patient: true,
      prescription: true,
      schedule: { include: { doctorSchedules: true } },
    },
  });

  if (appointmentData.doctorId !== doctorData.id) {
    throw new AppError(
      "You can only give prescription for your own appointments",
      status.BAD_REQUEST,
    );
  }

  if (appointmentData.status !== "COMPLETED") {
    throw new AppError(
      "Cannot give prescription for an appointment that is not completed",
      status.BAD_REQUEST,
    );
  }

  if (appointmentData.prescription) {
    throw new AppError(
      "Prescription already exists for this appointment",
      status.BAD_REQUEST,
    );
  }

  const followUpDate = new Date(payload.followUpDate);

  const result = await prisma.$transaction(
    async (tx) => {
      const result = await tx.prescription.create({
        data: {
          ...payload,
          followUpDate,
          patientId: appointmentData.patientId,
          doctorId: appointmentData.doctorId,
        },
      });

      const pdfBuffer = await generatePrescriptionPDF({
        doctorName: doctorData.name,
        patientName: appointmentData.patient.name,
        appointmentDate: appointmentData.schedule.startDateTime,
        instructions: payload.instructions,
        followUpDate: followUpDate,
        doctorEmail: doctorData.email,
        patientEmail: appointmentData.patient.email,
        prescriptionId: result.id,
        createdAt: new Date(),
      });

      const fileName = `Prescription-${result.id}.pdf`;
      const uploadedFile = await uploadFileToCloudinary({
        fileName,
        buffer: pdfBuffer,
      });
      const pdfUrl = uploadedFile.secure_url;

      const updatedPrescription = await tx.prescription.update({
        where: {
          id: result.id,
        },
        data: {
          pdfUrl,
        },
      });

      try {
        const patient = appointmentData.patient;
        const doctor = appointmentData.doctor;

        await sendEmail({
          to: patient.email,
          subject: `You have received a new prescription from Dr. ${doctor.name}`,
          templateName: "prescription",
          templateData: {
            doctorName: doctor.name,
            patientName: patient.name,
            specialization: doctor.specialties
              .map((s: any) => s.title)
              .join(", "),
            appointmentDate: new Date(
              appointmentData.schedule.startDateTime,
            ).toLocaleString(),
            issuedDate: new Date().toLocaleDateString(),
            prescriptionId: result.id,
            instructions: payload.instructions,
            followUpDate: followUpDate.toLocaleDateString(),
            pdfUrl: pdfUrl,
          },
          attachments: [
            {
              filename: fileName,
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ],
        });
      } catch (error) {
        console.log(
          "Failed To send email notification for prescription",
          error,
        );
      }

      return updatedPrescription;
    },
    { maxWait: 15000, timeout: 20000 },
  );

  return result;
};

const myPrescriptions = async (user: IRequestUser) => {
  const isUserExists = await prisma.user.findUnique({
    where: {
      email: user?.email,
    },
  });

  if (!isUserExists) {
    throw new AppError("User not found", status.NOT_FOUND);
  }

  if (isUserExists.role === Role.DOCTOR) {
    const prescriptions = await prisma.prescription.findMany({
      where: {
        doctor: {
          email: isUserExists.email,
        },
      },
      include: {
        patient: true,
        doctor: true,
        appointment: true,
      },
    });
    return prescriptions;
  }

  if (isUserExists.role === Role.PATIENT) {
    const prescriptions = await prisma.prescription.findMany({
      where: {
        patient: {
          email: isUserExists.email,
        },
      },
      include: {
        patient: true,
        doctor: true,
        appointment: true,
      },
    });
    return prescriptions;
  }
};

const getAllPrescriptions = async () => {
  return await prisma.prescription.findMany({
    include: {
      patient: true,
      doctor: true,
      appointment: true,
    },
  });
};

const updatePrescription = async (
  user: IRequestUser,
  prescriptionId: string,
  payload: any,
) => {
  // Verify user exists
  const isUserExists = await prisma.user.findUnique({
    where: {
      email: user?.email,
    },
  });

  if (!isUserExists) {
    throw new AppError("User not found", status.NOT_FOUND);
  }

  const prescription = await prisma.prescription.findUniqueOrThrow({
    where: {
      id: prescriptionId,
    },
    include: {
      doctor: true,
      patient: true,
      appointment: {
        include: {
          schedule: true,
        },
      },
    },
  });

  if (prescription.doctor.email !== isUserExists.email) {
    throw new AppError(
      "You can only update your own prescription",
      status.BAD_REQUEST,
    );
  }

  const updatedFollowUpDate = payload.followUpDate
    ? new Date(payload.followUpDate)
    : prescription.followUpDate;
  const updatedInstructions = payload.instructions || prescription.instructions;

  // Step 1: Generate new PDF with updated data
  const pdfBuffer = await generatePrescriptionPDF({
    doctorName: prescription.doctor.name,
    patientName: prescription.patient.name,
    appointmentDate: prescription.appointment.schedule.startDateTime,
    instructions: updatedInstructions,
    followUpDate: updatedFollowUpDate,
    doctorEmail: prescription.doctor.email,
    patientEmail: prescription.patient.email,
    prescriptionId: prescription.id,
    createdAt: prescription.createdAt,
  });

  // Step 2: Upload new PDF to Cloudinary
  const fileName = `Prescription-updated-${prescription.id}-${Date.now()}.pdf`;
  const uploadedFile = await uploadFileToCloudinary({
    fileName,
    buffer: pdfBuffer,
  });
  const newPdfUrl = uploadedFile.secure_url;

  // Step 3: Delete old PDF from Cloudinary if it exists
  if (prescription.pdfUrl) {
    try {
      await deleteFileFromCloudinary(prescription.pdfUrl);
    } catch (deleteError) {
      // Log but don't fail
      console.error("Failed to delete old PDF from Cloudinary:", deleteError);
    }
  }

  // Step 4: Update prescription in database
  const result = await prisma.prescription.update({
    where: {
      id: prescription.id,
    },
    data: {
      instructions: updatedInstructions,
      followUpDate: updatedFollowUpDate,
      pdfUrl: newPdfUrl,
    },
    include: {
      patient: true,
      doctor: {
        include: {
          specialties: true,
        },
      },
      appointment: {
        include: {
          schedule: true,
        },
      },
    },
  });

  try {
    const patient = result.patient;
    const doctor = result.doctor;

    await sendEmail({
      to: patient.email,
      subject: `Your Prescription has been Updated by Dr. ${doctor.name}`,
      templateName: "prescription",
      templateData: {
        doctorName: doctor.name,
        patientName: patient.name,
        specialization: doctor.specialties?.length
          ? doctor.specialties.map((s: any) => s.title).join(", ")
          : "Healthcare Provider",
        appointmentDate: new Date(
          result.appointment.schedule.startDateTime,
        ).toLocaleString(),
        issuedDate: new Date(result.createdAt).toLocaleDateString(),
        prescriptionId: result.id,
        instructions: result.instructions,
        followUpDate: new Date(result.followUpDate).toLocaleDateString(),
        pdfUrl: newPdfUrl,
      },
      attachments: [
        {
          filename: fileName,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });
  } catch (emailError) {
    // Log email error but don't fail the prescription update
    console.error("Failed to send updated prescription email:", emailError);
  }

  return result;
};

const deletePrescription = async (
  user: IRequestUser,
  prescriptionId: string,
): Promise<void> => {
  // Verify user exists
  const isUserExists = await prisma.user.findUnique({
    where: {
      email: user?.email,
    },
  });

  if (!isUserExists) {
    throw new AppError("User not found", status.NOT_FOUND);
  }

  // Fetch prescription data
  const prescriptionData = await prisma.prescription.findUniqueOrThrow({
    where: {
      id: prescriptionId,
    },
    include: {
      doctor: true,
    },
  });

  // Verify the user is the doctor for this perscription
  if (!(user?.email === prescriptionData.doctor.email)) {
    throw new AppError("This is not your prescription!", status.BAD_REQUEST);
  }

  // Delete PDF from Cloudinary if it exists
  if (prescriptionData.pdfUrl) {
    try {
      await deleteFileFromCloudinary(prescriptionData.pdfUrl);
    } catch (deleteError) {
      // Log but don't fail - still delete from database
      console.error("Failed to delete PDF from Cloudinary:", deleteError);
    }
  }

  // Delete prescription from database
  await prisma.prescription.delete({
    where: {
      id: prescriptionId,
    },
  });
};

export const PrescriptionService = {
  givePrescription,
  myPrescriptions,
  getAllPrescriptions,
  updatePrescription,
  deletePrescription,
};
