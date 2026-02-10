import status from "http-status";
import { env } from "../config/env";
import { NextFunction, Request, Response } from "express";
import { Prisma } from "../../generated/prisma/client";

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (env.NODE_ENV === "development") {
    console.log("Error from Global Error Handler", err);
  }

  let statusCode: number = status.INTERNAL_SERVER_ERROR;
  let message: string = "Internal Server Error";

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2025":
        statusCode = status.NOT_FOUND;
        message =
          "An operation failed because it depends on one or more records that were required but not found.";
        break;

      default:
        break;
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: err.message,
  });
};
