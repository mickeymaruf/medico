import nodemailer from "nodemailer";
import ejs from "ejs";
import { env } from "../config/env";
import path from "path";
import { AppError } from "./AppError";
import status from "http-status";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: env.EMAIL_USER,
    pass: env.GOOGLE_APP_PASSWORD,
  },
});

interface SendEmailOptions {
  to: string;
  subject: string;
  templateName: "otp";
  templateData: Record<string, string>;
  attachments?: {
    filename: string;
    content: Buffer | string;
    contentType: string;
  }[];
}

export const sendEmail = async ({
  subject,
  to,
  templateName,
  templateData,
  attachments,
}: SendEmailOptions) => {
  try {
    const templatePath = path.resolve(
      process.cwd(),
      `src/templates/${templateName}.ejs`,
    );
    const html = await ejs.renderFile(templatePath, templateData);

    const info = await transporter.sendMail({
      from: env.EMAIL_USER,
      to,
      subject,
      html,
      attachments: attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType,
      })),
    });

    console.log(`Email sent to ${to} : ${info.messageId}`);
  } catch (error: any) {
    console.log("Email Sending Error", error.message);
    throw new AppError("Failed to send email", status.INTERNAL_SERVER_ERROR);
  }
};
