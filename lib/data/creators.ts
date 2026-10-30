/** Options on the creator application form (stored by id). */
export const CREATOR_FILMS = [
  { id: "walks", label: "Walking tours" },
  { id: "drives", label: "Game drives & road trips" },
  { id: "aerial", label: "Drone & aerial" },
  { id: "water", label: "Boats, beaches & water" },
  { id: "360", label: "360° video" },
  { id: "culture", label: "Culture, food & events" },
] as const;

export const CREATOR_GEAR = [
  { id: "phone", label: "Smartphone" },
  { id: "action", label: "Action camera (GoPro, DJI)" },
  { id: "camera", label: "Mirrorless / DSLR" },
  { id: "drone", label: "Drone" },
  { id: "360cam", label: "360° camera" },
] as const;

export const labelOf = (list: readonly { id: string; label: string }[], id: string) => list.find((x) => x.id === id)?.label ?? id;

export interface CreatorApplication {
  name: string;
  channel?: string;
  phone: string;
  hub?: string;
  films: string[];
  gear: string[];
  links: Record<string, string>;
  sample?: string | null;
  about: string;
  droneLicence?: string | null;
}
