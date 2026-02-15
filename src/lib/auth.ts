import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { Role, UserStatus } from "../../generated/prisma/enums";
import { convertDays } from "../utils/time";
import { bearer, emailOTP } from "better-auth/plugins";
import { sendEmail } from "../utils/email";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
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
        } else {
          // Send the OTP for password reset
        }
      },
      expiresIn: 2 * 60,
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
});
