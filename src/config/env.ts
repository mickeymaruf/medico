import dotenv from "dotenv";
import { AppError } from "../utils/AppError";
import status from "http-status";

dotenv.config();

type EnvType = "development" | "production";

interface IEnv {
  NODE_ENV: EnvType;
  PORT: string;
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  ACCESS_TOKEN_SECRET: string;
  REFRESH_TOKEN_SECRET: string;
  ACCESS_TOKEN_EXPIRES_IN: string;
  REFRESH_TOKEN_EXPIRES_IN: string;
  GOOGLE_APP_PASSWORD: string;
  EMAIL_USER: string;
}

const loadEnv = (): IEnv => {
  const variables = [
    "NODE_ENV",
    "PORT",
    "DATABASE_URL",
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
    "ACCESS_TOKEN_SECRET",
    "REFRESH_TOKEN_SECRET",
    "ACCESS_TOKEN_EXPIRES_IN",
    "REFRESH_TOKEN_EXPIRES_IN",
    "GOOGLE_APP_PASSWORD",
    "EMAIL_USER",
  ];

  variables.forEach((variable) => {
    if (!process.env[variable]) {
      throw new AppError(
        `Environment variable ${variable} is required but not set in .env file.`,
        status.INTERNAL_SERVER_ERROR,
      );
    }
  });

  return {
    NODE_ENV: process.env.NODE_ENV as EnvType,
    PORT: process.env.PORT!,
    DATABASE_URL: process.env.DATABASE_URL!,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL!,
    ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET!,
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET!,
    ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN!,
    REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN!,
    GOOGLE_APP_PASSWORD: process.env.GOOGLE_APP_PASSWORD!,
    EMAIL_USER: process.env.EMAIL_USER!,
  };
};

export const env = loadEnv();
