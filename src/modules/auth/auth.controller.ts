import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { AuthService } from "./auth.service";
import { AppError } from "../../utils/AppError";
import { COOKIE_NAMES } from "../../constants/cookie";
import { clearAuthCookies, setAuthCookies } from "../../utils/authCookies";
import { env } from "../../config/env";
import { auth } from "../../lib/auth";
import { fromNodeHeaders } from "better-auth/node";
import { EventEmitterAsyncResource } from "events";

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

const verifyEmail = catchAsync(async (req, res) => {
  const { email, otp } = req.body;
  await AuthService.verifyEmail(email, otp);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Email verified successfully",
  });
});

const forgetPassword = catchAsync(async (req, res) => {
  const { email } = req.body;
  await AuthService.forgetPassword(email);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Password reset OTP sent to email successfully",
  });
});

const resetPassword = catchAsync(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  await AuthService.resetPassword(email, otp, newPassword);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Password reset successfully",
  });
});

const googleLogin = catchAsync(async (req, res) => {
  const redirectPath = (req.query.redirect as string) || "/dashboard";
  const encodedRedirectPath = encodeURIComponent(redirectPath);

  res.render("googleRedirect", {
    betterAuthUrl: env.BETTER_AUTH_URL,
    callbackURL: `${env.BETTER_AUTH_URL}/api/v1/auth/google/success?redirect=${encodedRedirectPath}`,
  });
});

const googleLoginSuccess = catchAsync(async (req, res) => {
  const redirectPath = req.query.redirect as string;
  const sessionToken = req.cookies[COOKIE_NAMES.SESSION];

  if (!sessionToken) {
    return res.redirect(`${env.FRONTEND_URL}/login?error=oauth_failed`);
  }

  const session = await auth.api.getSession({
    // headers: fromNodeHeaders(req.headers),
    headers: new Headers({
      Cookie: `${COOKIE_NAMES.SESSION}=${sessionToken}`,
    }),
  });

  if (!session) {
    return res.redirect(`${env.FRONTEND_URL}/login?error=no_session_found`);
  }

  const tokens = await AuthService.googleLoginSuccess(session);

  setAuthCookies(res, {
    ...tokens,
    sessionToken,
  });

  const validRedirectPath =
    redirectPath.startsWith("/") && !redirectPath.startsWith("//")
      ? redirectPath
      : "/dashboard";

  res.redirect(`${env.FRONTEND_URL}${validRedirectPath}`);
});

// const handleOAuthError = catchAsync((req, res) => {
//   const error = (req.query.error as string) || "oauth_failed";
//   res.redirect(`${env.FRONTEND_URL}/login?error=${error}`);
// });

export const AuthController = {
  registerPatient,
  loginUser,
  getMe,
  getNewToken,
  changePassword,
  logoutUser,
  verifyEmail,
  forgetPassword,
  resetPassword,
  googleLogin,
  googleLoginSuccess,
  // handleOAuthError,
};
