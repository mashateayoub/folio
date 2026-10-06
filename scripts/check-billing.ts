import { stripeProvider } from "@/server/billing/service";

async function main() {
  const provider = stripeProvider();

  const price = await provider.prices.retrieve(
    process.env.STRIPE_TEAM_PRICE_ID!,
  );

  if (
    !price.active ||
    price.type !== "recurring" ||
    price.recurring?.interval !== "month" ||
    price.recurring.interval_count !== 1 ||
    price.recurring.usage_type !== "licensed" ||
    price.billing_scheme !== "per_unit" ||
    !price.unit_amount
  )
    throw new Error("Invalid Team price");

  const portal = process.env.STRIPE_PORTAL_CONFIGURATION_ID
    ? await provider.billingPortal.configurations.retrieve(
        process.env.STRIPE_PORTAL_CONFIGURATION_ID,
      )
    : (
        await provider.billingPortal.configurations.list({
          is_default: true,
          active: true,
          limit: 1,
        })
      ).data[0];

  if (
    !portal?.active ||
    !portal.features.invoice_history.enabled ||
    !portal.features.payment_method_update.enabled ||
    !portal.features.subscription_cancel.enabled ||
    portal.features.subscription_update.enabled
  )
    throw new Error("Portal configuration needs attention");

  if (price.livemode !== portal.livemode)
    throw new Error("Price and portal modes differ");
  console.log(
    JSON.stringify({
      configured: true,
      mode: price.livemode ? "live" : "sandbox",
      currency: price.currency,
      amount: price.unit_amount,
      interval: price.recurring.interval,
      portal: "ready",
    }),
  );
}

main().catch(() => {
  console.error(
    "Billing configuration validation failed. Check the key, monthly Team price, portal features, and provider connectivity.",
  );
  process.exitCode = 1;
});
