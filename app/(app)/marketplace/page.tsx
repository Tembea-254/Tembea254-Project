import type { Metadata } from "next";
import { BedDouble, Car, Gem, Palette, ShoppingBag, Ticket, UtensilsCrossed, Users } from "lucide-react";
import { ComingSoonHero, PreviewCard } from "@/components/dashboard/coming-soon";
import { IMG } from "@/lib/data/images";
import { unsplash } from "@/lib/utils";

export const metadata: Metadata = { title: "Marketplace" };

export default function MarketplacePage() {
  return (
    <ComingSoonHero
      eyebrow="Marketplace"
      title="Book local, straight from your itinerary"
      text="Verified Kenyan guides, safari vans, lodges and artisans — paid with M-Pesa or card, and added to your trip automatically."
      icon={ShoppingBag}
      tone="bg-savanna-500"
    >
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PreviewCard icon={BedDouble} title="Lodges & camps" text="Compare stays along your route with real availability." tag="Stays" />
        <PreviewCard icon={Car} title="Safari vans & drivers" text="Pop-top Land Cruisers with KPSGA-certified guides." tag="Transport" />
        <PreviewCard icon={Ticket} title="Experiences" text="Balloon safaris, dhow cruises, cooking classes." tag="Activities" />
        <PreviewCard icon={Users} title="Local guides" text="Book Maasai walking guides and city hosts directly." tag="Guides" />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          { img: IMG.maasaiShuka, title: "Maasai beadwork & shúkà", icon: Gem },
          { img: IMG.mombasaBeach, title: "Swahili cooking in Mombasa", icon: UtensilsCrossed },
          { img: IMG.lamuTown, title: "Lamu woodcarving workshop", icon: Palette },
        ].map((x) => (
          <div key={x.title} className="group relative h-52 overflow-hidden rounded-3xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={unsplash(x.img, 700, 420)} alt={x.title} className="absolute inset-0 h-full w-full object-cover grayscale-[30%] transition-transform duration-700 group-hover:scale-105" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-night/85 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-4 font-display font-semibold text-white">
              <x.icon className="h-4 w-4 text-ochre-400" /> {x.title}
            </div>
          </div>
        ))}
      </div>
    </ComingSoonHero>
  );
}
