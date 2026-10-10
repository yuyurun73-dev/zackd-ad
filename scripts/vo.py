#!/usr/bin/env python3
"""ナレを通しで録って検品し、文字ごとの時刻まで出す。

  python3 vo.py <ad_dir> --voice <ElevenLabsのvoice_id> [--takes 3] [--tempo 1.12] [--model eleven_v4]

<ad_dir>/script.txt を読み、<ad_dir>/vo/ に take*.mp3・vo_final.wav・timing.json を作る。
鍵は環境変数 ELEVENLABS_API_KEY か ~/.config/elevenlabs/key。
"""
import argparse, difflib, json, os, re, subprocess, sys, urllib.request

ap = argparse.ArgumentParser()
ap.add_argument("ad_dir")
ap.add_argument("--voice", required=True)
ap.add_argument("--takes", type=int, default=3)
ap.add_argument("--tempo", type=float, default=1.12)
ap.add_argument("--model", default="eleven_v4")
ap.add_argument("--lang", default="ja")
ap.add_argument("--pick", type=int, help="使うテイク番号を手で指定する")
a = ap.parse_args()

vo = os.path.join(a.ad_dir, "vo")
os.makedirs(vo, exist_ok=True)
script = open(os.path.join(a.ad_dir, "script.txt")).read().strip()
key = os.environ.get("ELEVENLABS_API_KEY") or open(os.path.expanduser("~/.config/elevenlabs/key")).read().strip()
strip = lambda t: re.sub(r"[\s、。「」!！?？]", "", t)

# 行ごとに録ると間と抑揚が不自然になるので、必ず全文を1回で録る
for i in range(1, a.takes + 1):
    out = f"{vo}/take{i}.mp3"
    if os.path.exists(out):
        continue
    # 2分を超える音声は数MBになり、プロキシ越しの urllib だと途中で切れる。curl で取り、成功してから名前を付ける
    body = f"{vo}/body.json"
    json.dump({"text": script, "model_id": a.model, "language_code": a.lang}, open(body, "w"), ensure_ascii=False)
    r = subprocess.run(["curl", "-sS", "--fail", "--retry", "2", "-m", "600", "-o", out + ".part", "-X", "POST",
                        f"https://api.elevenlabs.io/v1/text-to-speech/{a.voice}?output_format=mp3_44100_192",
                        "-H", f"xi-api-key: {key}", "-H", "Content-Type: application/json", "--data-binary", f"@{body}"],
                       capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"ElevenLabs の生成に失敗: {r.stderr.strip()}")
    os.replace(out + ".part", out)
    print("recorded", out)

def whisper(path, words=False):
    subprocess.run(["whisper", path, "--model", "large-v3-turbo", "--language", a.lang, "--output_format", "json",
                    "--output_dir", vo, "--fp16", "False"] + (["--word_timestamps", "True"] if words else []),
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    return json.load(open(os.path.splitext(path)[0] + ".json"))

# 書き起こしと台本を突き合わせて、読み違いの少ないテイクを選ぶ（表記ゆれは差分に出るので目で確認する）
ref, best = strip(script), (0, None)
for i in range(1, a.takes + 1):
    hyp = strip("".join(s["text"] for s in whisper(f"{vo}/take{i}.mp3")["segments"]))
    sm = difflib.SequenceMatcher(None, ref, hyp, autojunk=False)
    diff = " | ".join(f"{ref[x:y]}→{hyp[c:e]}" for t, x, y, c, e in sm.get_opcodes() if t != "equal")
    print(f"take{i} ratio={sm.ratio():.3f}\n  {diff}")
    if sm.ratio() > best[0]:
        best = (sm.ratio(), i)
pick = a.pick or best[1]
print("use take", pick)

# 無音を詰めて少し速める。-35dBだと語尾を削るので -42dB、速度は 1.2 倍までにする
final = f"{vo}/vo_final.wav"
subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", f"{vo}/take{pick}.mp3", "-af",
                f"silenceremove=stop_periods=-1:stop_duration=0.15:stop_threshold=-42dB:detection=rms,atempo={a.tempo},loudnorm=I=-16:TP=-1.5:LRA=11",
                "-ar", "44100", "-ac", "1", final], check=True)
chars = []
for s in whisper(final, words=True)["segments"]:
    for w in s.get("words", []):
        t = strip(w["word"])
        for j, c in enumerate(t):
            span = (w["end"] - w["start"]) / max(len(t), 1)
            chars.append([c, round(w["start"] + span * j, 3), round(w["start"] + span * (j + 1), 3)])
json.dump({"chars": chars}, open(f"{vo}/timing.json", "w"), ensure_ascii=False)
print("vo_final.wav", round(chars[-1][2], 2), "sec /", len(chars), "chars")
