import { BadgeCheck, FileText, Store, Wallet } from "lucide-react";
import { applyVendor } from "@/app/(app)/vendor/actions";
import { Submit, UploadField } from "@/components/admin/client";
import { Field, inputCls, textareaCls } from "@/components/admin/kit";
import { HUB_NAMES, SERVICE_TYPES, SHOP_CATEGORIES } from "@/lib/data/shop";

type V = { sellerType: string; hub: string | null; storeName: string; tagline: string; description: string; location: string; categories: string[]; phone: string; payoutAccount: string; kyc: { idNumber?: string; kraPin?: string; businessReg?: string }; logo: string | null } | null;

/** "Sell on Tembea" — the seller application with the KYC Kenyan marketplaces ask for. */
export function VendorApply({ v, commission }: { v: V; commission: number }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <form action={applyVendor} className="space-y-5 rounded-3xl bg-white p-5 shadow-card sm:p-6">
        <div>
          <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Sell on Tembea</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{v ? "Update your application" : "Open your store"}</h1>
          <p className="mt-1 text-sm text-ink-muted">Makers sell beadwork, kiondo, carvings and other Kenyan-made goods. Drivers, guides, photographers and artists sell their services. It's free to join; Tembea keeps a small commission only when you sell.</p>
        </div>
        <fieldset>
          <legend className="mb-2 font-display font-semibold">What do you sell?</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              ["maker", "Products I make", "Crafts, clothes, art, food"],
              ["pro", "My services", "Driving, guiding, photos, performances"],
              ["both", "Both", "Products and services"],
            ].map(([id, t, d]) => (
              <label key={id} className="flex cursor-pointer gap-2 rounded-2xl border-2 border-ink/10 p-3 has-[:checked]:border-savanna-500 has-[:checked]:bg-savanna-50">
                <input type="radio" name="sellerType" value={id} defaultChecked={(v?.sellerType ?? "maker") === id} className="mt-1 accent-savanna-600" />
                <span>
                  <span className="block font-display text-sm font-semibold">{t}</span>
                  <span className="text-xs text-ink-muted">{d}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 font-display font-semibold">Your store</legend>
          <Field label="Store name">
            <input name="storeName" required minLength={3} maxLength={60} defaultValue={v?.storeName} className={inputCls} placeholder="e.g. Enkiteng Crafts" />
          </Field>
          <Field label="Where you're based">
            <input name="location" required defaultValue={v?.location} className={inputCls} placeholder="e.g. Narok town" />
          </Field>
          <Field label="Area you serve (for services)">
            <select name="hub" defaultValue={v?.hub ?? ""} className={inputCls}>
              <option value="">—</option>
              {Object.entries(HUB_NAMES).map(([id, n]) => (
                <option key={id} value={id}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
          <Field label="One-line description" className="sm:col-span-2">
            <input name="tagline" maxLength={120} defaultValue={v?.tagline} className={inputCls} placeholder="Maasai beadwork made by women in Narok" />
          </Field>
          <Field label="About your store (optional)" className="sm:col-span-2">
            <textarea name="description" rows={3} defaultValue={v?.description} className={textareaCls} />
          </Field>
          <Field group label="Categories" className="sm:col-span-2">
            <div className="flex flex-wrap gap-2">
              {[...SHOP_CATEGORIES, ...SERVICE_TYPES].map((c) => (
                <label key={c.id} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-ink/10 px-3 py-2 text-sm has-[:checked]:border-savanna-500 has-[:checked]:bg-savanna-50">
                  <input type="checkbox" name="categories" value={c.id} defaultChecked={v?.categories.includes(c.id)} className="accent-savanna-600" /> {c.name}
                </label>
              ))}
            </div>
          </Field>
          <Field group label="Logo (optional)" className="sm:col-span-2">
            <UploadField name="logo" defaultValue={v?.logo ?? undefined} label="Upload logo" />
          </Field>
        </fieldset>
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 font-display font-semibold">Verification</legend>
          <Field label="National ID number">
            <input name="idNumber" required inputMode="numeric" pattern="\d{6,10}" defaultValue={v?.kyc.idNumber} className={inputCls} />
          </Field>
          <Field label="KRA PIN">
            <input name="kraPin" required pattern="[AaPp]\d{9}[A-Za-z]" defaultValue={v?.kyc.kraPin} className={inputCls} placeholder="A012345678Z" />
          </Field>
          <Field label="Business registration no. (optional)" className="sm:col-span-2">
            <input name="businessReg" defaultValue={v?.kyc.businessReg} className={inputCls} placeholder="Only if you're a registered business" />
          </Field>
        </fieldset>
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 font-display font-semibold">Contact & payouts</legend>
          <Field label="Phone for orders">
            <input name="phone" required inputMode="tel" defaultValue={v?.phone} className={inputCls} placeholder="0712 345 678" />
          </Field>
          <Field label="M-Pesa number for payouts" hint="Leave blank to use the same number">
            <input name="payoutAccount" inputMode="tel" defaultValue={v?.payoutAccount} className={inputCls} />
          </Field>
        </fieldset>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="agree" required className="mt-1 accent-savanna-600" />
          <span>I make or source these goods in Kenya (or provide these services myself), I'll describe them honestly, and I agree that Tembea keeps its commission from each sale before paying me.</span>
        </label>
        <Submit className="h-12 w-full sm:w-auto sm:px-8">{v ? "Send again" : "Send application"}</Submit>
      </form>
      <aside className="space-y-3">
        {[
          { icon: Store, t: "Your own store page", d: "A store card in the shop that opens your full catalogue." },
          { icon: BadgeCheck, t: "Verified in 2 days", d: "We check your ID and KRA PIN so buyers can trust every store." },
          { icon: Wallet, t: `About ${Math.round(commission * 100)}% commission`, d: "Taken only when you sell. The rest is yours, paid to M-Pesa once the order is delivered." },
          { icon: FileText, t: "Simple dashboard", d: "Add products or services, take bookings, ship orders and request payouts." },
        ].map((x) => (
          <div key={x.t} className="flex gap-3 rounded-3xl bg-white p-4 shadow-card">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-savanna-50 text-savanna-700">
              <x.icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-display font-semibold">{x.t}</span>
              <span className="text-sm text-ink-muted">{x.d}</span>
            </span>
          </div>
        ))}
      </aside>
    </div>
  );
}
