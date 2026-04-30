import Stripe from "stripe";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _stripe: any = null;

export function getStripe() {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return _stripe as InstanceType<typeof Stripe>;
}
