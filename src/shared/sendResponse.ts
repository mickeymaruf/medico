import { Response } from "express";

interface IResponseData<T> {
  statusCode: number;
  success: boolean;
  message?: string;
  data?: T;
}

export const sendResponse = <T>(
  res: Response,
  responseData: IResponseData<T>,
) => {
  const { statusCode, success, message, data } = responseData;

  res.status(statusCode).json({
    success,
    message,
    data,
  });
};
