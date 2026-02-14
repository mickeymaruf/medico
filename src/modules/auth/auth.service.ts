import status from "http-status";
import { UserStatus } from "../../../generated/prisma/enums";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { JWTPayload } from "better-auth";
import { convertDays } from "../../utils/time";

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
  const user = data.user;

  if (user.status === UserStatus.BLOCKED) {
    throw new AppError("User is blocked", status.UNAUTHORIZED);
  }

  if (user.isDeleted || user.status === UserStatus.DELETED) {
    throw new AppError("User is deleted", status.NOT_FOUND);
  }

  const accessToken = jwt.sign(
    {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      isDeleted: user.isDeleted,
      emailVerified: user.emailVerified,
    },
    env.ACCESS_TOKEN_SECRET,
  );

  const refreshToken = jwt.sign(
    {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      isDeleted: user.isDeleted,
      emailVerified: user.emailVerified,
    },
    env.REFRESH_TOKEN_SECRET,
  );

  return { ...data, accessToken, refreshToken };
};

const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      // patient : {
      //     include : {
      //         appointments : true,
      //         reviews : true,
      //         prescriptions : true,
      //         medicalReports : true,
      //         patientHealthData : true,
      //     }
      // },
      // doctor : {
      //     include : {
      //         specialties : true,
      //         appointments : true,
      //         reviews : true,
      //         prescriptions : true,
      //     }
      // },
      // admin : true,
    },
  });

  if (!user) {
    throw new AppError("User not found", status.NOT_FOUND);
  }

  return user;
};

const getNewToken = async (refreshToken: string, sessionToken: string) => {
  const session = await prisma.session.findUnique({
    where: { token: sessionToken },
    include: { user: true },
  });

  if (!session) {
    throw new AppError("Invalid session token", status.UNAUTHORIZED);
  }

  const decoded = jwt.verify(refreshToken, env.REFRESH_TOKEN_SECRET);

  if (!decoded) {
    throw new AppError("Invalid refresh token", status.UNAUTHORIZED);
  }

  const user = session.user;

  const newAccessToken = jwt.sign(
    {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      isDeleted: user.isDeleted,
      emailVerified: user.emailVerified,
    },
    env.ACCESS_TOKEN_SECRET,
  );

  const newRefreshToken = jwt.sign(
    {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      isDeleted: user.isDeleted,
      emailVerified: user.emailVerified,
    },
    env.REFRESH_TOKEN_SECRET,
  );

  // update session expiration time
  const { token } = await prisma.session.update({
    where: { token: sessionToken },
    data: {
      expiresAt: new Date(Date.now() + convertDays(1, "ms")),
    },
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    sessionToken: token,
  };
};

export const AuthService = {
  registerPatient,
  loginUser,
  getMe,
  getNewToken,
};
