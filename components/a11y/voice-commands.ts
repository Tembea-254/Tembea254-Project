/**
 * Turns what someone said into one clear action. Pure function, so it's easy to test.
 * Rules are checked in a fixed order, most specific first, so "sign up" never scrolls up
 * and "open planner" never clicks a random "Open" button.
 */

export type VoiceAction =
  | { kind: "help" }
  | { kind: "stop-listening" }
  | { kind: "stop-reading" }
  | { kind: "read"; what: "page" | "heading" }
  | { kind: "scroll"; dir: "up" | "down"; amount: "small" | "page" | "big" }
  | { kind: "edge"; to: "top" | "bottom" }
  | { kind: "text-size"; dir: "up" | "down" | "reset" }
  | { kind: "contrast"; on: boolean | null }
  | { kind: "history"; dir: "back" | "forward" | "reload" }
  | { kind: "navigate"; path: string; name: string }
  | { kind: "login" }
  | { kind: "close" }
  | { kind: "submit" }
  | { kind: "type"; text: string }
  | { kind: "click"; target: string }
  | { kind: "unknown"; heard: string };

export const PAGES: { path: string; name: string; words: RegExp }[] = [
  { path: "/", name: "home", words: /\b(home ?page|home|landing|main page|start page)\b/ },
  { path: "/dashboard", name: "dashboard", words: /\b(dashboard|dash board|my account home)\b/ },
  { path: "/planner", name: "trip planner", words: /\b(planner|plan(ning)?|itinerar(y|ies)|my trips?|trip planner|ai planner)\b/ },
  { path: "/vr", name: "VR experiences", words: /\b(vr|v r|virtual( reality| tours?)?|360|three sixty|previews?|experiences)\b/ },
  { path: "/translator", name: "translator", words: /\b(translat\w*|languages?|swahili)\b/ },
  { path: "/marketplace", name: "marketplace", words: /\b(market ?place|market|hire|drivers?|guides?|photographers?)\b/ },
  { path: "/community", name: "community", words: /\b(community|social|feed|posts?)\b/ },
  { path: "/blog", name: "blog", words: /\b(blog|articles?|stories|travel guides?)\b/ },
  { path: "/safety", name: "safety", words: /\b(safety|sos|alerts?|emergency)\b/ },
  { path: "/profile", name: "profile", words: /\b(profile|settings|account)\b/ },
];

const FILLER = /\b(please|hey|ok(ay)?|tembea|can you|could you|would you|i want to|i'd like to|i would like to|let'?s|just|now|for me|the page|page of|section)\b/g;

export function normalize(raw: string) {
  return raw
    .toLowerCase()
    .replace(/[.,!?'"]/g, (m) => (m === "'" ? "'" : " "))
    .replace(FILLER, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseCommand(raw: string): VoiceAction {
  const c = normalize(raw);
  if (!c) return { kind: "unknown", heard: raw };
  const has = (re: RegExp) => re.test(c);

  if (has(/^(help|what can i say|commands|options|what do i say)$/) || has(/\bwhat can i (say|do)\b/)) return { kind: "help" };
  if (has(/\b(stop|turn off|cancel|end) (listening|voice( navigation)?|microphone|mic)\b/)) return { kind: "stop-listening" };
  if (has(/^(stop|quiet|silence|shut up|pause)$/) || has(/\b(stop|pause) (reading|talking|speaking)\b/)) return { kind: "stop-reading" };
  if (has(/\bread (the |this )?(heading|title)\b/)) return { kind: "read", what: "heading" };
  if (has(/\b(read|read out|read aloud)\b/) && !has(/\b(blog|articles?)\b/)) return { kind: "read", what: "page" };

  // text input — "type five days in Diani", "search for Lamu"
  const typed = c.match(/^(?:type|write|enter text|search for|search)\s+(.+)$/);
  if (typed) return { kind: "type", text: typed[1] };

  if (has(/^(submit|send|enter|done|confirm|go)$/) || has(/\b(press enter|submit (it|form)|send it)\b/)) return { kind: "submit" };
  if (has(/^(close|dismiss|escape|exit|close (it|this|menu|popup|window|dialog))$/)) return { kind: "close" };

  if (has(/\b(sign in|log ?in|sign up|create (an )?account|join)\b/)) return { kind: "login" };

  if (has(/\b(go |navigate )?back\b/) && !has(/\b(scroll|top)\b/)) return { kind: "history", dir: "back" };
  if (has(/\b(go )?forward\b/)) return { kind: "history", dir: "forward" };
  if (has(/\b(reload|refresh)\b/)) return { kind: "history", dir: "reload" };

  if (has(/\b(bigger|larger|increase|zoom in|enlarge)\b/)) return { kind: "text-size", dir: "up" };
  if (has(/\b(smaller|decrease|zoom out|shrink)\b/)) return { kind: "text-size", dir: "down" };
  if (has(/\b(normal|reset) (text|size|font)\b/)) return { kind: "text-size", dir: "reset" };
  if (has(/\bcontrast\b/)) return { kind: "contrast", on: has(/\b(off|disable|remove|normal)\b/) ? false : has(/\b(on|enable|high)\b/) ? true : null };

  if (has(/\b(top|beginning|start of)\b/) && has(/\b(go|scroll|back|to|jump)\b|^top$/)) return { kind: "edge", to: "top" };
  if (has(/\b(bottom|end|footer)\b/) && has(/\b(go|scroll|to|jump)\b|^(bottom|end)$/)) return { kind: "edge", to: "bottom" };
  if (has(/\b(scroll|move|go|page)? ?(down|lower|next)\b/) && !has(/\b(click|open|press|tap)\b/)) {
    return { kind: "scroll", dir: "down", amount: has(/\b(little|bit|slightly)\b/) ? "small" : has(/\b(lot|more|far)\b/) ? "big" : "page" };
  }
  if (has(/\b(scroll|move|go|page)? ?(up|higher|previous)\b/) && !has(/\b(click|open|press|tap)\b/)) {
    return { kind: "scroll", dir: "up", amount: has(/\b(little|bit|slightly)\b/) ? "small" : has(/\b(lot|more|far)\b/) ? "big" : "page" };
  }

  // explicit click verbs always mean "press something on this page"
  const press = c.match(/^(?:click|press|tap|select|choose|pick|hit)\s+(?:on\s+)?(.+)$/);
  if (press) return { kind: "click", target: press[1].replace(/\b(the|button|link|tab|on)\b/g, "").replace(/\s+/g, " ").trim() };

  // "go to planner", "open the marketplace", or just "planner"
  const nav = c.match(/^(?:go to|goto|go|open|show( me)?|take me to|navigate to|visit|switch to)\s+(.+)$/);
  const destination = nav ? nav[nav.length - 1] : c;
  const page = PAGES.find((p) => p.words.test(destination));
  if (page && (nav || destination.split(" ").length <= 3)) return { kind: "navigate", path: page.path, name: page.name };

  const click = c.match(/^(?:open|show)\s+(?:me\s+)?(.+)$/);
  if (click) return { kind: "click", target: click[1].replace(/\b(the|button|link|tab|on)\b/g, "").replace(/\s+/g, " ").trim() };

  return { kind: "unknown", heard: raw };
}

/** Finds the visible control whose text or label best matches what was said. */
export function findControl(target: string): HTMLElement | null {
  const words = target.split(" ").filter((w) => w.length > 1);
  if (!words.length) return null;
  const els = [...document.querySelectorAll<HTMLElement>("a[href], button, [role=button], [role=tab], [role=radio], [role=menuitem], summary, input[type=submit]")];
  let best: { el: HTMLElement; score: number } | null = null;
  for (const el of els) {
    if (el.closest("[data-a11y-panel]") || el.offsetParent === null || (el as HTMLButtonElement).disabled) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const text = `${el.innerText || ""} ${el.getAttribute("aria-label") || ""} ${el.getAttribute("title") || ""}`.toLowerCase().replace(/\s+/g, " ").trim();
    if (!text) continue;
    let score = 0;
    if (text === target) score = 100;
    else if (text.includes(target)) score = 60 - Math.min(30, text.length / 10);
    else {
      const hit = words.filter((w) => text.includes(w)).length;
      score = (hit / words.length) * 40;
    }
    // prefer things on screen
    if (r.top >= 0 && r.bottom <= window.innerHeight) score += 5;
    if (score > (best?.score ?? 20)) best = { el, score };
  }
  return best?.el ?? null;
}
