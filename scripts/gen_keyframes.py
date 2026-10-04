#!/usr/bin/env python3
"""場面ごとのキーフレームを codex の image_gen で作る（ChatGPTサブスク枠・4並列）。

  python3 gen_keyframes.py <kf_dir> [場面ID ...] [--force]

<kf_dir>/beats.json:
  {"style": "全場面に共通の指示（ステージ・キャラ・文字禁止・下1/3を空ける など）",
   "refs": ["stage-cast.png"],                    # 全場面に付ける参照（ステージ＋キャラの基準画像）
   "product_ref": "product.jpg",                  # 商品が映る場面だけに足す参照（実物の写真）
   "product_note": "商品の柄を写真どおりにする指示",
   "beats": {"b01": {"scene": "場面の説明", "product": false}, ...}}
できた画像は <kf_dir>/<場面ID>.png。既にあるものは飛ばす（--force で作り直す）。
"""
import json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor

D = os.path.abspath(sys.argv[1])
cfg = json.load(open(os.path.join(D, "beats.json")))
force = "--force" in sys.argv

def run(key):
    b = cfg["beats"][key]
    out = f"{key}.png"
    if os.path.exists(os.path.join(D, out)) and not force:
        return key, "skip"
    prompt = (f"Use your image_gen tool to generate ONE image. {cfg['style']}"
              f"{' ' + cfg.get('product_note', '') if b.get('product') else ''} SCENE: {b['scene']} "
              f"Save it in the current directory as {out}. Report the absolute path as the last line.")
    refs = list(cfg["refs"]) + ([cfg["product_ref"]] if b.get("product") else [])
    # -i は可変長なので必ず prompt の後ろに置く。stdin を閉じないとバックグラウンドで止まる
    cmd = ["codex", "exec", "--skip-git-repo-check", "-s", "workspace-write", "-C", D, prompt, "-i", *refs]
    try:
        with open(os.path.join(D, f"run-{key}.log"), "w") as lf:
            r = subprocess.run(cmd, stdin=subprocess.DEVNULL, stdout=lf, stderr=subprocess.STDOUT, timeout=1200)
    except Exception as e:  # 1枚の失敗（空き容量切れなど）で全体を止めない
        return key, f"FAIL {e}"
    return key, "ok" if os.path.exists(os.path.join(D, out)) else f"FAIL rc={r.returncode}"

keys = [k for k in sys.argv[2:] if k in cfg["beats"]] or list(cfg["beats"])
with ThreadPoolExecutor(4) as ex:  # codex の同時実行は4本が天井
    for k, s in ex.map(run, keys):
        print(k, s, flush=True)
