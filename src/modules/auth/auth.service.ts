import status from "http-status";
import { UserStatus } from "../../../generated/prisma/enums";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import jwt, { JwtPayload } from "jsonwebtoken";
import { env } from "../../config/env";
import { convertDays } from "../../utils/time";
import { generateTokens } from "../../utils/token";

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

  const tokens = generateTokens(user);

  return { ...data, ...tokens };
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
  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(refreshToken, env.REFRESH_TOKEN_SECRET) as JwtPayload;
  } catch (error) {
    throw new AppError("Invalid refresh token", status.UNAUTHORIZED);
  }

  const session = await prisma.session.findUnique({
    where: { token: sessionToken },
    include: { user: true },
  });

  if (!session) {
    throw new AppError("Invalid session token", status.UNAUTHORIZED);
  }

  if (decoded.userId !== session.user.id) {
    throw new AppError("Token mismatch", status.UNAUTHORIZED);
  }

  const user = session.user;

  const tokens = generateTokens(user);

  // update session expiration time
  const { token } = await prisma.session.update({
    where: { token: sessionToken },
    data: {
      expiresAt: new Date(Date.now() + convertDays(1, "ms")),
    },
  });

  return {
    ...tokens,
    token,
  };
};

const changePassword = async (
  sessionToken: string,
  payload: { oldPassword: string; newPassword: string },
) => {
  const session = await auth.api.getSession({
    headers: new Headers({
      Authorization: `Bearer ${sessionToken}`,
    }),
  });

  if (!session) {
    throw new AppError("Invalid session token", status.UNAUTHORIZED);
  }

  const { token } = await auth.api.changePassword({
    body: {
      newPassword: payload.newPassword,
      currentPassword: payload.oldPassword,
      revokeOtherSessions: true,
    },
    headers: new Headers({
      Authorization: `Bearer ${sessionToken}`,
    }),
  });

  const tokens = generateTokens(session.user);

  return {
    ...tokens,
    token,
  };
};

const logoutUser = async (sessionToken: string) => {
  return await auth.api.signOut({
    headers: new Headers({
      Authorization: `Bearer ${sessionToken}`,
    }),
  });
};

const verifyEmail = async (email: string, otp: string) => {
  const data = await auth.api.verifyEmailOTP({
    body: {
      email: email,
      otp,
    },
  });

  if (data.status && !data.user.emailVerified) {
    prisma.user.update({
      where: { id: data.user.id },
      data: { emailVerified: true },
    });
  }
};

export const AuthService = {
  registerPatient,
  loginUser,
  getMe,
  getNewToken,
  changePassword,
  logoutUser,
  verifyEmail,
};
