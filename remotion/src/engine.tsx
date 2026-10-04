import React from "react";
import { AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame } from "remotion";

// どの広告でも使い回す部品。広告ごとの中身（台本・場面・音）は AdExample.tsx の表に書く
export const FPS = 30;
export const W = 1080;
export const H = 1920;
export const FONT = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif';
export const YELLOW = "#FFE44D";
export const RED = "#FF3B30";
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const hard = (px: number) => `${px}px ${px}px 0 #000`;
/** テロップ用の黒フチ（24方向の影で縁取り＋落ち影） */
export const outline = (px: number) =>
  Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    return `${(Math.cos(a) * px).toFixed(1)}px ${(Math.sin(a) * px).toFixed(1)}px 0 #000`;
  }).join(",") + `, 0 ${px + 5}px 0 #000, 0 ${px + 12}px ${px + 10}px rgba(0,0,0,.45)`;

/** 白いシール風のラベル。ポンと出る */
export const Label: React.FC<{ x: number; y: number; text: string; from?: number; bg?: string; color?: string; size?: number; rot?: number; to?: number }> = ({
  x, y, text, from = 0, bg = "#fff", color = "#111", size = 56, rot = -3, to,
}) => {
  const f = useCurrentFrame() - from;
  if (f < 0 || (to !== undefined && f > to - from)) return null;
  const s = spring({ frame: f, fps: FPS, config: { damping: 9, stiffness: 190, mass: 0.6 } });
  return (
    <div style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: `translate(-50%,-50%) rotate(${rot}deg) scale(${s})` }}>
      <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: size, color, background: bg, border: "7px solid #000", borderRadius: 22, padding: "10px 26px 12px", boxShadow: hard(8), whiteSpace: "nowrap", lineHeight: 1.15 }}>
        {text}
      </div>
    </div>
  );
};

/** 枠つきのハンコ。大きく落ちてきて押される */
export const Stamp: React.FC<{ x: number; y: number; text: string; from: number; size?: number; rot?: number; color?: string }> = ({ x, y, text, from, size = 96, rot = -9, color = RED }) => {
  const f = useCurrentFrame() - from;
  if (f < 0) return null;
  const k = interpolate(f, [0, 5], [2.6, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const o = interpolate(f, [0, 3], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: `translate(-50%,-50%) rotate(${rot}deg) scale(${k})`, opacity: o }}>
      <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: size, color, border: `12px solid ${color}`, borderRadius: 20, padding: "6px 30px 10px", background: "rgba(255,255,255,.94)", whiteSpace: "nowrap", boxShadow: "0 14px 30px rgba(0,0,0,.35)" }}>
        {text}
      </div>
    </div>
  );
};

/** 吹き出し（登場人物のセリフ） */
export const Bubble: React.FC<{ x: number; y: number; text: string; from: number; size?: number }> = ({ x, y, text, from, size = 84 }) => {
  const f = useCurrentFrame() - from;
  if (f < 0) return null;
  const s = spring({ frame: f, fps: FPS, config: { damping: 8, stiffness: 200, mass: 0.5 } });
  return (
    <div style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: `translate(-50%,-50%) scale(${s}) rotate(4deg)` }}>
      <div style={{ position: "relative", fontFamily: FONT, fontWeight: 800, fontSize: size, color: "#111", background: "#fff", border: "8px solid #000", borderRadius: 60, padding: "14px 44px 20px", boxShadow: hard(8), whiteSpace: "nowrap" }}>
        {text}
        <div style={{ position: "absolute", left: 54, bottom: -34, width: 0, height: 0, borderLeft: "20px solid transparent", borderRight: "26px solid transparent", borderTop: "36px solid #000" }} />
        <div style={{ position: "absolute", left: 61, bottom: -18, width: 0, height: 0, borderLeft: "13px solid transparent", borderRight: "18px solid transparent", borderTop: "24px solid #fff" }} />
      </div>
    </div>
  );
};

/** きらめき（位置は seed ごとに固定の乱数） */
export const Sparkles: React.FC<{ seed: string; n?: number; cx?: number; cy?: number; r?: number; color?: string }> = ({ seed, n = 14, cx = 50, cy = 36, r = 34, color = "#fff" }) => {
  const f = useCurrentFrame();
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const a = random(`${seed}a${i}`) * Math.PI * 2;
        const d = (0.35 + random(`${seed}d${i}`) * 0.65) * r;
        const ph = random(`${seed}p${i}`) * 30;
        const tw = Math.max(0, Math.sin((f + ph) / 4.5));
        const size = 22 + random(`${seed}s${i}`) * 34;
        return (
          <div key={i} style={{ position: "absolute", left: `${cx + Math.cos(a) * d}%`, top: `${cy + Math.sin(a) * d * 0.6}%`, width: size, height: size, transform: `translate(-50%,-50%) scale(${tw}) rotate(${f * 3}deg)`, background: color, clipPath: "polygon(50% 0,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0 50%,40% 40%)", filter: "drop-shadow(0 0 10px rgba(255,255,255,.9))" }} />
        );
      })}
    </>
  );
};

/** 紙ふぶき */
export const Confetti: React.FC<{ from: number }> = ({ from }) => {
  const f = useCurrentFrame() - from;
  if (f < 0) return null;
  const cols = [YELLOW, "#FF7AA2", "#7CE3A1", "#fff", "#FFA53B"];
  return (
    <>
      {Array.from({ length: 46 }, (_, i) => {
        const a = -Math.PI / 2 + (random(`ca${i}`) - 0.5) * 2.4;
        const v = 22 + random(`cv${i}`) * 30;
        const x = 50 + (Math.cos(a) * v * f) / 12;
        const y = 44 + (Math.sin(a) * v * f) / 20 + (f * f) / 55;
        return (
          <div key={i} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, width: 22, height: 34, background: cols[i % cols.length], border: "3px solid #000", transform: `rotate(${f * (8 + (i % 7) * 3)}deg)`, opacity: interpolate(f, [40, 60], [1, 0], clamp) }} />
        );
      })}
    </>
  );
};

/** 商品の後ろで回る光の筋 */
export const Rays: React.FC<{ cx?: number; cy?: number }> = ({ cx = 50, cy = 36 }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ mixBlendMode: "screen", opacity: interpolate(f, [0, 10], [0, 0.55], clamp) }}>
      <div style={{ position: "absolute", left: `${cx}%`, top: `${cy}%`, width: 2600, height: 2600, transform: `translate(-50%,-50%) rotate(${f * 0.9}deg)`, background: "repeating-conic-gradient(rgba(255,240,170,.85) 0deg 7deg, rgba(255,240,170,0) 7deg 20deg)", WebkitMaskImage: "radial-gradient(circle, #000 0%, rgba(0,0,0,.6) 28%, transparent 56%)", maskImage: "radial-gradient(circle, #000 0%, rgba(0,0,0,.6) 28%, transparent 56%)" }} />
    </AbsoluteFill>
  );
};

/**
 * 生成画像の中の斜めの面（紙・看板・画面）に、編集で描いた w×h の板をぴったり貼るための射影変換。
 * q は 1080x1920 上の四隅（左上・右上・右下・左下）。貼る要素は left:0, top:0, transformOrigin:"0 0" にする。
 */
export const quadMatrix = (w: number, h: number, q: [number, number][]) => {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / den;
  const hh = (dx1 * dy3 - dx3 * dy1) / den;
  const A = x1 - x0 + g * x1, B = x3 - x0 + hh * x3, D = y1 - y0 + g * y1, E = y3 - y0 + hh * y3;
  return `matrix3d(${A / w},${D / w},0,${g / w},${B / h},${E / h},0,${hh / h},0,0,1,0,${x0},${y0},0,1)`;
};
