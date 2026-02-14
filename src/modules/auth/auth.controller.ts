import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { AuthService } from "./auth.service";
import { setCookie } from "../../utils/cookie";
import { convertDays } from "../../utils/time";
import { AppError } from "../../utils/AppError";

const registerPatient = catchAsync(async (req, res) => {
  const result = await AuthService.registerPatient(req.body);

  sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message: "Patient registered successfully",
    data: result,
  });
});

const loginUser = catchAsync(async (req, res) => {
  const result = await AuthService.loginUser(req.body);
  const { accessToken, refreshToken, token } = result;

  setCookie(res, "accessToken", accessToken, {
    maxAge: convertDays(1, "ms"),
  });
  setCookie(res, "refreshToken", refreshToken, {
    maxAge: convertDays(7, "ms"),
  });
  setCookie(res, "better-auth.session_token", token, {
    maxAge: convertDays(1, "ms"),
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User logged in successfully",
    data: result,
  });
});

const getMe = catchAsync(async (req, res) => {
  const user = req.user;

  const result = await AuthService.getMe(user.userId);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "User profile fetched successfully",
    data: result,
  });
});

const getNewToken = catchAsync(async (req, res) => {
  const refreshToken = req.cookies["refreshToken"];
  const betterAuthSessionToken = req.cookies["better-auth.session_token"];

  if (!refreshToken || !betterAuthSessionToken) {
    throw new AppError(
      "Refresh or Session token is missing",
      status.UNAUTHORIZED,
    );
  }

  const {
    accessToken,
    refreshToken: newRefreshToken,
    sessionToken,
  } = await AuthService.getNewToken(refreshToken, betterAuthSessionToken);

  setCookie(res, "accessToken", accessToken, {
    maxAge: convertDays(1, "ms"),
  });
  setCookie(res, "refreshToken", newRefreshToken, {
    maxAge: convertDays(7, "ms"),
  });
  setCookie(res, "better-auth.session_token", sessionToken, {
    maxAge: convertDays(1, "ms"),
  });

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "New tokens generated successfully",
    data: {
      accessToken,
      refreshToken: newRefreshToken,
      sessionToken,
    },
  });
});

export const AuthController = {
  registerPatient,
  loginUser,
  getMe,
  getNewToken,
};
