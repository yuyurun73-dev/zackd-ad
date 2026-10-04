import React from "react";
import {
  AbsoluteFill, Audio, Easing, Img, OffthreadVideo, Sequence, interpolate, random, spring, staticFile, useCurrentFrame,
} from "remotion";
// 広告ごとのデータは public/<広告ID>/ に置く（data.json＝build_data.py の出力、clips.json＝動かした場面の秒数）
import data from "../public/example/data.json";
import clipInfo from "../public/example/clips.json";

const AD = "example"; // public/ 以下のフォルダ名
import { Bubble, Confetti, FONT, H, Label, RED, Rays, Sparkles, Stamp, W, YELLOW, clamp, outline, quadMatrix } from "./engine";

// 実例：おひさまパンツ「まわりの子がどんどんパンツに」。新しい広告はこのファイルをコピーして、
// ENTER / MOTION / HL / SHAKES / Inner / Overlay / SFX の表だけを書き換える
export const FPS_AD = data.fps;
export const TOTAL_AD = data.totalFrames;

const IN = 4;
type Beat = { id: string; from: number; frames: number };
type Cap = { text: string; start: number; end: number; beat: string };
const beats = data.beats as Beat[];
const caps = data.captions as Cap[];
const beatOf = (id: string) => beats.find((b) => b.id === id)!;
const at = (beat: string, text: string, offset = 0) => {
  const c = caps.find((x) => x.beat === beat && x.text.includes(text))!;
  return Math.max(0, Math.round(c.start * FPS_AD) - beatOf(beat).from + offset);
};

type Enter = "none" | "push" | "up" | "whip" | "spin" | "flash";
const ENTER: Record<string, Enter> = {
  b01: "none", b02: "push", b03: "whip", b04: "up", b05: "spin", b06a: "push", b06b: "push", b07: "whip",
  b08: "spin", b09a: "push", b09b: "whip", b09c: "push", b10: "up", b11: "whip", b12a: "push", b12b: "flash",
  b13a: "push", b13b: "whip", b14: "up", b15: "push", b16: "spin", b17a: "whip", b17b: "push", b18a: "up",
  b18b: "flash", b19: "push",
};
// 静止画の場面は、場面ごとに寄り・引き・横移動を変えて止まって見えないようにする
type Motion = { s: [number, number]; x?: [number, number]; y?: [number, number]; o?: string };
const MOTION: Record<string, Motion> = {
  b02: { s: [1.02, 1.14], o: "45% 30%" }, b04: { s: [1.16, 1.03], o: "62% 22%" }, b05: { s: [1.03, 1.14], o: "50% 14%" },
  b06a: { s: [1.03, 1.16], o: "62% 40%" }, b06b: { s: [1.02, 1.12], o: "60% 30%" }, b07: { s: [1.1, 1.1], x: [-36, 30] },
  b08: { s: [1.02, 1.15], o: "66% 28%" }, b09a: { s: [1.0, 1.22], o: "55% 26%" }, b09b: { s: [1.12, 1.12], x: [34, -30] },
  b09c: { s: [1.03, 1.13], o: "78% 36%" }, b10: { s: [1.1, 1.1], x: [-30, 30], y: [10, -8] }, b12a: { s: [1.02, 1.16], o: "50% 34%" },
  b12b: { s: [1.2, 1.04], o: "52% 28%" }, b13a: { s: [1.03, 1.15], o: "66% 26%" }, b13b: { s: [1.04, 1.15], o: "52% 30%" },
  b15: { s: [1.1, 1.1], x: [30, -34] }, b16: { s: [1.0, 1.2], o: "26% 50%" }, b17a: { s: [1.16, 1.03], o: "70% 25%" },
  b17b: { s: [1.03, 1.2], o: "22% 28%" }, b18a: { s: [1.02, 1.15], o: "66% 18%" }, b18b: { s: [1.18, 1.04], o: "62% 16%" },
  b19: { s: [1.02, 1.1], o: "50% 22%" },
};
const HL: Record<string, string> = {
  "焦っているママへ": YELLOW, "ママの育て方でもありません": YELLOW, "まだオムツで": RED, "「なんでうちだけ」と": RED,
  "はかせている物かもしれません": YELLOW, "出たことに気づけません": RED, "薄いパンツで": YELLOW, "今度は怒ってしまう": RED,
  "このおひさまパンツです": YELLOW, "ぬれた感覚を": YELLOW, "中でとめます": YELLOW, "「でた」と": YELLOW, "うちの子だけ": RED,
  "交換できます": YELLOW, "在庫が残りわずかです": RED, "一枚変えるか": YELLOW, "下のボタンから": YELLOW,
};
const SHAKES: [string, number, number][] = [
  ["b01", 0, 22], ["b02", 4, 14], ["b07", 6, 16], ["b09c", at("b09c", "気づけません"), 14], ["b11", at("b11", "全部が床まで"), 20],
  ["b12b", 0, 16], ["b16", at("b16", "三十日以内", 2), 12], ["b16", at("b16", "交換できます"), 18], ["b17b", at("b17b", "在庫"), 22], ["b18b", 0, 14],
];

/** 生成画像の空白（吹き出し・掲示板・カレンダー）に、編集で文字や図を入れる。画と一緒に動くよう静止画の中に置く */
const Inner: React.FC<{ id: string }> = ({ id }) => {
  const f = useCurrentFrame() - IN;
  const pop = (from: number) => spring({ frame: f - from, fps: FPS_AD, config: { damping: 9, stiffness: 200, mass: 0.6 } });
  const box = (l: number, t: number, w: number, h: number): React.CSSProperties => ({
    position: "absolute", left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%`, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center",
  });
  const txt: React.CSSProperties = { fontFamily: FONT, fontWeight: 800, color: "#17202b", lineHeight: 1.25 };
  switch (id) {
    case "b04": {
      const a = at("b04", "オムツ卒業したよ", -3);
      return (
        <>
          <div style={{ ...box(44, 9.5, 38, 10.5), transform: `scale(${f < a ? 0 : pop(a)})` }}><div style={{ ...txt, fontSize: 56 }}>オムツ<br />卒業したよ！</div></div>
          <div style={{ ...box(44, 24.5, 38, 10.5), transform: `scale(${f < a + 16 ? 0 : pop(a + 16)})` }}><div style={{ ...txt, fontSize: 56 }}>うちも<br />昨日から！</div></div>
        </>
      );
    }
    case "b05": {
      // 掲示板に、パンツになった子が1人ずつ増えていく。最後の1人だけ灰色のまま
      const start = 6;
      return (
        <div style={{ ...box(12, 8.3, 76, 16.5), flexWrap: "wrap", gap: "14px 22px", alignContent: "center" }}>
          {Array.from({ length: 10 }, (_, i) => {
            const on = i < 9;
            const s = f < start + i * 4 ? 0 : pop(start + i * 4);
            return (
              <div key={i} style={{ width: 118, height: 118, borderRadius: 59, transform: `scale(${s})`, background: on ? YELLOW : "#8793a6", border: "7px solid #0b1b3f", display: "flex", alignItems: "center", justifyContent: "center", ...txt, fontSize: on ? 66 : 60, color: on ? "#0b1b3f" : "#e9edf3" }}>
                {on ? "✓" : "？"}
              </div>
            );
          })}
        </div>
      );
    }
    case "b07":
      return <div style={{ ...box(14, 3.5, 64, 15), opacity: interpolate(f, [4, 12], [0, 1], clamp) }}><div style={{ ...txt, fontSize: 70, color: "#f2f2f2", textShadow: "0 5px 0 rgba(0,0,0,.55)" }}>なんで<br />うちだけ…</div></div>;
    case "b16":
      return <CalendarScene f={f} />;
    case "b18a":
      return <div style={{ ...box(3, 11.5, 31, 12), opacity: interpolate(f, [4, 12], [0, 1], clamp) }}><div style={{ ...txt, fontSize: 36, color: "#f2f2f2", textShadow: "0 4px 0 rgba(0,0,0,.55)" }}>なんで<br />うちだけ…</div></div>;
    default:
      return null;
  }
};

// 生成画像の白いカレンダーは斜めに立っているので、編集で描く中身も同じ傾きの面に貼る（engine の quadMatrix）
const PAGE_W = 400;
const PAGE_H = 500;
// 白い紙の四隅（1080x1920上の位置）: 左上・右上・右下・左下
const PAGE_QUAD: [number, number][] = [[80, 716], [458, 727], [522, 1188], [128, 1232]];

/** 交換保証の場面。日めくりが1日ずつめくれて30日で止まり、「交換OK」のハンコが落ちる */
const CalendarScene: React.FC<{ f: number }> = ({ f }) => {
  const t0 = at("b16", "届いてから");
  const t30 = at("b16", "三十日以内", 2);
  const tOk = at("b16", "交換できます");
  // 数え上がりは後半ほど速くして、「三十日」と言う瞬間にちょうど30で止める
  const k = interpolate(f, [t0, t30], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  const day = Math.max(1, Math.min(30, Math.round(1 + k * 29)));
  const done = f >= t30;
  const punch = done ? interpolate(f - t30, [0, 4, 10], [1.5, 0.94, 1], clamp) : 1;
  // めくれる紙：数字が変わるたびに上辺を軸に1枚はね上がる
  const flipPhase = done ? 1 : (k * 29) % 1;
  const head = spring({ frame: f - 2, fps: FPS_AD, config: { damping: 12, stiffness: 170 } });
  const stamp = f < tOk ? 0 : interpolate(f - tOk, [0, 5], [2.4, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const tag = (from: number) => spring({ frame: f - from, fps: FPS_AD, config: { damping: 9, stiffness: 200, mass: 0.6 } });
  const orbit = (ph: number) => {
    const a = (f / 16 + ph) * Math.PI * 2;
    return { left: `${39 + Math.cos(a) * 16}%`, top: `${19.5 + Math.sin(a) * 9.6}%` };
  };
  const sizeTag: React.CSSProperties = { position: "absolute", fontFamily: FONT, fontWeight: 800, color: "#111", background: "#fff", border: "6px solid #000", borderRadius: 18, padding: "4px 18px 8px", boxShadow: "6px 6px 0 #000", whiteSpace: "nowrap" };
  return (
    <>
      {/* サイズ違いの2枚にサイズ札を付ける */}
      <div style={{ ...sizeTag, left: "9%", top: "27.5%", fontSize: 44, transform: `scale(${f < 3 ? 0 : tag(3)}) rotate(-4deg)` }}>サイズ90</div>
      <div style={{ ...sizeTag, left: "41%", top: "29.5%", fontSize: 50, background: YELLOW, transform: `scale(${f < 9 ? 0 : tag(9)}) rotate(3deg)` }}>サイズ100</div>
      {/* 矢印に沿って回る光（交換している動き） */}
      {[0, 0.5].map((ph) => (
        <div key={ph} style={{ position: "absolute", ...orbit(ph), width: 46, height: 46, transform: `translate(-50%,-50%) rotate(${f * 6}deg)`, background: "#fff", clipPath: "polygon(50% 0,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0 50%,40% 40%)", filter: "drop-shadow(0 0 14px #b6ff9a)" }} />
      ))}
      <div style={{ position: "absolute", left: 0, top: 0, width: PAGE_W, height: PAGE_H, transformOrigin: "0 0", transform: quadMatrix(PAGE_W, PAGE_H, PAGE_QUAD), overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 26, width: "100%", height: 84, background: RED, display: "flex", alignItems: "center", justifyContent: "center", transform: `scaleX(${head})`, transformOrigin: "0 50%" }}>
          <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 50, color: "#fff", letterSpacing: "0.06em" }}>届いてから</span>
        </div>
        <div style={{ position: "absolute", left: 0, top: 108, width: "100%", height: 220, display: "flex", alignItems: "baseline", justifyContent: "center", transform: `scale(${punch})`, opacity: f < t0 - 2 ? 0 : 1 }}>
          <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 205, lineHeight: 1, color: done ? RED : "#17202b", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.04em" }}>{day}</span>
          <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 60, color: "#17202b", marginLeft: 2 }}>日</span>
        </div>
        <div style={{ position: "absolute", left: 0, top: 304, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 800, fontSize: 46, color: "#17202b", opacity: interpolate(f, [t30, t30 + 5], [0, 1], clamp) }}>以内なら</div>
        {!done && f >= t0 ? (
          <div style={{ position: "absolute", left: 0, top: 110, width: "100%", height: 300, background: "linear-gradient(#ffffff,#e9edf3)", transformOrigin: "50% 0%", transform: `perspective(700px) rotateX(${-flipPhase * 115}deg)`, opacity: 1 - flipPhase * 0.75, boxShadow: "0 18px 24px rgba(0,0,0,.18)" }} />
        ) : null}
        {f >= tOk ? (
          <div style={{ position: "absolute", left: "50%", top: 412, transform: `translate(-50%,-50%) rotate(-6deg) scale(${stamp})`, fontFamily: FONT, fontWeight: 800, fontSize: 58, color: "#16a34a", border: "10px solid #16a34a", borderRadius: 18, padding: "0 22px 6px", background: "rgba(255,255,255,.95)", whiteSpace: "nowrap" }}>交換OK</div>
        ) : null}
      </div>
    </>
  );
};

/** 画面に固定で載せる演出（ラベル・ハンコ・紙ふぶきなど） */
const Overlay: React.FC<{ id: string }> = ({ id }) => {
  const f = useCurrentFrame();
  switch (id) {
    case "b09a":
      return <Label x={28} y={6} text="紙オムツの中" from={5} size={54} />;
    case "b09b":
      return (
        <>
          <Sparkles seed="3b09b" cx={45} cy={28} r={34} n={10} />
          <Stamp x={50} y={47} text="サラサラ" from={6} color="#0A84FF" rot={-6} size={110} />
        </>
      );
    case "b09c":
      return <Stamp x={50} y={50} text="気づけない" from={at("b09c", "気づけません")} size={104} />;
    case "b10":
      return <Label x={50} y={50} text="薄いパンツで気づかせる" from={at("b10", "薄いパンツで")} bg={YELLOW} size={56} rot={-2} />;
    case "b11":
      return <Stamp x={50} y={50} text="床が大洪水" from={at("b11", "全部が床まで")} size={104} />;
    case "b12b":
      return (
        <>
          <Rays />
          <Sparkles seed="3b12b" n={18} r={42} cy={30} color="#FFF6C2" />
          <Label x={50} y={6} text="おひさまパンツ" from={3} bg={YELLOW} size={84} rot={-2} />
        </>
      );
    case "b13a":
      return <Label x={38} y={5} text="①きづく層" from={5} size={64} rot={-2} />;
    case "b13b":
      return (
        <>
          <Label x={34} y={5} text="②ためる層" from={5} size={58} rot={-2} />
          <Label x={70} y={11} text="③とめる層" from={at("b13b", "外の層が")} size={58} rot={3} />
        </>
      );
    case "b14":
      return (
        <>
          <Confetti from={at("b14", "でた")} />
          <Bubble x={64} y={9} text="でた！" from={at("b14", "でた")} size={100} />
        </>
      );
    case "b15":
      return <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 32%, rgba(0,8,40,0) 38%, rgba(0,8,40,.6) 100%)", opacity: interpolate(f, [0, 14], [0, 1], clamp) }} />;
    case "b17b":
      return <Stamp x={62} y={12} text="残りわずか" from={at("b17b", "在庫")} size={112} />;
    case "b18a":
      return <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(0,8,40,.5) 0%, rgba(0,8,40,0) 55%)" }} />;
    case "b18b":
      return <Sparkles seed="3b18b" n={14} r={30} cx={66} cy={12} color="#FFF6C2" />;
    case "b19":
      return (
        <>
          <Label x={50} y={5} text="おひさまパンツ" from={5} bg={YELLOW} size={76} rot={-2} />
        </>
      );
    default:
      return null;
  }
};

const Shot: React.FC<{ beat: Beat }> = ({ beat }) => {
  const f = useCurrentFrame();
  const kind = ENTER[beat.id];
  const t = interpolate(f, [0, IN + 5], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const scaleIn = kind === "push" ? interpolate(t, [0, 1], [1.5, 1]) : kind === "spin" ? interpolate(t, [0, 1], [1.7, 1]) : 1;
  const yIn = kind === "up" ? interpolate(t, [0, 1], [H * 0.95, 0]) : 0;
  const xIn = kind === "whip" ? interpolate(t, [0, 1], [W * 1.05, 0]) : 0;
  const rotIn = kind === "spin" ? interpolate(t, [0, 1], [-14, 0]) : 0;
  const blur = kind === "none" || kind === "flash" ? 0 : interpolate(t, [0, 1], [18, 0]);
  const opacity = kind === "push" || kind === "spin" ? interpolate(f, [0, 3], [0, 1], clamp) : 1;
  const clip = (clipInfo as Record<string, number>)[beat.id];
  const total = beat.frames + IN;
  const local = (f - IN) / FPS_AD + beat.from / FPS_AD;
  const pulse = caps.filter((c) => c.beat === beat.id).reduce((m, c) => Math.max(m, interpolate(local - c.start, [0, 0.03, 0.24], [0, 0.035, 0], clamp)), 0);
  const shake = SHAKES.filter((s) => s[0] === beat.id).reduce((acc, [, sf, amp]) => {
    const d = f - IN - sf;
    if (d < 0 || d > 12) return acc;
    const k = (1 - d / 12) * amp;
    return [acc[0] + (random(`3x${beat.id}${f}`) - 0.5) * 2 * k, acc[1] + (random(`3y${beat.id}${f}`) - 0.5) * 2 * k];
  }, [0, 0]);
  const m = MOTION[beat.id] ?? { s: [1.02, 1.1] as [number, number] };
  const p = interpolate(f, [0, total], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  const ms = interpolate(p, [0, 1], m.s);
  const mx = m.x ? interpolate(p, [0, 1], m.x) : 0;
  const my = (m.y ? interpolate(p, [0, 1], m.y) : 0) + Math.sin(f / 10) * 4;
  const grade = beat.id === "b06a" || beat.id === "b07" || beat.id === "b15" ? "saturate(.7) brightness(.9)" : "";
  return (
    <AbsoluteFill style={{ opacity, transform: `translate(${xIn + shake[0]}px, ${yIn + shake[1]}px) rotate(${rotIn}deg) scale(${scaleIn * (1 + pulse)})`, filter: `${blur > 0.3 ? `blur(${blur}px)` : ""} ${grade}`.trim() || undefined }}>
      {clip ? (
        <OffthreadVideo muted src={staticFile(`${AD}/clips/${beat.id}.mp4`)} playbackRate={Math.min(1.35, Math.max(0.72, (clip * FPS_AD) / total))} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <AbsoluteFill style={{ transform: `translate(${mx}px, ${my}px) scale(${ms})`, transformOrigin: m.o ?? "50% 35%" }}>
          <Img src={staticFile(`${AD}/kf/${beat.id}.png`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <Inner id={beat.id} />
        </AbsoluteFill>
      )}
      <AbsoluteFill>
        <Sequence from={IN} layout="none">
          <Overlay id={beat.id} />
        </Sequence>
      </AbsoluteFill>
      {kind === "flash" ? <AbsoluteFill style={{ background: "#fff", opacity: interpolate(f, [0, 9], [1, 0], clamp) }} /> : null}
    </AbsoluteFill>
  );
};

const Captions: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS_AD;
  const c = caps.find((x) => t >= x.start && t < x.end);
  if (!c) return null;
  const k = interpolate(t - c.start, [0, 0.11], [0.72, 1], { ...clamp, easing: Easing.out(Easing.back(2.4)) });
  const color = HL[c.text] ?? "#fff";
  const size = c.text.length > 13 ? 70 : c.text.length > 11 ? 78 : color === "#fff" ? 88 : 98;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center" }}>
      <div style={{ marginTop: H * 0.632, transform: `scale(${k}) rotate(${color === "#fff" ? 0 : -2}deg)`, fontFamily: FONT, fontWeight: 800, fontSize: size, color, textShadow: outline(8), whiteSpace: "nowrap" }}>
        {c.text}
      </div>
    </AbsoluteFill>
  );
};

const HookTitle: React.FC = () => {
  const f = useCurrentFrame();
  const end = beats[1].from;
  const o = interpolate(f, [end - 6, end], [1, 0], clamp);
  const s = spring({ frame: f, fps: FPS_AD, config: { damping: 8, stiffness: 200, mass: 0.6 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", opacity: o }}>
      <div style={{ marginTop: H * 0.055, transform: `scale(${s}) rotate(-2deg)`, fontFamily: FONT, fontWeight: 800, fontSize: 80, color: "#111", background: YELLOW, border: "8px solid #000", borderRadius: 24, padding: "8px 32px 14px", boxShadow: "9px 9px 0 #000", whiteSpace: "nowrap" }}>
        トイトレ中のママへ
      </div>
    </AbsoluteFill>
  );
};

const Progress: React.FC = () => {
  const f = useCurrentFrame();
  return <div style={{ position: "absolute", left: 0, bottom: 0, height: 10, width: `${(f / TOTAL_AD) * 100}%`, background: YELLOW }} />;
};

type Sfx = { beat: string; at: number; file: string; vol: number; dur?: number };
const S = (beat: string, text: string | number, file: string, vol: number, dur?: number, off = 0): Sfx => ({
  beat, at: typeof text === "number" ? text : at(beat, text, off), file, vol, dur,
});
const SFX: Sfx[] = [
  S("b01", 0, "punch", 0.7), S("b01", 1, "boom", 0.55, 2.2), S("b01", 4, "whoosh6", 0.7), S("b01", "焦っている", "heartbeat", 0.55, 1.4),
  S("b02", 4, "slap", 0.5, 1.0), S("b02", 6, "m_healing", 0.4, 2.2), S("b02", "ママの育て方", "pop", 0.45),
  S("b03", "トイレ行ってくる", "w_close", 0.5, 1.6), S("b03", "走っていく", "whoosh2", 0.75), S("b03", 4, "pop", 0.4),
  S("b04", 2, "kids_cheer", 0.2, 2.4), S("b04", "オムツ卒業したよ", "ping", 0.5, undefined, -3), S("b04", "オムツ卒業したよ", "m_beep", 0.5, undefined, 13), S("b04", "オムツ卒業したよ", "whoosh5", 0.6, undefined, -5),
  ...Array.from({ length: 9 }, (_, i) => S("b05", 6 + i * 4, "pop", 0.4)), S("b05", 44, "nope", 0.55),
  S("b06a", 0, "sad_violin", 0.3, 1.5), S("b06a", "まだオムツで", "bonk", 0.4, 1.0),
  S("b06b", "でてない", "pop", 0.5), S("b06b", "でてない", "uhh", 0.3, 1.4),
  S("b07", 2, "m_boom_soft", 0.55, 2.6), S("b07", 6, "punch", 0.5), S("b07", 10, "suspense", 0.35, 2.4),
  S("b08", 4, "m_switch", 0.45), S("b08", "違うのは", "pop", 0.45), S("b08", "はかせている物", "m_chime", 0.4),
  S("b09a", 3, "splash", 0.55), S("b09a", 8, "w_bubbles", 0.42, 2.4), S("b09a", 5, "whoosh5", 0.6),
  S("b09b", 2, "sparkle", 0.4, 1.4), S("b09b", 6, "slap", 0.5, 1.0), S("b09b", 3, "whoosh2", 0.7),
  S("b09c", "気づけません", "nope", 0.6), S("b09c", "気づけません", "slap", 0.45, 1.0), S("b09c", "気づけません", "whoosh2", 0.7, undefined, -4),
  S("b10", 5, "m_chime", 0.45), S("b10", "薄いパンツで", "pop", 0.5), S("b10", "薄いパンツで", "whoosh5", 0.7, undefined, -2), S("b10", "気づかせる", "ping", 0.35),
  S("b11", 2, "splash", 0.6), S("b11", 4, "w_ripple", 0.4, 2.6), S("b11", "全部が床まで", "slap", 0.55, 1.0), S("b11", "全部が床まで", "whoosh2", 0.7, undefined, -4), S("b11", "今度は怒って", "shocked", 0.3, 1.4),
  S("b12a", 0, "m_riser_swooshy", 0.55, 2.3), S("b12a", "トイトレ中のママたち", "pop", 0.4),
  S("b12b", 0, "m_impact", 0.55, 2.0), S("b12b", 2, "heavenly", 0.36, 1.6), S("b12b", 4, "win", 0.5), S("b12b", 2, "whoosh4", 0.7),
  S("b13a", 4, "whoosh5", 0.7), S("b13a", 5, "pop", 0.45), S("b13a", "ぬれた感覚", "m_chime", 0.4),
  S("b13b", 4, "whoosh5", 0.7), S("b13b", 5, "pop", 0.45), S("b13b", "外の層が", "pop", 0.45), S("b13b", "中でとめます", "win", 0.5),
  S("b14", "でた", "kids_cheer", 0.34, 2.2), S("b14", "でた", "pop", 0.55), S("b14", "でた", "m_reward", 0.3, 2.0, 2), S("b14", "でた", "whoosh4", 0.7, undefined, -3),
  S("b15", 0, "sad_violin", 0.34, 4.4), S("b15", "うちの子だけ", "heartbeat", 0.55, 2.0), S("b15", "うちの子だけ", "bonk", 0.4, 1.0),
  S("b16", 3, "pop", 0.5), S("b16", 9, "pop", 0.5), S("b16", 1, "whoosh5", 0.7), S("b16", "届いてから", "m_switch", 0.45, undefined, -2),
  ...Array.from({ length: 9 }, (_, i) => S("b16", "届いてから", "m_click", 0.34 + i * 0.02, 0.3, 2 + Math.round((at("b16", "三十日以内", 2) - at("b16", "届いてから")) * Math.sqrt(i / 9)))),
  S("b16", "三十日以内", "m_chime", 0.55, undefined, 2), S("b16", "三十日以内", "punch", 0.45, undefined, 2),
  S("b16", "交換できます", "whoosh2", 0.75, undefined, -4), S("b16", "交換できます", "slap", 0.6, 1.0), S("b16", "交換できます", "win", 0.5, undefined, 2),
  S("b17a", 0, "w_slide", 0.45, 2.4), S("b17a", 6, "m_whoosh_fast", 0.6), S("b17a", 18, "whoosh3", 0.6), S("b17a", 30, "whoosh4", 0.6),
  S("b17b", 0, "m_boom_soft", 0.5, 2.2), S("b17b", "在庫", "slap", 0.6, 1.0), S("b17b", "在庫", "punch", 0.5), S("b17b", "在庫", "whoosh2", 0.7, undefined, -4),
  S("b18a", 2, "suspense", 0.36, 2.4), S("b18a", "なんでうちだけ", "bonk", 0.35, 1.0),
  S("b18b", 0, "m_impact", 0.5, 1.8), S("b18b", 3, "win", 0.5), S("b18b", "一枚変えるか", "m_chime", 0.42),
  S("b19", 0, "m_powerup", 0.4, 2.2), S("b19", 5, "pop", 0.45), S("b19", 4, "whoosh5", 0.7), S("b19", "下のボタン", "click", 0.5), S("b19", "確かめて", "m_click", 0.5),
];
const WHOOSH: Record<Enter, [string, number][]> = {
  none: [], push: [["m_whoosh_fast", 0.8], ["whoosh2", 0.8]], up: [["whoosh3", 0.8], ["m_whoosh_deep", 0.75]],
  whip: [["whoosh4", 0.85], ["whoosh6", 0.85]], spin: [["m_whoosh_main", 0.8]], flash: [["whoosh1", 0.7]],
};

export const AdExample: React.FC = () => (
  <AbsoluteFill style={{ background: "#0b2f9e" }}>
    {beats.map((b, i) => (
      <Sequence key={b.id} from={Math.max(0, b.from - (i === 0 ? 0 : IN))} durationInFrames={b.frames + IN + (i === 0 ? 0 : IN)}>
        <Shot beat={b} />
      </Sequence>
    ))}
    <Sequence from={0} durationInFrames={beats[1].from}>
      <HookTitle />
    </Sequence>
    <Captions />
    <Progress />
    <Audio src={staticFile(`${AD}/vo.wav`)} volume={1.15} />
    <Audio src={staticFile("bgm.mp3")} volume={(f) => interpolate(f, [0, 8, TOTAL_AD - 24, TOTAL_AD], [0, 0.3, 0.3, 0], clamp)} />
    {beats.slice(1).map((b, i) => {
      const opts = WHOOSH[ENTER[b.id]];
      const [file, vol] = opts[i % opts.length];
      return (
        <Sequence key={`w${b.id}`} from={Math.max(0, b.from - IN - 2)} durationInFrames={40}>
          <Audio src={staticFile(`sfx/${file}.wav`)} volume={vol} />
        </Sequence>
      );
    })}
    {SFX.map((s, i) => {
      const b = beatOf(s.beat);
      const d = Math.max(8, Math.round((s.dur ?? 1.4) * FPS_AD));
      return (
        <Sequence key={`s${i}`} from={b.from + s.at} durationInFrames={d}>
          <Audio src={staticFile(`sfx/${s.file}.wav`)} volume={(f) => s.vol * interpolate(f, [d - 8, d], [1, 0], clamp)} />
        </Sequence>
      );
    })}
  </AbsoluteFill>
);
