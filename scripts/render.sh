#!/bin/zsh
# 書き出し → 音のピーク制限 → 検品シートとナレの聞き取り検品まで。
#   render.sh <remotionのフォルダ> <Composition ID> <出力mp4> <台本 script.txt>
# ヘッドレスChromeが落ちる環境では REMOTION_BROWSER に chrome-headless-shell のラッパーを渡す
# （exec <chrome-headless-shell> --single-process --no-zygote "$@" と書いたスクリプト）。
set -e
R=$1; ID=$2; OUT=$3; SCRIPT=$4
cd "$R"
# 1フレーム1MB前後の一時ファイルができる。空きが5GB未満なら --frames で分割して書き出すこと
avail=$(df -k . | tail -1 | awk '{print int($4/1048576)}')
[ "$avail" -lt 5 ] && echo "空き容量 ${avail}GB：通し書き出しは途中で落ちる可能性あり（--frames で分割する）"
npx remotion render src/index.ts "$ID" "${OUT%.mp4}_raw.mp4" ${REMOTION_BROWSER:+--browser-executable $REMOTION_BROWSER} --concurrency 3 --crf 18 --jpeg-quality 78
ffmpeg -hide_banner -loglevel error -y -i "${OUT%.mp4}_raw.mp4" -c:v copy -af "alimiter=limit=0.9" -c:a aac -b:a 192k -movflags +faststart "$OUT"
rm -f "${OUT%.mp4}_raw.mp4"
# 検品1：1秒ごとのコマ（テロップが次の場面に残っていないか・文字が画に被っていないか）
ffmpeg -hide_banner -loglevel error -y -i "$OUT" -vf "fps=1,scale=165:-1,tile=12x7" -frames:v 1 "${OUT%.mp4}_sheet.jpg"
# 検品2：BGMとSFX込みの完成音声を書き起こして台本と突き合わせる（ナレが埋もれていないか）
ffmpeg -hide_banner -loglevel error -y -i "$OUT" -vn -ac 1 -ar 16000 "${OUT%.mp4}_mix.wav"
whisper "${OUT%.mp4}_mix.wav" --model large-v3-turbo --language ja --output_format txt --output_dir "$(dirname "$OUT")" --fp16 False >/dev/null 2>&1
python3 - "$SCRIPT" "${OUT%.mp4}_mix.txt" <<'E'
import re, difflib, sys
s = lambda t: re.sub(r"[\s、。「」!！?？]", "", t)
ref, hyp = s(open(sys.argv[1]).read()), s(open(sys.argv[2]).read())
print("ナレの一致率", round(difflib.SequenceMatcher(None, ref, hyp, autojunk=False).ratio(), 3), "（素のナレと同じ水準なら合格。漢字かなの表記ゆれで0.9前後になる）")
E
rm -f "${OUT%.mp4}_mix.wav" "${OUT%.mp4}_mix.txt"
ffmpeg -hide_banner -i "$OUT" -af loudnorm=print_format=summary -vn -f null - 2>&1 | grep -E "Input Integrated|Input True Peak"
echo "done: $OUT / 検品シート: ${OUT%.mp4}_sheet.jpg"
