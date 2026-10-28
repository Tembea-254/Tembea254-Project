import { PLACE_BY_ID } from "./places";
import { VR_FOR_PLACE, getVR } from "./vr";

/** Photos and the matching 360° preview for a planner destination. */
export function placeMedia(placeId: string) {
  const place = PLACE_BY_ID[placeId];
  const vrSlug = VR_FOR_PLACE[placeId];
  const vr = vrSlug ? getVR(vrSlug) : undefined;
  const photos = Array.from(new Set([place?.image, vr?.cover, ...(vr?.gallery ?? [])].filter(Boolean))) as string[];
  return { photos, vrSlug, vrSpots: vr?.scenes.length ?? 0, highlights: vr?.highlights ?? [], bestTime: vr?.bestTime };
}
