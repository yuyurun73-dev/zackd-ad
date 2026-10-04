# zackd-ad

Zack D. Films型（青いグリッドのステージ・淡々としたナレ・主張をモノで見せる3Dアニメ）の縦型AI広告を、台本から完パケmp4まで作るためのスキル。
Claude Code / Codex のスキルとして読み込んで使う。手順は `SKILL.md`。

## 入れ方

```bash
git clone https://github.com/yuyurun73-dev/zackd-ad ~/.agents/skills/zackd-ad
ln -s ~/.agents/skills/zackd-ad ~/.claude/skills/zackd-ad     # Claude Code から使う場合
```

## 必要なもの

- ElevenLabs のAPIキー（`ELEVENLABS_API_KEY` か `~/.config/elevenlabs/key`）
- codex CLI（image_gen・ChatGPTサブスク）
- Higgsfield（動画化・`grok_video_v15_lite`）
- Node.js / ffmpeg / whisper
- BGMとSFXは同梱していない。自分の素材を `remotion/public/bgm.mp3` と `remotion/public/sfx/*.wav` に置く

## 中身

| 場所 | 中身 |
|---|---|
| `SKILL.md` | 手順（台本→ナレ→場面割り→キーフレーム→動画化→編集→検品）とつまずいた所 |
| `reference/format.md` | 本家6本と広告3本を測った型 |
| `reference/script.md` | 台本の型と、主張をモノにする言い換え |
| `scripts/` | ナレ録りと検品・場面割り・キーフレーム生成・書き出しと検品・Drive素材の取得 |
| `remotion/` | 編集テンプレート（`engine.tsx`＝部品、`AdExample.tsx`＝実例） |
| `examples/ohisama-mawari/` | 実例の台本・場面割り・キーフレームの指示・基準画像・完成品のコマ一覧 |
