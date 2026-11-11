/**
 * Feature switches. The marketplace (shop, sellers, checkout, orders) is off for the hackathon;
 * set NEXT_PUBLIC_MARKETPLACE=on in the environment and redeploy to bring it back.
 * Hiring drivers and guides from the trip planner keeps working either way.
 */
export const MARKETPLACE_ON = process.env.NEXT_PUBLIC_MARKETPLACE === "on";
