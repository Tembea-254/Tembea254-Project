"use client";

import type { jsPDF as JsPDF } from "jspdf";
import { placeMedia } from "@/lib/data/place-media";
import { PLACE_BY_ID } from "@/lib/data/places";
import type { Trip } from "@/lib/planner/types";
import { addDays, fmtDate, money, unsplash, type Currency } from "@/lib/utils";

const INK: [number, number, number] = [14, 46, 36];
const GREEN: [number, number, number] = [20, 168, 95];
const MUTED: [number, number, number] = [107, 129, 120];
const SAND: [number, number, number] = [246, 241, 231];
const RED: [number, number, number] = [200, 16, 46];

/** jsPDF's built-in fonts are WinAnsi — map characters they can't draw. */
const safe = (t: string) =>
  t
    .replace(/→/g, "to")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E\u00A0-\u00FF\u2013\u2014\u2022\u00B7\u00B0]/g, "");

async function toDataURL(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Builds a photo-rich, branded A4 itinerary. Returns the PDF as a Blob. */
export async function buildItineraryPDF(trip: Trip, currency: Currency = "KES"): Promise<Blob> {
  const [{ jsPDF }, QR] = await Promise.all([import("jspdf"), import("qrcode")]);
  const doc: JsPDF = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;
  const M = 16;
  const origin = window.location.origin;
  const total = Object.values(trip.planned).reduce((a, b) => a + b, 0);
  const start = trip.days[0]?.date ?? trip.startDate;
  const end = trip.days[trip.days.length - 1]?.date ?? trip.startDate;

  // Prefetch images in parallel
  const coverUrl = trip.cover.includes("images.unsplash.com") ? trip.cover.replace(/w=\d+/, "w=1400") : trip.cover;
  const stopImgs = trip.stops.map((s) => placeMedia(s.placeId).photos[0]);
  const [cover, logo, ...thumbs] = await Promise.all([toDataURL(coverUrl), toDataURL("/brand/logo-light.png"), ...stopImgs.map((p) => toDataURL(unsplash(p, 900, 560)))]);

  const footer = () => {
    const n = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Tembea254 · Plan Kenya with AI, preview it in 360°", M, H - 8);
    doc.text(`${n}`, W - M, H - 8, { align: "right" });
  };

  /* ---------- Cover ---------- */
  if (cover) doc.addImage(cover, "JPEG", 0, 0, W, 150, undefined, "FAST");
  else {
    doc.setFillColor(...INK);
    doc.rect(0, 0, W, 150, "F");
  }
  // dark band for legibility
  const gs = (doc as unknown as { GState: new (o: object) => unknown }).GState;
  doc.setGState(new gs({ opacity: 0.55 }) as never);
  doc.setFillColor(10, 21, 18);
  doc.rect(0, 92, W, 58, "F");
  doc.setGState(new gs({ opacity: 1 }) as never);
  // brand
  if (logo) {
    doc.setGState(new gs({ opacity: 0.6 }) as never);
    doc.setFillColor(10, 21, 18);
    doc.roundedRect(M - 4, 9, 56, 18.2, 4, 4, "F");
    doc.setGState(new gs({ opacity: 1 }) as never);
    doc.addImage(logo, "PNG", M, 12, 48, 12.2);
  }
  // stripe
  [INK, RED, GREEN, [242, 177, 58] as [number, number, number]].forEach((c, i) => {
    doc.setFillColor(...c);
    doc.rect(M + i * 9, 100, 9, 1.6, "F");
  });
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text(doc.splitTextToSize(safe(trip.title), W - 2 * M), M, 114);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(trip.stops.map((s) => PLACE_BY_ID[s.placeId].name).join("  >  "), M, 140);

  // facts row
  const facts = [
    ["DATES", `${fmtDate(start, { day: "numeric", month: "short" })} - ${fmtDate(end, { day: "numeric", month: "short", year: "numeric" })}`],
    ["TRAVELLERS", `${trip.travelers} · ${trip.group}`],
    ["STOPS", `${trip.stops.length} · ${trip.stops.reduce((a, s) => a + s.nights, 0)} nights`],
    ["ESTIMATED COST", money(total, currency)],
  ];
  facts.forEach(([k, v], i) => {
    const x = M + i * ((W - 2 * M) / 4);
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(k, x, 166);
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold");
    doc.text(String(v), x, 172);
    doc.setFont("helvetica", "normal");
  });

  /* ---------- Destination cards ---------- */
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...INK);
  doc.text("Where you're going", M, 190);
  doc.setFont("helvetica", "normal");

  let y = 197;
  let offset = 0;
  for (let i = 0; i < trip.stops.length; i++) {
    const s = trip.stops[i];
    const p = PLACE_BY_ID[s.placeId];
    const media = placeMedia(s.placeId);
    const from = addDays(trip.startDate, offset);
    offset += s.nights;
    const to = addDays(trip.startDate, offset);
    const cardH = 46;
    if (y + cardH > H - 16) {
      footer();
      doc.addPage();
      y = M;
    }
    doc.setFillColor(...SAND);
    doc.roundedRect(M, y, W - 2 * M, cardH, 4, 4, "F");
    if (thumbs[i]) doc.addImage(thumbs[i]!, "JPEG", M + 3, y + 3, 62, cardH - 6, undefined, "FAST");
    // number badge
    doc.setFillColor(...GREEN);
    doc.circle(M + 9, y + 9, 4, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(String(i + 1), M + 9, y + 10.4, { align: "center" });
    // text
    const tx = M + 70;
    doc.setTextColor(...INK);
    doc.setFontSize(13);
    doc.text(p.name, tx, y + 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    const textW = W - M - 36 - tx;
    doc.text(`${s.nights} night${s.nights > 1 ? "s" : ""} · ${fmtDate(from, { day: "numeric", month: "short" })} - ${fmtDate(to, { day: "numeric", month: "short" })}`, tx, y + 16);
    doc.text(doc.splitTextToSize(safe(`Stay: ${s.stay}`), textW)[0], tx, y + 20.5);
    doc.setTextColor(...INK);
    doc.text(doc.splitTextToSize(safe(p.blurb + (media.highlights.length ? ` — ${media.highlights.join(", ")}.` : ".")), textW).slice(0, 4), tx, y + 27);
    if (media.vrSlug) {
      const url = `${origin}/vr/${media.vrSlug}`;
      const qr = await QR.toDataURL(url, { margin: 0, width: 220, color: { dark: "#0E2E24", light: "#F6F1E7" } });
      doc.addImage(qr, "PNG", W - M - 30, y + 6, 26, 26);
      doc.setFontSize(7.5);
      doc.setTextColor(...GREEN);
      doc.setFont("helvetica", "bold");
      doc.textWithLink("360° PREVIEW", W - M - 30, y + 37, { url });
      doc.setFont("helvetica", "normal");
    }
    y += cardH + 5;
  }
  footer();

  /* ---------- Day by day ---------- */
  doc.addPage();
  y = M;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...INK);
  doc.text("Day by day", M, y + 6);
  y += 14;

  trip.days.forEach((d, i) => {
    const p = PLACE_BY_ID[d.placeId];
    const lines = d.items.map((it) => ({ it, notes: it.notes ? doc.splitTextToSize(safe(it.notes), W - 2 * M - 40) : [] }));
    const blockH = 14 + lines.reduce((a, l) => a + 6 + l.notes.length * 3.8, 0);
    if (y + Math.min(blockH, 40) > H - 16) {
      footer();
      doc.addPage();
      y = M;
    }
    // header
    doc.setFillColor(...INK);
    doc.roundedRect(M, y, W - 2 * M, 10, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`DAY ${i + 1}`, M + 4, y + 6.6);
    doc.setFont("helvetica", "normal");
    doc.text(`${fmtDate(d.date)} · ${p.name}`, M + 22, y + 6.6);
    doc.setFont("helvetica", "bold");
    doc.text(doc.splitTextToSize(safe(d.title), 80)[0], W - M - 4, y + 6.6, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 15;
    lines.forEach(({ it, notes }) => {
      if (y + 6 + notes.length * 3.8 > H - 16) {
        footer();
        doc.addPage();
        y = M;
      }
      doc.setFontSize(9.5);
      doc.setTextColor(...GREEN);
      doc.setFont("helvetica", "bold");
      doc.text(it.time, M + 2, y);
      doc.setTextColor(...INK);
      doc.setFont("helvetica", it.type === "activity" ? "bold" : "normal");
      doc.text(doc.splitTextToSize(safe(it.title), W - 2 * M - 60)[0], M + 18, y);
      doc.setFont("helvetica", "normal");
      if (it.cost > 0) {
        doc.setTextColor(...MUTED);
        doc.text(money(it.cost, currency), W - M - 2, y, { align: "right" });
      }
      y += 4;
      if (notes.length) {
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        doc.text(notes, M + 18, y);
        y += notes.length * 3.8;
      }
      y += 2;
    });
    y += 4;
  });
  footer();

  return doc.output("blob");
}

export function pdfFileName(trip: Trip) {
  return `${trip.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}.pdf`;
}

export function whatsappText(trip: Trip) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const lines = [
    `*${trip.title}*`,
    `${fmtDate(trip.days[0]?.date ?? trip.startDate, { day: "numeric", month: "short" })} – ${fmtDate(trip.days[trip.days.length - 1]?.date ?? trip.startDate, { day: "numeric", month: "short" })} · ${trip.travelers} travellers`,
    "",
    ...trip.stops.map((s, i) => {
      const m = placeMedia(s.placeId);
      return `${i + 1}. *${PLACE_BY_ID[s.placeId].name}* — ${s.nights} night${s.nights > 1 ? "s" : ""}${m.vrSlug ? `\n   360° preview: ${origin}/vr/${m.vrSlug}` : ""}`;
    }),
    "",
    "Planned with Tembea254",
  ];
  return lines.join("\n");
}
