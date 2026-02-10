import { NextFunction, Request, Response } from "express";
import z from "zod";

export const validateRequest = (zodSchema: z.ZodObject) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = zodSchema.parse(req.body);
      req.body = data; // sanitization
      next();
    } catch (error) {
      next(error);
    }
  };
};
