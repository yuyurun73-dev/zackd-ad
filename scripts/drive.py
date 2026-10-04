#!/usr/bin/env python3
"""公開されている Google Drive フォルダの中身を一覧・ダウンロードする（BGM・SFX素材用）。

  python3 drive.py ls <folderId>                 # 一覧（F=ファイル / D=フォルダ）
  python3 drive.py get <fileId> <保存先>          # 1ファイル取得
Drive コネクタは「本人が開いたファイル」しか返さないので、公開フォルダはこの方法で読む。
"""
import html, re, subprocess, sys

def ls(fid):
    for _ in range(5):  # 一覧ページは途中で切れることがあるので取り直す
        t = subprocess.run(["curl", "-sL", "--retry", "3", "-m", "60", "-A", "Mozilla/5.0",
                            f"https://drive.google.com/embeddedfolderview?id={fid}"], capture_output=True, text=True).stdout
        items = re.findall(r'<div class="flip-entry" id="entry-([^"]+)".*?<a href="([^"]+)".*?<div class="flip-entry-title">([^<]*)</div>', t, flags=re.S)
        if items:
            return [(i, "D" if "/folders/" in h else "F", html.unescape(n)) for i, h, n in items]
    return []

if sys.argv[1] == "ls":
    for i, k, n in ls(sys.argv[2]):
        print(k, i, n)
else:
    # 大きいファイルは python の urllib だと途中で切れる。curl の再試行つきで取る
    subprocess.run(["curl", "-sL", "--retry", "4", "--retry-all-errors", "-m", "180", "-o", sys.argv[3],
                    f"https://drive.usercontent.google.com/download?id={sys.argv[2]}&export=download&confirm=t"], check=True)
    print("saved", sys.argv[3])
