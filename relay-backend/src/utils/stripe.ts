import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export interface StripeSubscriptionUpdate {
  subscriptionId: string;
  subscriptionItemId: string;
  quantity: number;
  unitAmountPence: number;
}

export class StripeService {
  static async updateSubscription({
    subscriptionId,
    subscriptionItemId,
    quantity,
    unitAmountPence,
    productType,
  }: StripeSubscriptionUpdate & { productType: string }): Promise<void> {
    try {
      // Update the subscription item with new quantity and price
      await stripe.subscriptionItems.update(subscriptionItemId, {
        quantity,
        price_data: {
          currency: "gbp",
          product:
            productType === "under_100"
              ? process.env.STRIPE_PRODUCT_ID_UNDER_100!
              : process.env.STRIPE_PRODUCT_ID_OVER_100!,
          unit_amount: unitAmountPence,
          recurring: {
            interval: "month", // This will be updated based on billing_interval
          },
        },
      });

      console.log(`Successfully updated Stripe subscription ${subscriptionId}`);
    } catch (error) {
      console.error("Stripe subscription update failed:", error);
      throw new Error(
        `Failed to update Stripe subscription: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  static async updateSubscriptionWithInterval({
    subscriptionId,
    subscriptionItemId,
    quantity,
    unitAmountPence,
    interval,
    productType,
  }: StripeSubscriptionUpdate & {
    interval: "month" | "year";
    productType: string;
  }): Promise<void> {
    try {
      // Update the subscription item with new quantity and price
      await stripe.subscriptionItems.update(subscriptionItemId, {
        quantity,
        price_data: {
          currency: "gbp",
          product:
            productType === "under_100"
              ? process.env.STRIPE_PRODUCT_ID_UNDER_100!
              : process.env.STRIPE_PRODUCT_ID_OVER_100!,
          unit_amount: unitAmountPence,
          recurring: {
            interval,
          },
        },
      });

      console.log(
        `Successfully updated Stripe subscription ${subscriptionId} with ${interval} interval`
      );
    } catch (error) {
      console.error("Stripe subscription update failed:", error);
      throw new Error(
        `Failed to update Stripe subscription: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}

export { stripe };
