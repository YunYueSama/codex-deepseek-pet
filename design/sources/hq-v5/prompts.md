# imagegen 提示词

输入图顺序：Image 1 是唯一角色造型标准 `design/character-standard.png`；Image 2 是对应旧原画，只用于保持构图与姿势。

## 待机开眼/眨眼对

```text
Use case: stylized-concept
Asset type: production 2D game sprite sheet for a desktop companion
Input images: Image 1 is the absolute character design reference; Image 2 is the exact two-frame idle sheet to redraw.
Primary request: Redraw Image 2 as a clean, polished, cohesive pair of full-body idle sprites for the same character, following Image 1 exactly.
Subject: The blue whale-girl from Image 1: very long indigo-to-cyan gradient hair with the same curled ahoge, white frilled maid headband, blue whale hair bows, large round blue eyes, dark navy maid dress with the same trim, white apron carrying one clear blue whale emblem, one single blue whale tail, white stockings and navy shoes. Preserve the reference face, eye shape, proportions, costume construction, blue palette, outlines, and details.
Composition: Keep exactly two separate full-body sprites side-by-side in the same wide two-panel arrangement as Image 2. Keep generous empty space around each sprite; do not crop hair, hands, tail, skirt, legs, or shoes. Left sprite is a relaxed front-facing neutral idle with eyes open; right sprite is the exact same relaxed pose with eyes gently closed for a blink. Keep both bodies the same size and aligned at the feet. No other characters.
Style: High-resolution polished 2D anime illustration with clean confident dark linework, crisp edges, controlled cel shading, consistent details. Match Image 1's drawing style, not Image 2's older rendering.
Background: One perfectly flat pure magenta (#ff00ff) background, uniform to all edges, intended for clean chroma-key extraction. No transparency checkerboard, no gradient, no floor or shadows.
Constraints: Preserve the reference design faithfully; only redraw the two idle poses. Exactly one tail per character, attached at the lower back and visible to the side. White apron with blue whale emblem. Correct hands and anatomy.
Avoid: additional tails, duplicated limbs, altered clothes, changed hair ornaments, blur, glow, ghosting, motion trails, text, labels, watermark, panels, borders, props, checkerboard, noisy details, multiple outlines, motion marks.
```

## 独立应用头像

```text
Use case: logo-brand
Asset type: standalone square desktop application icon illustration, not a full sheet
Input images: Image 1 is the absolute design standard; Image 2 is the icon composition to redraw.
Primary request: Redraw the icon from Image 2 with the character identity, face, eyes, hair, outfit colors and linework of Image 1.
Subject: A close, friendly head-and-shoulders portrait of the same blue whale-girl. Preserve her blue-violet hair with cyan tips, curved ahoge, white frilled headband, blue whale side-fins and bow ornaments, large round blue eyes with dark pupils and clear upper lashes, soft cheeks, dark navy maid neckline and blue brooch. Show the top of her white apron with its blue whale emblem. Keep exactly the same face identity as the front views in Image 1.
Composition: One character, centered, symmetrical app icon crop from upper chest to top of hair, filling a 1:1 square with all hair ornaments intact; crisp silhouette and readable details at small size. Do not show a second figure.
Style: Polished clean 2D anime game icon, crisp consistent outline, restrained cel shading, precise blues and whites.
Background: Flat pure magenta (#ff00ff) to every edge for clean chroma-key removal. No transparency checkerboard.
Avoid: extra tails or limbs, cropped ahoge/headband, altered face, different eye color, white apron changed to blue, distorted whale symbol, blur, glow, gradients, text, letters, border, watermark, props.
```
