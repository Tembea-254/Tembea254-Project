import { Binoculars, Car, Footprints, Plane } from "lucide-react";
import type { TravelMode } from "@/lib/data/vr";

/** One icon per travel mode, used everywhere so Walk and Drive never look alike. */
export const MODE_ICON: Record<TravelMode, typeof Car> = { fly: Plane, walk: Footprints, drive: Car, view: Binoculars };
