import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { PaymentService } from "./payment.service";
import { env } from "../../config/env";
import { stripe } from "../../config/stripe.config";
import status from "http-status";
import { sendResponse } from "../../shared/sendResponse";

const handleStripeWebhookEvent = catchAsync(
  async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"];
    const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      console.error("Missing Stripe signature or webhook secret");
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "Missing Stripe signature or webhook secret" });
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        webhookSecret,
      );
    } catch (err: any) {
      console.log(`Error processing Stripe webhook:`, err.message);
      return res
        .status(status.BAD_REQUEST)
        .json({ message: "Error processing Stripe webhook" });
    }

    try {
      const result = await PaymentService.handlerStripeWebhookEvent(event);

      sendResponse(res, {
        statusCode: status.OK,
        success: true,
        message: "Stripe webhook event processed successfully",
        data: result,
      });
    } catch (error) {
      console.error("Error handling Stripe webhook event:", error);
      sendResponse(res, {
        statusCode: status.INTERNAL_SERVER_ERROR,
        success: false,
        message: "Error handling Stripe webhook event",
      });
    }
  },
);

export const PaymentController = {
  handleStripeWebhookEvent,
};
