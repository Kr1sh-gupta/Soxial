# Image Generation for Social Media Posts

> **PURPOSE:** Generate scroll-stopping marketing graphics for X and Reddit posts. Uses Puter.js (no API key needed — user signs in with Puter.com on first use).

---

## API Key

No API key needed. Puter.js uses the User-Pays model — users authenticate with their Puter.com account and cover their own usage.

---

## Platform Image Specs

| Platform | Use Case | Aspect Ratio | Resolution | Notes |
|----------|----------|-------------|------------|-------|
| **X/Twitter** | In-stream image | 16:9 | 1200x675 | Preferred for link cards |
| **X/Twitter** | Square image | 1:1 | 1200x1200 | Good for quotes, infographics |
| **Reddit** | Post image | 16:9 or 1:1 | 1200x630+ | No strict requirement; wide works well |

---

## Prompt Engineering Rules

These rules are extracted from prompts that consistently produce professional marketing graphics. Follow them exactly.

### Rule 1: Lead with the shot type
Every prompt starts by declaring what kind of image it is. This anchors the entire generation.
- "Studio product photograph of..."
- "Premium studio product shot of..."
- "Minimalist flat vector illustration of..."
- "First-person perspective POV shot..."
- "Flat lay product shot of..."
- "Painterly anime illustration of..."
- "Product render of..."
- "Minimalist lifestyle photo of..."

### Rule 2: Describe materials and surfaces explicitly
The difference between generic and premium is material specificity. Always name:
- **Finish:** matte, glossy, polished, translucent, chrome, frosted, ribbed, textured
- **Material:** plastic, glass, metal, leather, knit, canvas
- **Color + finish together:** "matte black metallic", "translucent orange plastic", "glossy black", "matte cream-colored", "matte teal"

### Rule 3: Specify the background as a deliberate design choice
Backgrounds are not afterthoughts — they set the entire mood.
- **Solid color:** "solid matte black background", "solid bright blue sky", "seamless light grey studio background"
- **Gradient:** "gradient transitioning from dark navy blue to saturated orange"
- **Textured:** "deep forest green background with a subtle textured geometric chevron pattern"
- **Patterned:** "deep wine-red background patterned with a faint grid of abstract dark red letters"
- Always specify: grainy, smooth, clean, or textured

### Rule 4: Describe lighting like a photographer
Never say "good lighting." Be specific:
- "Soft studio lighting with delicate shadows"
- "Crisp studio lighting, sharp details"
- "Elegant, crisp white rim lighting defining the edges"
- "Direct natural sunlight"
- "Subtle red rim lighting"
- "Bright soft lighting"
- "Warm natural lighting"
- "Soft, hazy sky" (for outdoor)

### Rule 5: State the aesthetic in plain words at the end
Close every prompt with 2-4 style descriptors that name the visual world:
- "Minimalist commercial aesthetic, clean, modern design."
- "Professional tech advertising photography, cinematic lighting."
- "Clean, modern, minimalist wellness product aesthetic with soft studio lighting."
- "Sleek, professional SaaS aesthetic."
- "Cinematic travel photography, warm natural lighting."
- "High-end cosmetic branding, clean layout."
- "Minimalist high-contrast advertising style."

### Rule 6: Use text freely — GPT models handle it well
GPT image models (1, 1.5, 2) render readable text reliably. Include text in prompts for:
- **Quote cards, hook cards, promotional images** — bold headlines, short phrases
- **Product labels, packaging** — brand name, tagline
- **UI mockups, dashboards** — app copy, data labels, headings
- **Infographics, comparison shots** — short labels, callouts

When including text, specify:
- **Style:** "bold white sans-serif text", "elegant serif typography", "clean monospace code", "bold red vertical text"
- **Position:** "centered at the top", "written vertically on the bottle", "displayed on the screen"
- **Color:** "white text", "bright yellow lettering", "purple label"

Example: The wellness bottle prompt below uses text as a feature — it says "featuring bold red vertical text 'SOMPOWER'" — and the model renders it accurately.

### Rule 7: Use motion and dynamics when appropriate
Motion effects make images feel alive — use for energy, speed, or attention:
- "Dynamic horizontal motion blur and shutter drag effect as if shaking"
- "Dynamic motion blur streak on the upper right edge"
- "Floating at a slight angle"
- "Slightly tilted"
- "Hover in an exploded-view diagram style"

### Rule 8: Composition and camera angle matter
Specify where things are and how the camera sees them:
- "Close-up shot, angled diagonally"
- "Low angle shot looking up"
- "First-person perspective POV shot looking down"
- "Positioned in the bottom right corner"
- "Stands vertically on a smooth, slightly reflective black surface with a subtle mirror reflection"
- "Lying diagonally on a solid background"
- "Centered on a deep forest green background"

### Rule 9: Never use vague quality words
These words produce nothing: "beautiful", "professional", "high quality", "4K", "stunning", "amazing". Replace with concrete specs. "High-end" is acceptable ONLY when paired with specific details.

---

## Prompt Templates by Category

These are proven templates. Adapt them by swapping the product, colors, and details to match the user's brand and niche. Always call `read_profile` first for brand colors.

### Product Photography

**Clean Product on Solid Background:**
```
Studio product photograph of a [FINISH] [COLOR] [PRODUCT] with [SPECIFIC DETAILS like cap, label, texture]. [COMPOSITION — angle, position]. Set against a solid, [TEXTURE] [COLOR] background with [LIGHTING]. [AESTHETIC STYLE].
```

Example — Wellness bottle:
```
Product photograph of a minimal white wellness shot bottle with a white cap, featuring bold red vertical text "SOMPOWER". The bottle is captured with a dynamic horizontal motion blur and shutter drag effect as if shaking. It is set against a solid, grainy orange background with soft studio lighting and a subtle shadow underneath. Minimalist commercial aesthetic, clean, modern design.
```

Example — Chrome tool:
```
Studio product photography of a highly polished, shiny chrome adjustable spanner wrench. Close-up shot, angled diagonally on a clean, slightly textured off-white studio background. Sharp details, realistic metallic reflections, soft shadows, minimal high-end commercial style.
```

Example — Vacuum cleaner:
```
Studio product photograph of a classic grey and yellow upright cyclone vacuum cleaner, positioned in the bottom right corner of a solid matte black background. Crisp studio lighting, sharp details, minimalist high-contrast advertising style.
```

**Premium Dark Background Product:**
```
Premium studio product shot of a minimalist [FINISH] [COLOR] cylindrical [PRODUCT]. The [PRODUCT] stands vertically on a smooth, slightly reflective [COLOR] surface with a subtle mirror reflection. Set against a pure [COLOR] background with elegant, crisp white rim lighting defining the edges. [AESTHETIC].
```

Example — Cosmetic bottle:
```
Premium studio product shot of a minimalist matte black cylindrical cosmetic pump bottle. The bottle stands vertically on a smooth, slightly reflective black surface with a subtle mirror reflection. Set against a pure black background with elegant, crisp white rim lighting defining the edges.
```

**Floating Product:**
```
Studio product shot of [PRODUCT DESCRIPTION] in [FINISH] [COLOR]. The [PRODUCT] floats at a slight angle against a clean, soft gradient background of [COLOR]. [STYLE], soft studio lighting.
```

Example — Headphones:
```
Studio product shot of modern over-ear wireless headphones in matte teal. The headphones float at a slight angle against a clean, soft gradient background of pale blue-grey. Minimalist consumer tech design, soft studio lighting.
```

**Product with Motion/Energy:**
```
Product render of a [FINISH] [COLOR] [PRODUCT] [POSITION — floating, tilted, angled] with [DETAILS]. The [PRODUCT] has a dynamic [MOTION EFFECT — blur streak, shutter drag]. Set against a [TEXTURE — grainy, smooth] gradient background transitioning from [COLOR] to [COLOR]. Modern commercial aesthetic.
```

Example — Credit card:
```
Product render of a matte black metallic credit card floating diagonally with a silver microchip. The card has a dynamic motion blur streak on the upper right edge. Set against a high-contrast, heavily grainy gradient background transitioning from dark navy blue to saturated orange. Modern commercial aesthetic.
```

**Flat Lay:**
```
Flat lay product shot of a [PRODUCT]. The [PRODUCT] features [VISUAL DETAILS — colors, gradient, design]. Clean, minimalist [NICHE] design, lying diagonally on a solid, saturated [COLOR] background with soft, subtle studio lighting.
```

Example — Sunscreen:
```
Flat lay product shot of a modern sunscreen squeeze tube. The tube features a vibrant color gradient from sky blue at the top to bright yellow at the bottom. Clean, minimalist cosmetic design, lying diagonally on a solid, saturated yellow background with soft, subtle studio lighting.
```

**Multi-Product Composition:**
```
Studio product photography of [NICHE] packaging. A [PRODUCT 1 DESCRIPTION] stands next to a [PRODUCT 2 DESCRIPTION]. High-end [NICHE] branding, clean layout, soft studio lighting with delicate shadows, set against a seamless [COLOR] background.
```

Example — Skincare:
```
Studio product photography of minimalist skincare packaging. A white matte plastic squeeze tube stands next to a translucent red glass pump bottle with a black dispenser cap. High-end cosmetic branding, clean layout, soft studio lighting with delicate shadows, set against a seamless light grey background.
```

**Supplement/Candy Bottle:**
```
Studio photograph of a translucent [COLOR] plastic bottle filled with [CONTENTS], topped with a [CAP DESCRIPTION]. The bottle is [POSITION] and set against a solid, warm [COLOR] background. Clean, modern, minimalist [NICHE] product aesthetic with soft studio lighting.
```

Example — Gummy vitamins:
```
Studio photograph of a translucent orange plastic bottle filled with dark red gummy candies, topped with a ribbed white plastic cap. The bottle is slightly tilted and set against a solid, warm light-peach background. Clean, modern, minimalist wellness product aesthetic with soft studio lighting.
```

### Tech Advertising

**High-End Tech Product with Reflections:**
```
High-end commercial product shot of a [FINISH] [COLOR] [TECH PRODUCT] close-up, set against a [COLOR] studio background with subtle [COLOR] rim lighting. [REFLECTION/DETAIL — what's visible in reflective surfaces]. [ADDITIONAL ELEMENTS — exploded view, floating parts]. Professional tech advertising photography, cinematic lighting.
```

Example — Smart glasses:
```
High-end commercial product shot of a glossy black smart-glasses frame close-up, set against a deep red studio background with subtle red rim lighting. In the reflection of the large lens, two stylish men wearing glasses look down into the camera. From the top corner of the frame, camera lens glass elements and circular rings hover in an exploded-view diagram style. Professional tech advertising photography, cinematic lighting.
```

### Tech/SaaS UI Mockups

**Phone/Device in Hand:**
```
A hand holding a modern [DEVICE] centered on a [COLOR] background with a subtle [TEXTURE/PATTERN]. The [DEVICE] screen shows [UI DESCRIPTION]. Clean, minimalist tech brand layout.
```

Example:
```
A hand holding a modern smartphone centered on a deep forest green background with a subtle textured geometric chevron pattern. The phone screen shows a clean app interface with pastel blocks. Clean, minimalist tech brand layout.
```

**Dashboard/SaaS Cards:**
```
A [COLOR] background patterned with [SUBTLE PATTERN]. Floating modern [COLOR] UI dashboard cards display [DATA VISUALIZATION — charts, diagrams]. Sleek, professional SaaS aesthetic.
```

Example:
```
A deep wine-red background patterned with a faint grid of abstract dark red letters. Floating modern white UI dashboard cards display clean purple bar charts and data diagrams. Sleek, professional SaaS aesthetic.
```

**Developer Terminal/Code:**
```
Minimalist dark mode software terminal mockup. Rounded dark grey UI panels displaying clean monospace text, white commands, and colorful syntax-highlighted code. High contrast, clean developer interface layout.
```

**Abstract UI Cards:**
```
Minimalist flat vector illustration of [NUMBER] clean [COLOR] square cards on a solid [COLOR] background. The cards have rounded corners and contain [CONTENT — UI mockups, code lines, abstract blocks]. Clean graphic design, modern software tech aesthetic, high contrast.
```

Example:
```
Minimalist flat vector illustration of three clean white square cards on a solid dark charcoal gray background. The cards have rounded corners and contain simple abstract UI mockups: the first card has yellow lines, the second has a purple block, and the third shows clean simplified lines of code. Clean graphic design, modern software tech aesthetic, high contrast.
```

### Lifestyle / People

**Person in Studio Setting:**
```
Studio photograph of a [PERSON DESCRIPTION] sitting in a [FURNITURE]. They are wearing [OUTFIT DETAILS]. They are [ACTION/POSE]. [PROPS around them]. Seamless [COLOR] studio background, [LIGHTING], minimalist lifestyle aesthetic.
```

Example:
```
Studio photograph of a young man with a beard sitting in a modern tan leather office chair with a black metal frame. He is wearing a dark blue crewneck sweater, grey trousers, and clean white sneakers. He is looking up thoughtfully and pointing one finger upwards. A grey laptop, a stack of books, and a takeaway coffee cup sit on the floor next to his chair. Seamless light grey studio background, bright soft lighting, minimalist lifestyle aesthetic.
```

**Hands Holding Product (Lifestyle):**
```
Minimalist lifestyle photo of a hand holding a [FINISH] [COLOR] [PRODUCT] with [DETAILS]. [CAMERA ANGLE] against a [ENVIRONMENT — sky, wall, surface] in [LIGHTING]. Crisp, clean [SETTING] aesthetic.
```

Example:
```
Minimalist lifestyle photo of a hand holding a matte cream-colored reusable bottle with a matching cap. Low angle shot looking up against a clear, solid bright blue sky in direct natural sunlight. Crisp, clean outdoor aesthetic.
```

**POV / First-Person:**
```
First-person perspective POV shot looking down at [WHAT'S VISIBLE — legs, hands, feet]. The person is wearing [DETAILED CLOTHING/SHOES]. Below, [SCENIC ENVIRONMENT]. Cinematic travel photography, [LIGHTING].
```

Example:
```
First-person perspective POV shot looking down at a single leg dangling over a scenic valley. The person is wearing a brown and white retro sneaker, pale yellow socks, and a grey textured knit trouser cuff. Below, a majestic mountain valley is filled with blooming pink apricot blossom trees under a soft, hazy sky. Cinematic travel photography, warm natural lighting.
```

### Illustration / Artistic

**Painterly / Anime Landscape:**
```
Painterly anime illustration of a [SETTING]. [CHARACTERS with details] [ACTION] through [ENVIRONMENT with specific flora/fauna]. In the [LOCATION] stand [ARCHITECTURAL ELEMENTS]. [LANDSCAPE — mountains, sky, clouds]. [MOOD] atmosphere, [STYLE REFERENCE] aesthetic, [EFFECTS — sunbeams, overlays].
```

Example:
```
Painterly anime illustration of a retro-futuristic landscape. Two travelers with backpacks walk along a dirt path through vast, vibrant fields of red and blue wildflowers. In the valley stand large glass geodesic dome biospheres. Majestic blue mountains rise in the background under a deep blue sky with soft, wispy clouds. Dreamy atmosphere, Studio Ghibli aesthetic, soft sunbeams, subtle textured canvas overlay.
```

**Pixel Art:**
```
Minimalist 8-bit retro pixel-art sprite of a simple [COLOR] blocky [SUBJECT] with [FEATURES], clean pixel edges, solid flat colors, isolated on a white background.
```

Example:
```
Minimalist 8-bit retro pixel-art sprite of a simple orange blocky creature with two legs, clean pixel edges, solid flat colors, isolated on a white background.
```

---

## Brand Style Integration

Call `read_profile` before generating. Weave brand colors into the prompt naturally:

```
Colour palette: [BRAND_COLOR_1], [BRAND_COLOR_2], [BRAND_COLOR_3].
```

Then substitute brand colors into background, accents, rim lighting, or product colors in the templates above.

Style presets by niche:
- **Tech/SaaS/Dev:** dark backgrounds, rim lighting, high contrast, floating UI elements, code aesthetics
- **Lifestyle/Wellness:** warm tones, natural light, organic textures, matte finishes, soft shadows
- **Design/Luxury:** black backgrounds, chrome/glass materials, white rim lighting, mirror reflections
- **Gaming/Entertainment:** bold saturated colors, dynamic motion, high energy compositions
- **E-commerce/Consumer:** clean solid backgrounds, product floating or tilted, grainy textures, gradient backgrounds
- **Finance/Fintech:** dark gradients, metallic finishes, motion blur, high contrast

---

## Adapting Templates to Any Product

The templates above are modular. To adapt:

1. **Identify the closest template** — product shot, tech mockup, lifestyle, or illustration
2. **Swap the subject** — replace the product/person with what you need
3. **Match the background** to the brand's primary color or mood
4. **Keep the lighting description** — it's the hardest part to get right, reuse proven ones
5. **Keep the aesthetic closer** — the style descriptors at the end are what make it cohesive

Example adaptation — turning the headphones template into a speaker ad:
```
Original: "Studio product shot of modern over-ear wireless headphones in matte teal..."
Adapted: "Studio product shot of a modern cylindrical wireless speaker in matte coral. The speaker floats at a slight angle against a clean, soft gradient background of warm peach. Minimalist consumer tech design, soft studio lighting."
```

---

## Quality Check Checklist

After generating, verify:
1. **AI artifacts?** (extra fingers, floating objects, distorted faces) -> regenerate
2. **Material quality?** (does matte look matte? does chrome reflect?) -> add more material detail to prompt
3. **Background clean?** (no unwanted elements bleeding in?) -> simplify background description
4. **Brand consistent?** (matches colors and style?) -> adjust colors
5. **Platform suitable?** (right aspect ratio?) -> check specs table
6. **Scroll-stopping?** (would YOU stop scrolling?) -> add motion, contrast, or bolder color

---

## Workflow

1. **Finalize post text first** — never generate images before copy is done
2. **Call `read_profile`** — get brand colors, niche, style preset
3. **Pick the right template** from the categories above based on post type
4. **Adapt the template** — swap product, colors, details to match the post
5. **Call `generate_image`** with the adapted prompt and a descriptive filename
6. **Display the result** using `:::image-card`:

```
:::image-card
{"path":"/path/to/media/image.png","prompt":"Brief description of what was generated"}
:::
```

7. **Ask for approval** — show post text + image together

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Vague quality words ("beautiful, professional, 4K") | Use concrete material/lighting specs from templates |
| Keyword soup instead of narrative | Write full sentences describing the scene, follow template structure |
| No material/finish specified | Always state: matte, glossy, chrome, translucent, frosted, etc. |
| Generic "studio background" | Specify: solid color, gradient direction, texture, grain level |
| "Good lighting" | Name the lighting: "soft studio", "crisp white rim", "direct natural sunlight" |
| No aesthetic closer | End with 2-4 style words: "minimalist commercial aesthetic, clean, modern design" |
| NOT putting text when it helps | GPT models render text well — use bold headlines, labels, branding, quote cards |
| Text too vague | Specify style, color, size, position: "bold white sans-serif centered at the top" |
| Forgetting brand colors | Always call read_profile first and weave hex colors into prompt |
| Generating before post text is final | Always finalize text first, then generate supporting image |
| Wrong aspect ratio | Check Platform Image Specs table before generating |
| Flat, boring composition | Add motion blur, tilt, diagonal angle, floating, or POV perspective |
