import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { AuthService } from "./auth.service";
import { AppError } from "../../utils/AppError";
import { COOKIE_NAMES } from "../../constants/cookie";
import { clearAuthCookies, setAuthCookies } from "../../utils/authCookies";

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

  setAuthCookies(res, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    sessionToken: result.token,
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
  const refreshToken = req.cookies[COOKIE_NAMES.REFRESH];
  const betterAuthSessionToken = req.cookies[COOKIE_NAMES.SESSION];

  if (!refreshToken || !betterAuthSessionToken) {
    throw new AppError(
      "Refresh or Session token is missing",
      status.UNAUTHORIZED,
    );
  }

  const result = await AuthService.getNewToken(
    refreshToken,
    betterAuthSessionToken,
  );

  setAuthCookies(res, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    sessionToken: result.token,
  });

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "New tokens generated successfully",
    data: result,
  });
});

const changePassword = catchAsync(async (req, res) => {
  const betterAuthSessionToken = req.cookies[COOKIE_NAMES.SESSION];

  if (!betterAuthSessionToken) {
    throw new AppError("Session token is missing", status.UNAUTHORIZED);
  }

  const result = await AuthService.changePassword(
    betterAuthSessionToken,
    req.body,
  );

  setAuthCookies(res, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    sessionToken: result.token as string,
  });

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Password changed successfully",
    data: result,
  });
});

const logoutUser = catchAsync(async (req, res) => {
  const betterAuthSessionToken = req.cookies[COOKIE_NAMES.SESSION];

  if (!betterAuthSessionToken) {
    throw new AppError("Session token is missing", status.UNAUTHORIZED);
  }

  const result = await AuthService.logoutUser(betterAuthSessionToken);

  clearAuthCookies(res);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "User logged out successfully",
    data: result,
  });
});

export const AuthController = {
  registerPatient,
  loginUser,
  getMe,
  getNewToken,
  changePassword,
  logoutUser,
};
