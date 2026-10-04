#!/usr/bin/env python3
"""ナレの文字時刻から、テロップの出る時刻と各場面の区間を作る。

  python3 build_data.py <ad_dir> <出力先 data.json>

<ad_dir>/plan.json:
  {"beats": [{"id": "b01", "chunks": ["テロップ1", "テロップ2"]}, ...],
   "display": {"でたと": "「でた」と"}}       # 画面に出すときだけ表記を変えたい句（任意）
chunks を全部つなげると script.txt と同じ文字列になること（句読点・かぎ括弧は無視して照合する）。
"""
import difflib, json, os, re, subprocess, sys

ad, out = sys.argv[1], sys.argv[2]
FPS = 30
plan = json.load(open(f"{ad}/plan.json"))
PLAN = [(b["id"], b["chunks"]) for b in plan["beats"]]
DISPLAY = plan.get("display", {})
strip = lambda s: re.sub(r"[\s、。「」!！?？]", "", s)

chars = json.load(open(f"{ad}/vo/timing.json"))["chars"]
hyp = "".join(c[0] for c in chars)
ref = "".join(strip(c) for _, cs in PLAN for c in cs)
script = strip(open(f"{ad}/script.txt").read())
if ref != script:
    i = next((k for k, (x, y) in enumerate(zip(ref, script)) if x != y), min(len(ref), len(script)))
    sys.exit(f"テロップの分割が台本と一致しない（{i}文字目付近）\n plan : …{ref[max(0,i-12):i+12]}…\n script: …{script[max(0,i-12):i+12]}…")

sm = difflib.SequenceMatcher(None, ref, hyp, autojunk=False)
m = [None] * len(ref)
for x, y, n in sm.get_matching_blocks():
    for k in range(n):
        m[x + k] = y + k
def near(i, step):
    while 0 <= i < len(ref):
        if m[i] is not None:
            return m[i]
        i += step

dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f"{ad}/vo/vo_final.wav"],
                           capture_output=True, text=True).stdout)
caps, beats, pos = [], [], 0
for beat, cs in PLAN:
    first = None
    for c in cs:
        n = len(strip(c))
        st, en = chars[near(pos, 1)][1], chars[near(pos + n - 1, -1)][2]
        caps.append({"text": DISPLAY.get(c, c), "start": st, "end": en, "beat": beat})
        first = st if first is None else first
        pos += n
    beats.append({"id": beat, "voStart": first})
total = dur + 0.5
# 場面の境目＝次の語り出しの0.05秒前
for i, b in enumerate(beats):
    b["start"] = 0 if i == 0 else max(0, b["voStart"] - 0.05)
# テロップは次が出るまで残す（空白の瞬間を作らない）。ただし自分の場面が終わったら消す（次の画に前の文字を残さない）
bend = {b["id"]: (beats[i + 1]["start"] if i + 1 < len(beats) else total) for i, b in enumerate(beats)}
for i, c in enumerate(caps):
    nxt = caps[i + 1]["start"] if i + 1 < len(caps) else dur
    c["end"] = min(nxt, c["end"] + 0.6, bend[c["beat"]])
for i, b in enumerate(beats):
    b["end"] = beats[i + 1]["start"] if i + 1 < len(beats) else total
    b["from"] = round(b["start"] * FPS)
for i, b in enumerate(beats):
    b["frames"] = (beats[i + 1]["from"] if i + 1 < len(beats) else round(total * FPS)) - b["from"]
    print(f'{b["id"]:5} {b["start"]:6.2f}-{b["end"]:6.2f} {b["end"]-b["start"]:.2f}s')
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
json.dump({"fps": FPS, "totalFrames": round(total * FPS), "beats": beats, "captions": caps}, open(out, "w"), ensure_ascii=False, indent=1)
print("total", round(total, 2), "sec / captions", len(caps), "/ 最長", max(len(c["text"]) for c in caps), "字")
