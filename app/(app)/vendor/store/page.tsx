import { redirect } from "next/navigation";
import { updateStore } from "../actions";
import { Submit, UploadField } from "@/components/admin/client";
import { Field, Panel, inputCls, textareaCls } from "@/components/admin/kit";
import { Flash } from "@/components/shell/workspace-tabs";
import { SHOP_CATEGORIES } from "@/lib/data/shop";
import { myVendor } from "@/lib/repo/shop";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Store settings" };

export default async function VendorStore({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const me = await requireUser();
  const v = await myVendor(me.id);
  if (!v || v.status === "rejected") redirect("/vendor");
  return (
    <>
      <Flash ok={searchParams.ok} error={searchParams.error} />
      <Panel title="How your store looks">
        <form action={updateStore} className="grid gap-4 sm:grid-cols-2">
          <Field group label="Logo">
            <UploadField name="logo" defaultValue={v.logo ?? undefined} label="Upload logo" />
          </Field>
          <Field group label="Banner (wide photo)">
            <UploadField name="banner" defaultValue={v.banner ?? undefined} label="Upload banner" />
          </Field>
          <Field label="One-line description" className="sm:col-span-2">
            <input name="tagline" maxLength={120} defaultValue={v.tagline} className={inputCls} />
          </Field>
          <Field label="About your store" className="sm:col-span-2">
            <textarea name="description" rows={4} defaultValue={v.description} className={textareaCls} />
          </Field>
          <Field label="Location">
            <input name="location" defaultValue={v.location} className={inputCls} />
          </Field>
          <Field label="Phone for orders">
            <input name="phone" inputMode="tel" defaultValue={v.phone} className={inputCls} />
          </Field>
          <Field label="M-Pesa number for payouts">
            <input name="payoutAccount" inputMode="tel" defaultValue={v.payoutAccount} className={inputCls} />
          </Field>
          <Field group label="What you sell" className="sm:col-span-2">
            <div className="flex flex-wrap gap-2">
              {SHOP_CATEGORIES.map((c) => (
                <label key={c.id} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-ink/10 px-3 py-2 text-sm has-[:checked]:border-savanna-500 has-[:checked]:bg-savanna-50">
                  <input type="checkbox" name="categories" value={c.id} defaultChecked={v.categories.includes(c.id)} className="accent-savanna-600" /> {c.name}
                </label>
              ))}
            </div>
          </Field>
          <p className="text-xs text-ink-muted sm:col-span-2">To change your store name or verification details, email support@tembea254.app.</p>
          <div className="sm:col-span-2">
            <Submit>Save store</Submit>
          </div>
        </form>
      </Panel>
    </>
  );
}
