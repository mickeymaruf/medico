import status from "http-status";
import { env } from "../config/env";
import { NextFunction, Request, Response } from "express";

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

  res.status(statusCode).json({
    success: false,
    message,
    error: err.message,
  });
};
