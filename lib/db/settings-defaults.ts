/** Default business settings. Admins change them in /admin/settings. */
export const DEFAULT_SETTINGS = {
  /** Tembea's share of each shop sale when the category or vendor has no override */
  commissionDefault: 0.12,
  /** per shop-category overrides, e.g. { carvings: 0.15 } */
  commissionByCategory: { beadwork: 0.12, garments: 0.12, carvings: 0.15, baskets: 0.12, art: 0.15, leather: 0.12, home: 0.12, food: 0.08 } as Record<string, number>,
  /** home delivery outside Nairobi (Nairobi uses deliveryNairobiKes) */
  deliveryFeeKes: 450,
  deliveryNairobiKes: 300,
  /** collecting from a Tembea pick-up station is cheaper */
  pickupFeeKes: 150,
  freeDeliveryOverKes: 10000,
  /** commission on services (drivers, guides, photographers, artists) */
  commissionServices: 0.1,
  /** days after delivery a buyer can ask for a return */
  returnWindowDays: 7,
  /** policy strikes before a store is suspended automatically */
  strikesToSuspend: 3,
  hireDepositRate: 0.3,
  /** new products need admin approval before they show in the shop */
  productApproval: true,
  minPayoutKes: 500,
  rewardTokensPerReview: 50,
  rewardTokensPerApprovedVideo: 200,
  rewardTokensPerLiveWalk: 300,
  /** what one token is worth when redeemed as a discount */
  tokenValueKes: 1,
  plannerFreeCredits: 5,
  maintenanceBanner: "",
};

export type Settings = typeof DEFAULT_SETTINGS;
