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
}

const loadEnv = (): IEnv => {
  const variables = [
    "NODE_ENV",
    "PORT",
    "DATABASE_URL",
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
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
  };
};

export const env = loadEnv();
