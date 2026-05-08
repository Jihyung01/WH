# WhereHere 캐릭터 16종 — GPT Image 프롬프트

## 캐릭터 라인업 (코드 기준 — `src/utils/characterAssets.ts`)

| 키 | 한글 이름 | 타입 | 진화 단계 | 폴백 이모지 |
|---|---|---|---|---|
| `explorer`  | **도담** | 자연 탐험가 | baby → teen → adult → legendary | 🌱 → 🌿 → 🌳 → 🏔️ |
| `foodie`    | **나래** | 바람의 미식가 | baby → teen → adult → legendary | 🍃 → 💨 → 🌊 → 🌪️ |
| `artist`    | **하람** | 햇빛의 화가 | baby → teen → adult → legendary | 🌤️ → ☀️ → 🔥 → 💎 |
| `socialite` | **별찌** | 별의 항해사 | baby → teen → adult → legendary | ✨ → ⭐ → 🌟 → 💫 |

레벨 구간: baby 1~5 / teen 6~15 / adult 16~30 / legendary 31+
업로드 경로: Supabase Storage `character-assets/{folder}/{stage}.png`
폴더 매핑: explorer→`dodam`, foodie→`narae`, artist→`haram`, socialite→`byeolzzi`
파일명: `baby.png`, `teen.png`, `adult.png`, `legendary.png`

---

## 사용법

1. **GPT Image (`gpt-image-1`) — ChatGPT 에서**: 아래 프롬프트 한 개 → 1024×1024 정사각으로 생성. 톤 일관성 위해 첫 1장은 `별찌 / Adult` 부터 만들고 그걸 **레퍼런스 이미지로 첨부** 한 채 나머지 15장 생성하면 화풍이 흔들리지 않습니다.
2. **Sora image / Midjourney**: 같은 프롬프트 그대로 작동. Midjourney 라면 끝에 `--ar 1:1 --v 7 --style raw` 추가.
3. **결과는 `assets/characters/` 에 임시 저장 → 검수 후 Supabase Storage 의 정확한 경로(`character-assets/{folder}/{stage}.png`)로 업로드**.

---

## 1. STYLE ANCHOR (모든 16개 프롬프트 앞에 붙이는 공통 블록)

```
A Pixar-quality 3D rendered chibi character, soft cell-shaded plushy texture, 
oversized round head with head-to-body ratio of 1 to 1.4, 
large expressive sparkle eyes with two tiny crescent white highlights, 
small rosy blush dabs on round cheeks, gentle approachable proportions, 
character standing on a small floating mossy rock platform with a few grass blades, 
soft rim lighting from the upper left in the character's signature color, 
slight 3/4 angle pose facing the viewer, gentle hover effect with 3 to 5 tiny glowing particles below the platform, 
background: deep navy gradient circular vignette (#0B0B1F at edges fading to #2A1D5C in the center) with scattered tiny white star pixels, 
mood: cozy magical realism, cosmic adventure storybook, 
high quality 3D render, octane-style lighting, subsurface scattering on the skin, 
1:1 square composition with the character occupying the central 70%, 
no text, no logos, no watermarks, no UI, character only, transparent edges falloff into the vignette.
```

---

## 2. 도담 (Explorer / 자연 + 흙) — 4종

> **공통 도담 무드**: 호기심 가득한 자연 탐험가. 컬러 = 숲 그린 + 흙 브라운 + 황금빛.
> 컬러 코드: 메인 `#7DA56D`, 액센트 `#C49B45`, 림라이트 `#FFE9A8`.

### 1-1. 도담 / Baby
```
[STYLE ANCHOR ABOVE]

Character: "Dodam" baby form, age 4-year-old equivalent. 
A tiny round chibi forest sprite with pale peach skin, 
fluffy mint-green hair with a single sapling sprout poking from the top with two small leaves, 
oversized hazelnut-brown round eyes full of wonder, 
wearing a simple sage-green tunic with cream trim and tiny acorn buttons, 
holding a single small acorn cupped in both hands close to the chest, 
slight head tilt, mouth open in a quiet "oh!" of discovery, 
small bare feet planted firmly on the platform, 
the platform has extra clovers and a tiny mushroom beside the character, 
rim light: warm golden #FFE9A8, signature accent color: #7DA56D forest green.
```

### 1-2. 도담 / Teen
```
[STYLE ANCHOR ABOVE]

Character: "Dodam" teen form, age 12-year-old equivalent. 
The forest sprite has grown taller, slimmer cheeks but still round, 
mint-green hair longer and messier with two leaf hairpins on the side, 
wearing a sage-green hooded vest over a cream long-sleeve shirt, brown shorts, 
small leather satchel strapped across the chest, 
holding a smooth wooden walking stick with a small brass cap, 
confident half-smile, eyes looking forward into the distance with mild determination, 
one foot slightly forward in a walking pose, 
the platform has more mature ferns and a small fox-tail grass tuft, 
rim light: warm golden #FFE9A8, signature accent color: #7DA56D forest green deepened to #5C7C3C.
```

### 1-3. 도담 / Adult
```
[STYLE ANCHOR ABOVE]

Character: "Dodam" adult form, mature park ranger explorer in their 20s. 
Defined cheekbones but still warm rounded face, 
mint-green hair tied back into a short ponytail with a leaf-shaped pin, 
wearing a weathered olive-green ranger jacket with embroidered acorn patches, 
brown belt with multiple small pouches, 
sturdy hiking boots, fingerless gloves, 
a full backpack with a rolled bedroll on top and a tin canteen hanging, 
in the right hand a brass compass open and glowing softly, 
the left hand resting on a vintage map tucked into the belt, 
confident grounded stance with feet apart, 
serene knowing smile, eyes warm and observant, 
the platform looks like a cliff edge with small wildflowers, 
rim light: deeper amber #D89045, signature accent color: #5C7C3C forest green.
```

### 1-4. 도담 / Legendary
```
[STYLE ANCHOR ABOVE]

Character: "Dodam" legendary form, mythic mountain guardian of an ancient forest. 
Tall noble poise, soft glowing skin with faint leaf-vein patterns on the cheeks, 
mint-green hair flowing as if caught by a mountain wind, crowned with a circlet of laurel leaves and a single floating topaz gem, 
wearing a cape woven from translucent mist with small leaves drifting through it, 
deep emerald long coat over chainmail of overlapping leaves, golden brooch shaped like a mountain peak, 
holding an ancient unfurled scroll-map that glows softly, 
the other hand outstretched with three tiny floating saplings circling the palm, 
majestic relaxed pose, eyes warm with millennial wisdom, 
the platform has become a small cliff with a tiny stream falling off the edge into mist, 
two small mountain birds in mid-flight beside the shoulders, 
rim light: ethereal sunlit gold #FFE9A8, signature accent color: emerald #2D6147 with copper highlights, additional aura of soft golden particles.
```

---

## 3. 나래 (Foodie / 바람 + 음식) — 4종

> **공통 나래 무드**: 바람을 타고 다니는 미식가. 컬러 = 시안 + 크림 + 바람 실버.
> 컬러 코드: 메인 `#7AC9D8`, 액센트 `#FAF1D9`, 림라이트 `#C8E8EE`.

### 2-1. 나래 / Baby
```
[STYLE ANCHOR ABOVE]

Character: "Narae" baby form, age 4-year-old equivalent. 
A tiny chibi wind-rider with pale peach skin, 
fluffy soft-cyan hair that floats slightly upward as if caught by a breeze, 
oversized cyan-blue round eyes, mouth in a peaceful tiny smile, 
wearing a small cream chef's apron with embroidered leaf prints, mint-green ribbon tied at the back, 
tiny soft slippers, 
holding a single perfect rice grain cupped in both hands as if it were a treasure, 
small wisps of white wind curl around the ankles and float upward, 
the platform has tiny dandelion seeds drifting up from it, 
rim light: cool silver #C8E8EE, signature accent color: #7AC9D8 cyan.
```

### 2-2. 나래 / Teen
```
[STYLE ANCHOR ABOVE]

Character: "Narae" teen form, age 12-year-old equivalent. 
A young apprentice wind-chef, slimmer face still warm and round, 
soft-cyan hair tied with a flowing cream bandana whose tails stream behind, 
oversized cyan eyes alive with curiosity, 
wearing a cream short-sleeve chef tunic with rolled-up cuffs, mint-green pants, soft canvas shoes, 
holding a polished wooden mixing spoon in the right hand and a small empty ceramic bowl in the left, 
slight forward lean as if mid-step, 
two or three tiny floating grains of rice and a single drifting mint leaf orbit around the head, 
rim light: cool silver #C8E8EE, signature accent color: deepened cyan #4FA3B5.
```

### 2-3. 나래 / Adult
```
[STYLE ANCHOR ABOVE]

Character: "Narae" adult form, master wind-chef in their 20s. 
Defined cheekbones, calm composed face, 
soft-cyan hair tied back with cream wind-pattern hairband, 
wearing a full white chef coat with cyan wind-swirl embroidery on the sleeves, mint-green wide pants, soft leather kitchen clogs, 
small spice satchel on the hip, 
dynamic mid-spin pose with the coat tails sweeping outward, 
both arms extended to the sides — five tiny ceramic tasting spoons with vibrant ingredients (red sauce, green leaf, golden broth, white salt, dark chocolate) float in a balanced arc around the character, 
serene focused expression with a hint of a smile, eyes half-closed in concentration, 
the platform has small swirls of vapor rising from it, 
rim light: cool silver #C8E8EE, signature accent color: cyan #4FA3B5 with cream highlights.
```

### 2-4. 나래 / Legendary
```
[STYLE ANCHOR ABOVE]

Character: "Narae" legendary form, mythic Stormchef who tastes the world's winds. 
Tall ethereal posture, soft glowing skin with faint cloud-pattern marks on the cheeks, 
soft-cyan hair flowing into an actual stream of wind that trails behind, 
crowned with a thin silver tiara holding a single drifting cloud-pearl, 
wearing a flowing translucent robe whose lower half dissolves into wind streams and tiny floating ingredients (one orchid, one chili, one pinch of salt sparkle), 
white chef coat with embroidered storm motifs underneath, 
holding a long silver ceremonial ladle that softly glows with cyan light in the right hand, 
the left hand outstretched with a small swirling tornado of seasonings dancing above the palm, 
majestic graceful pose mid-step, eyes closed in serene confidence, 
the platform has become a small cloud with the rocky base barely visible underneath, 
small swallows in flight beside the shoulders, 
rim light: bright silver-cyan #DCEFF3, signature accent color: storm cyan #2A8FA8 with white wind highlights, additional aura of swirling wind particles.
```

---

## 4. 하람 (Artist / 햇빛 + 불) — 4종

> **공통 하람 무드**: 햇빛과 불을 다루는 화가. 컬러 = 따뜻한 오렌지 + 햇빛 골드 + 불꽃 레드.
> 컬러 코드: 메인 `#F58A4B`, 액센트 `#FFC960`, 림라이트 `#FFE0B0`.

### 3-1. 하람 / Baby
```
[STYLE ANCHOR ABOVE]

Character: "Haram" baby form, age 4-year-old equivalent. 
A tiny chibi sun-painter with sun-warmed peach skin, 
fluffy bright-coral hair with a small paint brush tucked behind the ear like a hairpin, 
oversized warm amber round eyes, cheeks brushed with extra rosy blush, 
wearing a small mustard-yellow smock over a cream long-sleeve shirt, 
a tiny canvas paint-belt with three dabs of color (red, blue, yellow), 
soft canvas shoes, 
holding a tiny smooth pebble with a single brushstroke of orange paint on it, looking at it with wonder, 
small warm light particles floating upward from the platform, 
the platform has a few painted pebbles around it in different colors, 
rim light: warm golden #FFE0B0, signature accent color: #F58A4B coral orange.
```

### 3-2. 하람 / Teen
```
[STYLE ANCHOR ABOVE]

Character: "Haram" teen form, age 12-year-old equivalent. 
A young artist apprentice, slimmer expressive face, 
bright-coral hair with a small mustard beret on top decorated with a tiny brass sun pin, 
oversized amber eyes alive and creative, 
wearing a paint-splattered cream apron over a denim shirt with rolled sleeves, mustard pants, 
canvas sneakers with a few colorful paint marks, 
holding an open softly-glowing sketchbook in the left hand and a fine brush in the right, 
slight smirk of creative excitement, eyes looking up at an invisible inspiration, 
3 small floating brushes with different colored tips orbit around in an arc, 
the platform has a few overturned paint tubes leaking color, 
rim light: warm golden #FFE0B0, signature accent color: deepened coral #D86A2E.
```

### 3-3. 하람 / Adult
```
[STYLE ANCHOR ABOVE]

Character: "Haram" adult form, master light-painter in their 20s. 
Defined warm features, intent focused face, 
bright-coral hair tied back with a paint-stained leather strap, 
wearing a long burnt-orange artist coat with rolled-up sleeves, ornate paint bandolier across the chest holding 5 brushes of different sizes, 
brush quiver strapped to the back, leather work-belt with paint pouches, paint-stained boots, 
both hands wreathed in soft warm flame, painting an invisible canvas in the air with sweeping gestures, 
visible glowing brushstrokes hanging in the air around the hands in coral, gold, and red, 
focused expression with eyes narrowed in concentration, slight smile of mastery, 
the platform has small embers floating up from it, 
rim light: glowing amber #FFC960, signature accent color: ember coral #D86A2E with golden highlights.
```

### 3-4. 하람 / Legendary
```
[STYLE ANCHOR ABOVE]

Character: "Haram" legendary form, mythic Sun-Painter who paints with living light. 
Tall radiant posture, sun-kissed skin with faint glowing constellation marks on the temples, 
bright-coral hair flowing as if lit from within, crowned by a circlet that holds a small floating diamond above the forehead like a third eye, 
wearing a flowing robe woven from molten sunlight that ripples in slow motion, 
underneath an ornate sleeveless tunic embroidered with sun-rays, golden bracers on the forearms, 
holding a single brush of pure light in the right hand from which trail floating brushstrokes that turn into birds and small flames, 
left hand outstretched with a hovering sphere of swirling colors, 
majestic painting pose with one foot stepping forward, eyes glowing softly amber, 
the platform has become a sunlit cliff at golden hour with light beams shooting upward, 
two small phoenix-like sparks orbiting at shoulder height, 
rim light: brilliant sun-gold #FFE0B0, signature accent color: molten coral #C2491A with diamond-white highlights, additional aura of sun ray particles.
```

---

## 5. 별찌 (Socialite / 별 + 우주) — 4종 ⭐ Adult 버전이 첨부 보드와 일치

> **공통 별찌 무드**: 별과 우주를 안내하는 항해사. 컬러 = 밝은 옐로우 별 + 코스믹 퍼플 + 네뷸라 틸.
> 컬러 코드: 메인 `#FFD93D`, 액센트 `#7C4DFF`, 림라이트 `#FFE9A8`.

### 4-1. 별찌 / Baby
```
[STYLE ANCHOR ABOVE]

Character: "Byeolzzi" baby form, age 4-year-old equivalent. 
A tiny chibi star-baby with pale starlight skin, 
fluffy lavender-cream hair with a tiny five-point yellow star pinned right on top, 
oversized purple-blue round eyes that take up almost half the face, with extra-large white sparkle highlights, 
mouth in a small "o" of awe, 
wearing a soft cream onesie with small yellow star prints all over, 
tiny knitted booties, 
holding a single twinkling yellow star particle floating just above cupped hands, 
small constellations of 3 to 4 tiny stars orbit slowly around the head, 
the platform has tiny glowing star dust on it, 
rim light: warm star-gold #FFE9A8, signature accent color: #FFD93D bright yellow star.
```

### 4-2. 별찌 / Teen
```
[STYLE ANCHOR ABOVE]

Character: "Byeolzzi" teen form, age 12-year-old equivalent. 
A young star-explorer apprentice, slimmer curious face, 
lavender-cream hair tucked under a wide-brimmed indigo explorer hat with a single yellow star pin on the front, 
oversized purple-blue eyes still huge but with a sharper inquisitive focus, 
wearing a deep-purple short cape over a cream long-sleeve shirt, navy shorts, 
small five-point yellow star pendant on a silver chain, 
sturdy little explorer boots, 
holding a short wooden wand with a yellow paper-craft star at the tip, glancing curiously to the side as if just spotted something, 
2 to 3 small yellow stars orbit playfully around the wand tip, 
the platform has a faint floating constellation diagram drawn in the air beside it, 
rim light: warm star-gold #FFE9A8, signature accent color: deepened purple #5C3FB8 with yellow star highlights.
```

### 4-3. 별찌 / Adult ⭐ — 첨부 보드와 정확히 매칭
```
[STYLE ANCHOR ABOVE]

Character: "Byeolzzi" adult form, master star-navigator in their 20s. 
Warm rounded face still chibi-friendly, alert intelligent eyes, 
lavender-cream hair tucked under a tall pointed indigo wizard hat with a wide brim, 
the hat has a single bright golden five-point star embroidered on the front and small yellow star embroidery dotted along the brim, 
oversized purple-blue eyes with confident sparkle, friendly half-smile, 
wearing a deep-purple high-collared adventurer's tunic with golden trim, 
brown leather belt with multiple small pouches, 
a forest-green explorer backpack with rolled bedroll on top, brass clasps, 
sturdy brown leather adventurer boots, 
in the right hand a wooden wand topped with a glowing bright-yellow five-point star (the star is the brightest light source in the image), 
left hand resting confidently at the side, 
relaxed standing pose with weight on one leg, 
two or three small yellow stars orbiting around the wand tip and one near the shoulder, 
the platform is a small grassy rocky outcrop, 
rim light: warm star-gold #FFE9A8, signature accent color: bright #FFD93D star yellow with deep purple #5C3FB8 robe.

Reference: this exact character appears in the WhereHere "Tactile Adventure" mockup board — match that pose, hat shape, backpack color, and wand exactly.
```

### 4-4. 별찌 / Legendary
```
[STYLE ANCHOR ABOVE]

Character: "Byeolzzi" legendary form, mythic Constellation Sovereign of the night sky. 
Tall regal posture, glowing star-touched skin with faint silver constellation lines tracing across the cheeks and forehead, 
lavender-cream hair flowing as if floating in zero gravity, partially under a galactic crown — five tall points each containing a small floating star (yellow, white, blue, red, purple), 
oversized purple-blue eyes with literal tiny galaxies swirling inside the irises, 
wearing a long cosmic cape that shows shifting constellations and nebula clouds in deep purple, indigo, and teal, 
underneath a regal tunic of indigo with gold star-pattern embroidery, golden bracers, 
two yellow star wands held in each hand crossed at the front, both glowing brilliantly, 
three larger orbiting planets (one ringed like Saturn, one Earth-like, one moon) circling at waist height, 
majestic ascending pose with one foot slightly raised as if rising into the sky, 
serene knowing smile, eyes glowing softly, 
the platform has become a small floating cosmic island with a tiny galaxy spiraling beneath it, 
rim light: brilliant nebula teal #5EEAD4 mixed with star gold, signature accent color: cosmic #7C4DFF purple with brilliant #FFD93D star yellow accents, additional aura of orbiting star particles and faint constellation lines.
```

---

## 6. 일관성 체크리스트 (16장 다 만든 후)

생성 후 16장 펼쳐놓고 다음 5개를 비교 — 하나라도 어긋나면 그 장만 다시 생성:

- [ ] **머리:몸 비율** 모두 1:1.4 ~ 1:1.6 안에 들어가는가
- [ ] **눈 크기** 4 단계 다 비슷한가 (legendary 도 너무 작아지면 안 됨)
- [ ] **플랫폼 크기** 다 같은가 (legendary 만 살짝 더 정교한 정도)
- [ ] **배경 vignette** 4 단계 모두 동일한 navy gradient + star pixel
- [ ] **rim light 방향** 모두 좌측 상단에서 들어오는가

---

## 7. Supabase Storage 업로드 가이드

생성된 16장을 검수 → 정확한 경로로 업로드:

```
character-assets/
├── dodam/
│   ├── baby.png
│   ├── teen.png
│   ├── adult.png
│   └── legendary.png
├── narae/
│   ├── baby.png
│   ├── teen.png
│   ├── adult.png
│   └── legendary.png
├── haram/
│   ├── baby.png
│   ├── teen.png
│   ├── adult.png
│   └── legendary.png
└── byeolzzi/
    ├── baby.png
    ├── teen.png
    ├── adult.png
    └── legendary.png
```

업로드 후 따로 코드 수정 0 — `getCharacterImageUrl()` 가 이 경로 그대로 fetch 합니다 (`src/utils/characterAssets.ts:52`).

권장 spec:
- 1024×1024 PNG, 투명 배경 (vignette 까지 알파로) — 또는 navy 단색 배경 둘 다 가능
- 파일 크기 < 500KB (필요 시 squoosh.app 으로 압축)
- sRGB 컬러 공간

---

## 변경 이력

- v1 (2026-05-08): 첫 릴리스. 16종 프롬프트 + style anchor + 일관성 체크 + 업로드 경로.
