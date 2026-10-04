import type Stripe from "stripe";

// The billing service depends only on these provider fields and operations.
// Keeping the contract small lets test providers satisfy it without SDK casts.
export type BillingSubscription = Pick<
  Stripe.Subscription,
  "status" | "metadata"
> & {
  id: string;
  created: number;
  customer?: Stripe.Subscription["customer"];
  cancel_at_period_end?: boolean;
  cancel_at?: number | null;
  items: {
    data: {
      price: Pick<Stripe.Price, "id">;
      quantity?: number;
      current_period_end: number;
    }[];
  };
};

export type BillingPrice = Pick<
  Stripe.Price,
  "id" | "active" | "type" | "billing_scheme" | "unit_amount" | "currency"
> & {
  recurring: Pick<
    Stripe.Price.Recurring,
    "interval" | "interval_count" | "usage_type"
  > | null;
};

export type BillingCheckout = Pick<
  Stripe.Checkout.Session,
  "id" | "url" | "status"
> & { subscription?: string | Pick<Stripe.Subscription, "id"> | null };

export interface BillingProvider {
  prices: { retrieve(id: string): Promise<BillingPrice> };
  customers: {
    create(
      input: Stripe.CustomerCreateParams,
      options: Stripe.RequestOptions,
    ): Promise<{ id: string }>;
  };
  subscriptions: {
    list(input: Stripe.SubscriptionListParams): {
      autoPagingToArray(options: {
        limit: number;
      }): Promise<BillingSubscription[]>;
    };
    retrieve(id: string): Promise<BillingSubscription>;
  };
  checkout: {
    sessions: {
      create(
        input: Stripe.Checkout.SessionCreateParams,
        options: Stripe.RequestOptions,
      ): Promise<BillingCheckout>;
      retrieve(id: string): Promise<BillingCheckout>;
    };
  };
  billingPortal: {
    sessions: {
      create(
        input: Stripe.BillingPortal.SessionCreateParams,
      ): Promise<{ url: string }>;
    };
  };
}
