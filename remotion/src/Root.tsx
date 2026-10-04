import { Composition } from "remotion";
import { H, W } from "./engine";
import { AdExample, FPS_AD, TOTAL_AD } from "./AdExample";

// 広告を増やすときは AdExample.tsx をコピーして、ここに Composition を1行足す
export const Root = () => (
  <Composition id="AdExample" component={AdExample} durationInFrames={TOTAL_AD} fps={FPS_AD} width={W} height={H} />
);
