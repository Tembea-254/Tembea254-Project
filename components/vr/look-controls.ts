"use client";

import { useEffect, useRef } from "react";

export interface View {
  yaw: number; // degrees, 0..360
  pitch: number; // degrees, -85..85
  fov: number; // degrees, 40..110
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/**
 * Unified "look around" controls for 360° scenes.
 *  - drag (mouse / touch) to look
 *  - scroll wheel / trackpad to turn; Ctrl/Cmd + wheel or pinch to zoom
 *  - arrow keys to turn
 *  - device orientation (phone tilt) when enabled
 *  - slow auto-pan when idle, resuming a few seconds after the last interaction
 * Calls `apply` at most once per animation frame with the latest view.
 */
export function useLookControls(
  target: React.RefObject<HTMLElement>,
  opts: { enabled: boolean; autoPan: boolean; gyro: boolean; initialYaw?: number; resetKey?: string; apply: (v: View) => void },
) {
  const view = useRef<View>({ yaw: opts.initialYaw ?? 0, pitch: 0, fov: 100 });
  const lastInteract = useRef(0);
  const applyRef = useRef(opts.apply);
  applyRef.current = opts.apply;
  const autoRef = useRef(opts.autoPan);
  autoRef.current = opts.autoPan;
  const dirty = useRef(true);

  // reset when the scene changes
  useEffect(() => {
    view.current = { yaw: opts.initialYaw ?? 0, pitch: 0, fov: 100 };
    dirty.current = true;
  }, [opts.resetKey, opts.initialYaw]);

  useEffect(() => {
    const el = target.current;
    if (!el || !opts.enabled) return;
    const touch = () => {
      lastInteract.current = performance.now();
      dirty.current = true;
    };

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinchDist = 0;

    const onDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      }
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
      touch();
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        view.current.fov = clamp(view.current.fov - (d - pinchDist) * 0.15, 40, 110);
        pinchDist = d;
        touch();
        return;
      }
      const k = view.current.fov / el.clientHeight;
      view.current.yaw = (view.current.yaw - (e.clientX - lastX) * k * 1.1 + 360) % 360;
      view.current.pitch = clamp(view.current.pitch + (e.clientY - lastY) * k * 1.1, -85, 85);
      lastX = e.clientX;
      lastY = e.clientY;
      touch();
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (!pointers.size) {
        dragging = false;
        el.style.cursor = "grab";
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) view.current.fov = clamp(view.current.fov + e.deltaY * 0.05, 40, 110);
      else {
        view.current.yaw = (view.current.yaw + (e.deltaY + e.deltaX) * 0.08 + 360) % 360;
      }
      touch();
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "ArrowLeft") view.current.yaw = (view.current.yaw - 6 + 360) % 360;
      else if (e.key === "ArrowRight") view.current.yaw = (view.current.yaw + 6) % 360;
      else return;
      touch();
    };

    el.style.cursor = "grab";
    el.style.touchAction = "none";
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [target, opts.enabled]);

  // phone tilt
  useEffect(() => {
    if (!opts.gyro || !opts.enabled) return;
    let base: number | null = null;
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.alpha == null || e.beta == null) return;
      if (base == null) base = e.alpha + view.current.yaw;
      view.current.yaw = (base - e.alpha + 360) % 360;
      view.current.pitch = clamp(e.beta - 90, -85, 85);
      touch();
    };
    const touch = () => {
      lastInteract.current = performance.now();
      dirty.current = true;
    };
    window.addEventListener("deviceorientation", onOrient);
    return () => window.removeEventListener("deviceorientation", onOrient);
  }, [opts.gyro, opts.enabled]);

  // frame loop: auto-pan + throttled apply
  useEffect(() => {
    if (!opts.enabled) return;
    let raf = 0;
    let prev = performance.now();
    let lastApply = 0;
    const loop = (t: number) => {
      const dt = Math.min(100, t - prev);
      prev = t;
      if (autoRef.current && t - lastInteract.current > 4000) {
        view.current.yaw = (view.current.yaw + dt * 0.006) % 360; // ~6°/s
        view.current.pitch *= 0.995; // ease back to the horizon
        dirty.current = true;
      }
      if (dirty.current && t - lastApply > 33) {
        applyRef.current({ ...view.current });
        dirty.current = false;
        lastApply = t;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [opts.enabled]);

  return {
    nudge: (dYaw: number) => {
      view.current.yaw = (view.current.yaw + dYaw + 360) % 360;
      lastInteract.current = performance.now();
      dirty.current = true;
    },
  };
}

/** iOS 13+ requires an explicit permission request for motion sensors. */
export async function requestMotionPermission(): Promise<boolean> {
  const D = (typeof window !== "undefined" ? (window.DeviceOrientationEvent as unknown) : undefined) as
    | { requestPermission?: () => Promise<"granted" | "denied"> }
    | undefined;
  if (!D) return false;
  if (typeof D.requestPermission === "function") {
    try {
      return (await D.requestPermission()) === "granted";
    } catch {
      return false;
    }
  }
  return true;
}
