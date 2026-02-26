import cookieParser from "cookie-parser";
import express, { Application, Request, Response } from "express";
import { IndexRoutes } from "./routes";
import { notFound } from "./middlewares/notFound";
import { globalErrorHandler } from "./middlewares/globalErrorHandler";
import { auth } from "./lib/auth";
import { toNodeHandler } from "better-auth/node";
import path from "path";
import cors from "cors";
import { env } from "./config/env";
import qs from "qs";
import { PaymentController } from "./modules/payment/payment.controller";
import { AppointmentService } from "./modules/appointment/appointment.service";
import cron from "node-cron";

const app: Application = express();

app.set("query parser", (str: string) => qs.parse(str));
app.set("view engine", "ejs");
app.set("views", path.resolve(process.cwd(), "src/templates"));

app.use(
  cors({
    origin: [
      env.FRONTEND_URL,
      env.BETTER_AUTH_URL,
      "http://localhost:3000",
      "http://localhost:5000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  PaymentController.handleStripeWebhookEvent,
);

app.all("/api/auth/*splat", toNodeHandler(auth));

// Enable URL-encoded form data parsing
// app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

cron.schedule("*/25 * * * *", async () => {
  try {
    console.log("Running cron job to cancel unpaid appointments...");
    await AppointmentService.cancelUnpaidAppointments();
  } catch (error: any) {
    console.error(
      "Error occurred while canceling unpaid appointments:",
      error.message,
    );
  }
});

app.use("/api/v1", IndexRoutes);

// Basic route
app.get("/", async (req: Request, res: Response) => {
  res.status(201).json({
    success: true,
    message: "API is working",
  });
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
