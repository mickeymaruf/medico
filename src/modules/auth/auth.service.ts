import status from "http-status";
import { UserStatus } from "../../../generated/prisma/enums";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

interface IRegisterPatientPayload {
  name: string;
  email: string;
  password: string;
}

const registerPatient = async (payload: IRegisterPatientPayload) => {
  const { name, email, password } = payload;

  const data = await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
    },
  });

  if (!data.user) {
    throw new AppError("Failed to register patient", status.BAD_REQUEST);
  }

  try {
    const patient = await prisma.patient.create({
      data: {
        userId: data.user.id,
        name,
        email,
      },
    });

    return { ...data, patient };
  } catch (error) {
    console.log("Transaction error : ", error);

    await prisma.user.delete({
      where: { id: data.user.id },
    });

    throw error;
  }
};

interface ILoginUserPayload {
  email: string;
  password: string;
}

const loginUser = async (payload: ILoginUserPayload) => {
  const { email, password } = payload;

  const data = await auth.api.signInEmail({
    body: {
      email,
      password,
    },
  });

  if (data.user.status === UserStatus.BLOCKED) {
    throw new AppError("User is blocked", status.UNAUTHORIZED);
  }

  if (data.user.isDeleted || data.user.status === UserStatus.DELETED) {
    throw new AppError("User is deleted", status.NOT_FOUND);
  }

  return data;
};

export const AuthService = {
  registerPatient,
  loginUser,
};
