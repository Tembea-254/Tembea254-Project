"use client";

import { useState } from "react";
import type { ProductCard as P } from "@/lib/repo/shop";
import { SERVICE_TYPE_BY_ID, SHOP_CATEGORY_BY_ID } from "@/lib/data/shop";
import { cn } from "@/lib/utils";
import { ProductCard } from "./product-card";

export function StoreProducts({ products }: { products: P[] }) {
  const cats = Array.from(new Set(products.map((p) => p.category)));
  const [cat, setCat] = useState("");
  const list = products.filter((p) => !cat || p.category === cat);
  return (
    <>
      {cats.length > 1 && (
        <div className="scrollbar-none -mx-1 mb-4 flex gap-2 overflow-x-auto px-1">
          {["", ...cats].map((c) => (
            <button key={c || "all"} onClick={() => setCat(c)} className={cn("h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-sm", cat === c ? "border-ink bg-ink text-white" : "border-ink/10 bg-white text-ink-soft")}>
              {c ? SHOP_CATEGORY_BY_ID[c]?.name ?? SERVICE_TYPE_BY_ID[c]?.name ?? c : `All (${products.length})`}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
        {list.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>
    </>
  );
}
