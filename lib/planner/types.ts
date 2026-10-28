import type { Interest, Tier } from "../data/places";

export type TravelStyle = "relaxed" | "balanced" | "packed";
export type Group = "solo" | "couple" | "family" | "friends";

export interface PlanRequest {
  prompt: string;
  days: number;
  startDate: string; // YYYY-MM-DD
  travelers: number;
  group: Group;
  style: TravelStyle;
  budget: Tier;
  interests: Interest[];
  /** explicit place ids chosen with chips (optional) */
  places: string[];
  /** option fields the user set by hand; untouched ones can be overridden by what the prompt says */
  touched?: ("days" | "budget" | "group" | "travelers")[];
}

export type ItemType = "activity" | "meal" | "transport" | "stay" | "note";

export interface Item {
  id: string;
  time: string; // HH:MM
  title: string;
  type: ItemType;
  minutes?: number;
  /** total cost for the group in KES */
  cost: number;
  notes?: string;
  done?: boolean;
}

export interface Day {
  id: string;
  date: string;
  placeId: string;
  title: string;
  items: Item[];
}

export interface Leg {
  from: string;
  to: string;
  mode: "road" | "flight" | "train";
  minutes: number;
  km: number;
  cost: number; // per person KES
  label: string;
}

export interface Stop {
  id: string;
  placeId: string;
  nights: number;
  stay: string;
  stayPerNight: number;
}

export type ExpenseCategory = "stay" | "transport" | "activities" | "food" | "parks" | "other";

export interface Expense {
  id: string;
  label: string;
  category: ExpenseCategory;
  amount: number; // KES
  paidBy: string;
  date?: string;
}

export interface PackItem {
  id: string;
  label: string;
  category: string;
  packed: boolean;
  assignee?: string;
}

export interface Trip {
  id: string;
  title: string;
  summary: string;
  createdAt: number;
  updatedAt: number;
  startDate: string;
  travelers: number;
  travelerNames: string[];
  group: Group;
  style: TravelStyle;
  budget: Tier;
  interests: Interest[];
  stops: Stop[];
  days: Day[];
  /** planned costs by category (KES, whole group) */
  planned: Record<ExpenseCategory, number>;
  budgetLimit: number;
  expenses: Expense[];
  packing: PackItem[];
  notes: string;
  source: "engine" | "ai";
  cover: string;
}
