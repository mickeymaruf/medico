import { NextFunction, Request, Response } from "express";
import { Role, UserStatus } from "../../generated/prisma/enums";
import { AppError } from "../utils/AppError";
import status from "http-status";
import { prisma } from "../lib/prisma";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { JWTPayload } from "better-auth";

interface UserJWTPayload extends JWTPayload {
  userId: string;
  role: Role;
}

export const checkAuth = (...roles: Role[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // session verification
      const sessionToken = req.cookies["better-auth.session_token"];

      if (!sessionToken) {
        throw new AppError(
          "Unauthorized access! No session token provided.",
          status.UNAUTHORIZED,
        );
      }

      const session = await prisma.session.findFirst({
        where: {
          token: sessionToken,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          user: true,
        },
      });

      if (!session || !session.user) {
        throw new AppError(
          "Unauthorized access! No session found.",
          status.UNAUTHORIZED,
        );
      }

      const user = session.user;
      const now = new Date();
      const expiresAt = new Date(session.expiresAt);
      const createdAt = new Date(session.createdAt);

      const sessionLifeTime = expiresAt.getTime() - createdAt.getTime();
      const timeRemaining = expiresAt.getTime() - now.getTime();
      const percentageRemaining = (timeRemaining / sessionLifeTime) * 100;

      if (percentageRemaining < 20) {
        res.setHeader("X-Session-Refresh", "true");
        res.setHeader("X-Session-Expires-At", expiresAt.toISOString());
        res.setHeader("X-Time-Remaining", timeRemaining.toString());

        console.log("Session Expiring Soon!!");
      }

      if (
        user.status === UserStatus.BLOCKED ||
        user.status === UserStatus.DELETED
      ) {
        throw new AppError(
          "Unauthorized access! User is not active.",
          status.UNAUTHORIZED,
        );
      }

      if (user.isDeleted) {
        throw new AppError(
          "Unauthorized access! User is deleted.",
          status.UNAUTHORIZED,
        );
      }

      if (roles.length > 0 && !roles.includes(user.role)) {
        throw new AppError(
          "Forbidden access! You do not have permission to access this resource.",
          status.FORBIDDEN,
        );
      }

      // access token verification (jwt)
      const accessToken = req.cookies["accessToken"];

      if (!accessToken) {
        throw new AppError(
          "Unauthorized access! No access token provided.",
          status.UNAUTHORIZED,
        );
      }
      const decoded = jwt.verify(
        accessToken,
        env.ACCESS_TOKEN_SECRET,
      ) as UserJWTPayload;

      if (!decoded) {
        throw new AppError(
          "Unauthorized access! Invalid access token.",
          status.UNAUTHORIZED,
        );
      }

      if (roles.length > 0 && !roles.includes(decoded.role)) {
        throw new AppError(
          "Forbidden access! You do not have permission to access this resource.",
          status.FORBIDDEN,
        );
      }

      req.user = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};
