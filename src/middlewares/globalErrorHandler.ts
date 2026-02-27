import status from "http-status";
import { env } from "../config/env";
import { NextFunction, Request, Response } from "express";
import { Prisma } from "../../generated/prisma/client";
import z from "zod";
import { AppError } from "../utils/AppError";
import { deleteFileFromCloudinary } from "../config/cloudinary.config";
import { deleteUploadedFilesFromGlobalErrorHandler } from "../utils/src/app/utils/deleteUploadedFilesFromGlobalErrorHandler";

interface TErrorSources {
  path: string;
  message: string;
}

interface TErrorResponse {
  success: boolean;
  statusCode: number;
  message: string;
  errorSources?: TErrorSources[];
  error?: unknown;
  stack?: string;
}

export const globalErrorHandler = async (
  err: any,
  req: Request,
  res: Response,
) => {
  if (env.NODE_ENV === "development") {
    console.log("Error from Global Error Handler", err);
  }

  await deleteUploadedFilesFromGlobalErrorHandler(req);

  let statusCode: number = status.INTERNAL_SERVER_ERROR;
  let message: string = "Internal Server Error";
  let errorSources: TErrorSources[] = [];
  let stack: string | undefined = undefined;

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
  } else if (err instanceof z.ZodError) {
    statusCode = status.BAD_REQUEST;
    message = "Zod Validation Error";
    errorSources = err.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    stack = err.stack;
  } else if (err instanceof Error) {
    statusCode = status.INTERNAL_SERVER_ERROR;
    message = err.message;
    stack = err.stack;
  }

  const errorResponse: TErrorResponse = {
    success: false,
    statusCode,
    message,
    errorSources: errorSources,
    error: env.NODE_ENV === "development" ? err : undefined,
    stack: env.NODE_ENV === "development" ? stack : undefined,
  };

  res.status(statusCode).json(errorResponse);
};
