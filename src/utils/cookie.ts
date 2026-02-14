import { CookieOptions, Response } from "express";
import { env } from "../config/env";

export const setCookie = (
  res: Response,
  key: string,
  value: string,
  options: CookieOptions,
) => {
  res.cookie(key, value, {
    secure: env.NODE_ENV === "production", // true if served over HTTPS
    httpOnly: true,
    sameSite: "none",
    path: "/",
    ...options,
  });
};
