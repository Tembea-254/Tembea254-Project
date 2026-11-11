import type { jsPDF as JsPDF } from "jspdf";

/**
 * A simplified outline of Kenya (lon, lat), good enough for a locator map in the PDF.
 * Drawn as vectors, so it needs no map tiles, works offline and stays sharp when printed.
 */
const KENYA: [number, number][] = [
  [33.91, 0.1], [34.1, 0.6], [34.47, 1.04], [34.78, 1.25], [35.0, 1.9], [34.95, 2.5], [34.6, 3.1], [34.4, 3.7], [33.99, 4.23],
  [34.38, 4.61], [35.82, 5.0], [35.94, 4.62], [36.86, 4.45], [38.12, 3.6], [38.9, 3.5], [39.56, 3.42], [40.1, 3.95], [40.97, 4.0],
  [41.17, 3.94], [41.9, 3.98], [41.0, 2.78], [40.99, -0.85], [41.56, -1.67], [41.0, -2.05], [40.2, -2.7], [39.7, -3.45], [39.4, -4.1],
  [39.2, -4.67], [37.75, -3.65], [37.6, -3.0], [35.9, -1.95], [34.07, -1.0], [33.91, -0.55],
];
const LON: [number, number] = [33.8, 42.0];
const LAT: [number, number] = [-4.8, 5.1];

type RGB = [number, number, number];

/**
 * Draws Kenya at (x, y) with width w (height follows the map's shape), the route through `stops`
 * (lat, lng) and numbered markers. `highlight` marks one stop (the day's location) in red.
 * Returns the drawn height.
 */
export function drawKenyaMap(
  doc: JsPDF,
  x: number,
  y: number,
  w: number,
  stops: { coords: [number, number]; label?: string }[],
  opts: { highlight?: number; labels?: boolean; land?: RGB; line?: RGB; dot?: RGB; hot?: RGB; small?: boolean } = {},
) {
  const h = (w * (LAT[1] - LAT[0])) / (LON[1] - LON[0]);
  const px = (lon: number) => x + ((lon - LON[0]) / (LON[1] - LON[0])) * w;
  const py = (lat: number) => y + ((LAT[1] - lat) / (LAT[1] - LAT[0])) * h;
  const land = opts.land ?? [233, 245, 236];
  const line = opts.line ?? [20, 168, 95];
  const dot = opts.dot ?? [14, 46, 36];
  const hot = opts.hot ?? [200, 16, 46];

  // country
  const pts = KENYA.map(([lo, la]) => [px(lo), py(la)] as const);
  const deltas = pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]]);
  doc.setFillColor(...land);
  doc.setDrawColor(170, 200, 182);
  doc.setLineWidth(0.3);
  doc.lines(deltas, pts[0][0], pts[0][1], [1, 1], "FD", true);

  // route
  if (stops.length > 1) {
    doc.setDrawColor(...line);
    doc.setLineWidth(opts.small ? 0.5 : 0.8);
    (doc as unknown as { setLineDashPattern: (a: number[], p: number) => void }).setLineDashPattern(opts.small ? [1, 0.8] : [1.6, 1.2], 0);
    for (let i = 1; i < stops.length; i++) doc.line(px(stops[i - 1].coords[1]), py(stops[i - 1].coords[0]), px(stops[i].coords[1]), py(stops[i].coords[0]));
    (doc as unknown as { setLineDashPattern: (a: number[], p: number) => void }).setLineDashPattern([], 0);
  }

  // markers
  const r = opts.small ? 1.3 : 3;
  stops.forEach((s, i) => {
    const cx = px(s.coords[1]);
    const cy = py(s.coords[0]);
    const isHot = opts.highlight === i;
    doc.setFillColor(...(isHot ? hot : dot));
    doc.circle(cx, cy, isHot && opts.small ? r * 1.6 : r, "F");
    if (!opts.small) {
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.text(String(i + 1), cx, cy + 1, { align: "center" });
      if (opts.labels && s.label) {
        doc.setTextColor(...dot);
        doc.setFontSize(8);
        // label to the right unless that would run into a neighbouring stop (Mara sits just west of Nairobi)
        const crowded = stops.some((o, j) => j !== i && px(o.coords[1]) > cx && px(o.coords[1]) - cx < 30 && Math.abs(py(o.coords[0]) - cy) < 6);
        const right = cx < x + w * 0.62 && !crowded;
        doc.text(s.label, right ? cx + r + 1.5 : cx - r - 1.5, cy + 1, { align: right ? "left" : "right" });
      }
      doc.setFont("helvetica", "normal");
    }
  });
  return h;
}
