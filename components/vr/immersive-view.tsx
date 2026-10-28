"use client";

import { useEffect, useRef, useState } from "react";
import type { VRScene } from "@/lib/data/vr";
import { cn } from "@/lib/utils";
import { useLookControls, type View } from "./look-controls";
import { loadYouTubeAPI, type YTPlayer } from "./youtube";

export interface ImmersiveProps {
  scene: VRScene;
  poster: string;
  muted: boolean;
  autoPan: boolean;
  gyro: boolean;
  /** freeze playback (e.g. premium lock) */
  halted: boolean;
  onEnded: () => void;
  onProgress?: (p: { current: number; duration: number; watched: number }) => void;
  className?: string;
}

/**
 * Full-bleed, chrome-free 360° viewer.
 * YouTube sources: the player is mounted without controls, scaled past the viewport edges and covered
 * by our own interaction layer; the camera is steered via the IFrame API's spherical properties.
 * Self-hosted sources (video/photo): rendered on a WebGL sphere with three.js.
 */
export function ImmersiveView(props: ImmersiveProps) {
  return props.scene.source.kind === "youtube" ? <YouTubeSphere {...props} /> : <WebGLSphere {...props} />;
}

/* ------------------------------------------------------------------ */

function YouTubeSphere({ scene, poster, muted, autoPan, gyro, halted, onEnded, onProgress, className }: ImmersiveProps) {
  const src = scene.source as Extract<VRScene["source"], { kind: "youtube" }>;
  const hostRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const endedRef = useRef(onEnded);
  endedRef.current = onEnded;

  useLookControls(layerRef, {
    enabled: true,
    autoPan,
    gyro,
    initialYaw: scene.yaw,
    resetKey: scene.id,
    apply: (v: View) => {
      const p = player.current as unknown as { setSphericalProperties?: (o: object) => void } | null;
      try {
        p?.setSphericalProperties?.({ yaw: v.yaw, pitch: v.pitch, roll: 0, fov: v.fov });
      } catch {
        /* not ready */
      }
    },
  });

  // create once
  useEffect(() => {
    let dead = false;
    loadYouTubeAPI().then(() => {
      if (dead || !hostRef.current || !window.YT) return;
      const el = document.createElement("div");
      hostRef.current.appendChild(el);
      player.current = new window.YT.Player(el, {
        host: "https://www.youtube-nocookie.com",
        videoId: src.id,
        playerVars: { autoplay: 1, mute: 1, controls: 0, playsinline: 1, rel: 0, iv_load_policy: 3, disablekb: 1, fs: 0, modestbranding: 1, cc_load_policy: 0, start: src.start ?? 0 },
        events: {
          onReady: () => {
            setReady(true);
            player.current?.playVideo();
          },
          onStateChange: (e: { data: number }) => {
            if (e.data === 0) endedRef.current();
          },
        },
      });
    });
    return () => {
      dead = true;
      player.current?.destroy();
      player.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // switch scene
  const first = useRef(true);
  useEffect(() => {
    setRevealed(false);
    if (first.current) {
      first.current = false;
      return;
    }
    player.current?.loadVideoById({ videoId: src.id, startSeconds: src.start ?? 0 });
  }, [scene.id, src.id, src.start]);

  // reveal only once frames are flowing (hides the player's start-up title card)
  useEffect(() => {
    if (!ready) return;
    const t = window.setInterval(() => {
      const p = player.current;
      if (!p) return;
      try {
        const cur = p.getCurrentTime();
        const dur = p.getDuration() || 1;
        if (p.getPlayerState() === 1 && cur > (src.start ?? 0) + 1.2) setRevealed(true);
        onProgress?.({ current: cur, duration: dur, watched: cur - (src.start ?? 0) });
      } catch {
        /* ignore */
      }
    }, 400);
    return () => window.clearInterval(t);
  }, [ready, scene.id, src.start, onProgress]);

  useEffect(() => {
    const p = player.current;
    if (!p || !ready) return;
    if (muted) p.mute();
    else {
      p.unMute();
      p.setVolume(75);
    }
  }, [muted, ready, scene.id]);

  useEffect(() => {
    const p = player.current;
    if (!p || !ready) return;
    if (halted) p.pauseVideo();
    else p.playVideo();
  }, [halted, ready]);

  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-night", className)}>
      {/* player is oversized so no player chrome reaches the visible edges */}
      <div className="pointer-events-none absolute inset-0 scale-[1.18]">
        <div ref={hostRef} className="video-cover" />
      </div>
      {/* interaction layer — drag, wheel, pinch, keys all land here */}
      <div ref={layerRef} className="absolute inset-0 z-[1]" aria-label="Drag or scroll to look around" />
      <Curtain poster={poster} visible={!revealed} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function WebGLSphere({ scene, poster, muted, autoPan, gyro, halted, onEnded, onProgress, className }: ImmersiveProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const camRef = useRef<{ setView: (v: View) => void } | null>(null);
  const [revealed, setRevealed] = useState(false);

  useLookControls(mountRef, {
    enabled: true,
    autoPan,
    gyro,
    initialYaw: scene.yaw,
    resetKey: scene.id,
    apply: (v) => camRef.current?.setView(v),
  });

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    setRevealed(false);
    (async () => {
      const THREE = await import("three");
      const el = mountRef.current;
      if (!el || disposed) return;
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
      renderer.setSize(el.clientWidth, el.clientHeight);
      el.appendChild(renderer.domElement);
      const sceneGL = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(100, el.clientWidth / el.clientHeight, 0.1, 1100);
      const geo = new THREE.SphereGeometry(500, 60, 40);
      geo.scale(-1, 1, 1);
      let texture: import("three").Texture;
      if (scene.source.kind === "video") {
        const v = document.createElement("video");
        v.src = scene.source.src;
        v.crossOrigin = "anonymous";
        v.loop = false;
        v.muted = true;
        v.playsInline = true;
        v.autoplay = true;
        v.onended = () => onEnded();
        v.onplaying = () => setRevealed(true);
        v.ontimeupdate = () => onProgress?.({ current: v.currentTime, duration: v.duration || 1, watched: v.currentTime });
        videoRef.current = v;
        v.play().catch(() => {});
        texture = new THREE.VideoTexture(v);
      } else {
        texture = new THREE.TextureLoader().load((scene.source as { src: string }).src, () => setRevealed(true));
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: texture }));
      sceneGL.add(mesh);
      camRef.current = {
        setView: ({ yaw, pitch, fov }) => {
          const phi = THREE.MathUtils.degToRad(90 - pitch);
          const theta = THREE.MathUtils.degToRad(yaw);
          camera.fov = fov;
          camera.updateProjectionMatrix();
          camera.lookAt(Math.sin(phi) * Math.sin(theta), Math.cos(phi), -Math.sin(phi) * Math.cos(theta));
        },
      };
      camRef.current.setView({ yaw: scene.yaw ?? 0, pitch: 0, fov: 100 });
      const onResize = () => {
        camera.aspect = el.clientWidth / el.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(el.clientWidth, el.clientHeight);
      };
      window.addEventListener("resize", onResize);
      renderer.setAnimationLoop(() => renderer.render(sceneGL, camera));
      cleanup = () => {
        window.removeEventListener("resize", onResize);
        renderer.setAnimationLoop(null);
        renderer.dispose();
        geo.dispose();
        texture.dispose();
        videoRef.current?.pause();
        videoRef.current = null;
        el.removeChild(renderer.domElement);
      };
    })();
    return () => {
      disposed = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.id]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (halted) v.pause();
    else v.play().catch(() => {});
  }, [halted]);

  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-night", className)}>
      <div ref={mountRef} className="absolute inset-0" aria-label="Drag or scroll to look around" />
      <Curtain poster={poster} visible={!revealed} />
    </div>
  );
}

function Curtain({ poster, visible }: { poster: string; visible: boolean }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 z-[2] transition-opacity duration-1000", visible ? "opacity-100" : "opacity-0")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={poster} alt="" className="h-full w-full scale-105 object-cover blur-[2px]" />
      <div className="absolute inset-0 bg-night/40" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="flex items-center gap-3 rounded-full bg-night/50 px-5 py-2.5 font-display text-sm font-semibold text-white backdrop-blur">
          <span className="h-2 w-2 animate-ping rounded-full bg-savanna-400" /> Entering the scene
        </div>
      </div>
    </div>
  );
}
