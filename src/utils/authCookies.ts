import { Response } from "express";
import { setCookie } from "./cookie";
import { convertDays } from "./time";
import { COOKIE_NAMES } from "../constants/cookie";

interface Tokens {
  accessToken: string;
  refreshToken: string;
  sessionToken: string;
}

export const setAuthCookies = (res: Response, tokens: Tokens) => {
  const { accessToken, refreshToken, sessionToken } = tokens;

  setCookie(res, COOKIE_NAMES.ACCESS, accessToken, {
    maxAge: convertDays(1, "ms"),
  });

  setCookie(res, COOKIE_NAMES.REFRESH, refreshToken, {
    maxAge: convertDays(7, "ms"),
  });

  setCookie(res, COOKIE_NAMES.SESSION, sessionToken, {
    maxAge: convertDays(1, "ms"),
  });
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie(COOKIE_NAMES.SESSION);
  res.clearCookie(COOKIE_NAMES.ACCESS);
  res.clearCookie(COOKIE_NAMES.REFRESH);
};
