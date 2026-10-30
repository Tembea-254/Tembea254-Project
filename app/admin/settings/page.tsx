import { saveSettingsForm } from "../actions";
import { Submit } from "@/components/admin/client";
import { Field, PageHeader, Panel, inputCls } from "@/components/admin/kit";
import { SHOP_CATEGORIES } from "@/lib/data/shop";
import { usingRealPostgres } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Settings" };

const pct = (n: number) => Math.round(n * 1000) / 10;

export default async function SettingsAdmin() {
  const st = await getSettings();
  return (
    <>
      <PageHeader title="Settings" text="Commission, fees, rewards and other business rules. Changes apply immediately to new orders and rewards." />
      <form action={saveSettingsForm} className="space-y-5">
        <Panel title="Shop commission">
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr))]">
            <Field label="Default commission %" hint="Used when a category has no rate.">
              <input name="commissionDefault" type="number" step="0.5" min={0} max={50} defaultValue={pct(st.commissionDefault)} className={inputCls} />
            </Field>
            {SHOP_CATEGORIES.map((c) => (
              <Field key={c.id} label={`${c.name} %`}>
                <input name={`cat_${c.id}`} type="number" step="0.5" min={0} max={50} defaultValue={pct(st.commissionByCategory[c.id] ?? st.commissionDefault)} className={inputCls} />
              </Field>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-muted">A vendor-specific rate (set on the vendor in Marketplace & sellers) overrides these.</p>
        </Panel>
        <Panel title="Orders, deposits & payouts">
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr))]">
            <Field label="Home delivery, Nairobi area (KES)">
              <input name="deliveryNairobiKes" type="number" min={0} defaultValue={st.deliveryNairobiKes} className={inputCls} />
            </Field>
            <Field label="Home delivery, rest of Kenya (KES)">
              <input name="deliveryFeeKes" type="number" min={0} defaultValue={st.deliveryFeeKes} className={inputCls} />
            </Field>
            <Field label="Pick-up station (KES)">
              <input name="pickupFeeKes" type="number" min={0} defaultValue={st.pickupFeeKes} className={inputCls} />
            </Field>
            <Field label="Commission on services %">
              <input name="commissionServices" type="number" step="0.5" min={0} max={50} defaultValue={pct(st.commissionServices)} className={inputCls} />
            </Field>
            <Field label="Return window (days)">
              <input name="returnWindowDays" type="number" min={0} max={60} defaultValue={st.returnWindowDays} className={inputCls} />
            </Field>
            <Field label="Strikes before suspension">
              <input name="strikesToSuspend" type="number" min={1} max={10} defaultValue={st.strikesToSuspend} className={inputCls} />
            </Field>
            <Field label="Free delivery over (KES)">
              <input name="freeDeliveryOverKes" type="number" min={0} defaultValue={st.freeDeliveryOverKes} className={inputCls} />
            </Field>
            <Field label="Hire deposit %">
              <input name="hireDepositRate" type="number" step="1" min={0} max={50} defaultValue={pct(st.hireDepositRate)} className={inputCls} />
            </Field>
            <Field label="Minimum payout (KES)">
              <input name="minPayoutKes" type="number" min={0} defaultValue={st.minPayoutKes} className={inputCls} />
            </Field>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" name="productApproval" defaultChecked={st.productApproval} /> New products need admin approval before they go live
          </label>
        </Panel>
        <Panel title="Rewards & credits">
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr))]">
            <Field label="Tokens per approved review">
              <input name="rewardTokensPerReview" type="number" min={0} defaultValue={st.rewardTokensPerReview} className={inputCls} />
            </Field>
            <Field label="Tokens per approved video">
              <input name="rewardTokensPerApprovedVideo" type="number" min={0} defaultValue={st.rewardTokensPerApprovedVideo} className={inputCls} />
            </Field>
            <Field label="Tokens per live walk">
              <input name="rewardTokensPerLiveWalk" type="number" min={0} defaultValue={st.rewardTokensPerLiveWalk} className={inputCls} />
            </Field>
            <Field label="1 token is worth (KES)">
              <input name="tokenValueKes" type="number" step="0.1" min={0} defaultValue={st.tokenValueKes} className={inputCls} />
            </Field>
            <Field label="Free planner credits for new users">
              <input name="plannerFreeCredits" type="number" min={0} defaultValue={st.plannerFreeCredits} className={inputCls} />
            </Field>
          </div>
        </Panel>
        <Panel title="Site">
          <Field label="Announcement banner" hint="Shown at the top of the app when filled in. Leave empty to hide.">
            <input name="maintenanceBanner" defaultValue={st.maintenanceBanner} className={inputCls} />
          </Field>
          <p className="mt-3 text-xs text-ink-muted">Database: {usingRealPostgres ? "Postgres (connected)" : "local built-in database (development)"}.</p>
        </Panel>
        <Submit>Save settings</Submit>
      </form>
    </>
  );
}
