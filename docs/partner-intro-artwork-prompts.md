# Partner intro cards — edit prompts

Three cards, each a finished 853 × 1844 image with its own headline, button, dots and "Skip" painted in.

## Use an edit model, not a fresh generation

Upload each **existing** card as the input image and ask for the change. If you regenerate from a text prompt, you get new people, a new layout and a new composition. You'd lose the approved artwork to change a T-shirt colour.

## Keep these in place, or taps will miss

The app lays invisible buttons over the painted ones, positioned by percentage of the card.

| Element | Must stay at |
|---|---|
| Card size | 853 × 1844 px (aspect 0.4626) |
| Main button | 6 % in from each side · bottom edge 6.5 % above the card bottom · 7.2 % tall |
| "Skip" | top-right corner, inside the top 7 % and the right 30 % |
| Dots | below the main button, as now |

If the button or Skip moves, a partner taps the painted button and nothing happens.

## The colours

| Use | Hex | Where it already appears |
|---|---|---|
| Royal amethyst (ground) | `#5B21A8` | splash, launch screen, header chip |
| Light amethyst (T-shirts) | `#8B5CF6` | growth card, review timer |
| Wordmark | `#FFFFFF` | — |

---

## Prompt — card 1 (Grow your event business)

> Edit this image. Keep every person, their face, pose and position exactly as they are. Keep all text, the headline, the service labels, the four icons, the purple "Join as a Partner" button, the three dots and the "Skip" in exactly the same place and size.
>
> Change only two things:
>
> 1. Every professional's top becomes a plain **light amethyst T-shirt (#8B5CF6)** with the word **SAMBRAMO** printed across the chest in **white, heavy, uppercase, wide sans-serif letters** (like Archivo Black). The chef keeps his white chef's hat. Their aprons can stay.
> 2. Shift the evening sky and background lighting from blue-navy dusk towards a **royal amethyst purple (#5B21A8)**, keeping the warm fairy lights and flowers.
>
> Do not add, remove or move anything else. Same framing, same crop, 853 × 1844.

## Prompt — card 2 (Every event needs experts like you)

> Edit this image. Keep the nine service tiles, every photo inside them, all text, the purple "See How It Works" button, the three dots and the "Skip" in exactly the same place and size.
>
> Change only two things:
>
> 1. In every tile, each professional's top becomes a plain **light amethyst T-shirt (#8B5CF6)** with **SAMBRAMO** across the chest in **white, heavy, uppercase, wide sans-serif letters**. The chef keeps his hat. The priest keeps his traditional white dhoti and red angavastram, which is attire and not a uniform.
> 2. Shift the sky behind the tiles from navy dusk towards **royal amethyst (#5B21A8)**.
>
> Do not add, remove or move anything else. 853 × 1844.

## Prompt — card 3 (More bookings. More earnings.)

> Edit this image. Keep the man, his face and pose, the phone showing the earnings screen, the "Payment Received" card, the Razorpay line, the four icons, the purple "Join as a Partner" button, the three dots and the "Skip" in exactly the same place and size.
>
> Change only two things:
>
> 1. His black chef's jacket becomes a **light amethyst T-shirt (#8B5CF6)** with **SAMBRAMO** across the chest in **white, heavy, uppercase, wide sans-serif letters**.
> 2. Shift the evening background from navy dusk towards **royal amethyst (#5B21A8)**, keeping the warm lights.
>
> Do not add, remove or move anything else. 853 × 1844.

---

## Check before sending them back

- **Spelling.** Image models often misspell text. Look closely at every shirt. "SAMBRAMO" comes out as "SAMBRMO" or "SANBRAMO" more often than you'd expect. If a shirt is wrong, it's quicker to fix in an editor than to regenerate.
- **The button hasn't moved.** Lay the new card over the old one. If the purple button or "Skip" has shifted, the taps will miss.
- **The priest.** A traditional ritual garment is not a uniform. If the model put him in a T-shirt, keep the original for that tile.
- **Size.** 853 × 1844 exactly.

Then send the three files and I'll render them as `card-1-grow`, `card-2-services` and `card-3-earnings` at 720 and 853 wide, which is what the app loads.
