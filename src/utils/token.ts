import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export interface IUserPayload extends JwtPayload {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  isDeleted: boolean;
  emailVerified: boolean;
}

export const generateTokens = (user: IUserPayload) => {
  const payload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    isDeleted: user.isDeleted,
    emailVerified: user.emailVerified,
  };

  const accessToken = jwt.sign(payload, env.ACCESS_TOKEN_SECRET, {
    expiresIn: env.ACCESS_TOKEN_EXPIRES_IN,
  } as SignOptions);

  const refreshToken = jwt.sign(payload, env.REFRESH_TOKEN_SECRET, {
    expiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
  } as SignOptions);

  return { accessToken, refreshToken };
};
