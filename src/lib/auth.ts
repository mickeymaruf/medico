import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { Role, UserStatus } from "../../generated/prisma/enums";
import { convertDays } from "../utils/time";
import { bearer, emailOTP } from "better-auth/plugins";
import { sendEmail } from "../utils/email";
import { env } from "../config/env";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.BETTER_AUTH_URL, env.FRONTEND_URL],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      // optional: already default value is set during create in the db schema
      // mapProfileToUser: () => {
      //   return {
      //     role: Role.PATIENT,
      //     status: UserStatus.ACTIVE,
      //     needPasswordChange: false,
      //     emailVerified: true,
      //     isDeleted: false,
      //     deletedAt: null,
      //   };
      // },
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: Role.PATIENT,
      },
      status: {
        type: "string",
        required: true,
        defaultValue: UserStatus.ACTIVE,
      },
      needPasswordChange: {
        type: "boolean",
        required: true,
        defaultValue: false,
      },
      isDeleted: {
        type: "boolean",
        required: true,
        defaultValue: false,
      },
      deletedAt: {
        type: "date",
        required: false,
        defaultValue: null,
      },
    },
  },
  plugins: [
    bearer(),
    emailOTP({
      overrideDefaultEmailVerification: true,
      async sendVerificationOTP({ email, otp, type }) {
        if (type === "email-verification") {
          // Send the OTP for email sendVerificationEmail
          const user = await prisma.user.findUnique({
            where: { email },
            select: { name: true, emailVerified: true },
          });
          if (user && !user.emailVerified) {
            sendEmail({
              to: email,
              subject: "Verify your email",
              templateName: "otp",
              templateData: { name: user.name, otp },
            });
          }
        } else if (type === "forget-password") {
          // Send the OTP for password reset
          const user = await prisma.user.findUnique({
            where: { email },
            select: { name: true },
          });
          if (user) {
            sendEmail({
              to: email,
              subject: "Password Reset OTP",
              templateName: "otp",
              templateData: { name: user.name, otp },
            });
          }
        }
      },
      expiresIn: 2 * 60, // 2 minutes in seconds
      otpLength: 6,
    }),
  ],
  session: {
    expiresIn: convertDays(1, "s"),
    updateAge: convertDays(1, "s"),
    cookieCache: {
      enabled: true,
      maxAge: convertDays(1, "s"),
    },
  },
  advanced: {
    /**
     * Forces cookies to be sent only over HTTPS.
     *
     * ✅ Required in production
     * ❌ Will break on localhost (HTTP) if always true
     *
     * Recommended:
     * useSecureCookies: process.env.NODE_ENV === "production"
     *
     * Set to true to use __Secure- prefixed cookies (recommended for better authentication security in production over HTTPS)
     */
    useSecureCookies: false,

    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      httpOnly: true,
      path: "/",
    },
  },
});
