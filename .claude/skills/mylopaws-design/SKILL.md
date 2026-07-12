---
name: mylopaws-design
description: The Mylopaws design system, extracted from the professional UI designs in screens/. Use this skill whenever building, restyling, or reviewing ANY user-facing screen in the Mylopaws web app — pages, components, forms, buttons, cards, layouts. Covers colors, typography, spacing, the mint-header/white-sheet pattern, component anatomy, and the mobile-first booking flow. Always consult the reference screenshots in screens/ before writing UI code.
---

# Mylopaws Design System

This is the source of truth for all Mylopaws UI. It was extracted from professional designs
(`screens/*.jpg`) commissioned for the product. **Mobile-first is non-negotiable** — the majority
of customers book on phones. Design for a 375px viewport, then scale up.

## Before you write any UI code

1. **Look at the relevant screenshot(s) in `screens/`.** They are the ground truth. When this
   document and a screenshot disagree, the screenshot wins.
2. Match the component anatomy exactly — radii, weights, spacing, states.
3. Build mobile-first. Desktop is a widened version of the mobile layout, never a different design.

---

## 1. Color tokens

```
Primary (plum)        #6B1A47   buttons, active states, headings-on-color, links
Primary dark          #4E1335   pressed states
Primary tint          #E7D3DF   selected chips/cards, date-pill fill
Primary tint soft     #F5E9F0   subtle selected row backgrounds

Travel accent (mint)  #A5EBE3   ALL Travel-flow screen headers
Highlight (butter)    #F8DE64   callout banners, booking-amount card, assistant prompts
Success (green)       #1F9D55   paid amounts, success checkmark, "Pay ₹500" price
Danger                #E5484D   logout, destructive, errors

Ink (near-black)      #111111   page titles (h1)
Body                  #333333   body copy
Muted                 #7A7A7A   labels, placeholders, secondary text
Line                  #E5E5E5   borders, dividers, unselected chip outline
Surface               #FFFFFF   cards, sheets, page background
Surface alt           #F7F7F7   input fills, subtle sections
Chip active (dark)    #111111   selected behavioural/filter chips (black fill, white text)
```

**Background is WHITE**, not cream. Cards sit on white with a soft shadow, or on `#F7F7F7`.

## 2. Typography

Geometric sans throughout — Poppins (or Montserrat as fallback). No serifs anywhere.

```
Page title (h1)     32px / 800 / -0.5px tracking / #111    "Sign In", "Travel", "Welcome!"
Section heading     20px / 700 / #111                      "Select Date", "Choose a ride"
Card title          16-17px / 700 / #111
Body                14-15px / 400 / #333 / 1.55 line-height
Label / caption     12-13px / 400 / #7A7A7A
Button label        15-16px / 700
Price (large)       34px / 800 / #1F9D55                   the ₹105 in the booking card
Price (inline)      15px / 700                             green when payable, strikethrough #7A7A7A when original
```

## 3. Spacing & shape

```
Screen padding      20px horizontal (mobile), max-width 480px centered on desktop
Section gap         28-32px between major sections
Element gap         12-16px within a section
Card padding        16px

Radius — button     28px (fully rounded pill; height 52-56px)
Radius — card       14-16px
Radius — input      12px (height 52px)
Radius — chip       999px (pill)
Radius — sheet      24px top-left + top-right only
Radius — date tile  12px

Shadow — card       0 2px 12px rgba(17,17,17,0.06)
Shadow — floating   0 4px 20px rgba(17,17,17,0.10)
```

## 4. THE signature pattern: colored header + white sheet

This is the most recognizable Mylopaws layout. See `screens/10-travel-guidelines.jpg`,
`11-travel-datetime.jpg`, `20-sheet-pattern-form.jpg`.

- A **full-bleed colored header** — mint `#A5EBE3` for Travel, plum `#6B1A47` for pet/profile flows.
- Header contains: back chevron (top-left), page title (32/800), a one-line subtitle, and
  (in Travel) a row of mode pills.
- Beneath it, a **white sheet** slides up and overlaps the header, with **24px radius on the top
  two corners only**. All content lives in the sheet.
- On plum headers, title text is white. On mint headers, title text is `#111`.

```jsx
<div className="min-h-screen bg-mint">
  <header className="px-5 pt-6 pb-8">
    <button className="mb-5"><ChevronLeft /></button>
    <h1 className="text-[32px] font-extrabold tracking-tight">Travel</h1>
    <p className="mt-1 text-[15px] text-body">Plan your trip</p>
    <div className="mt-5 flex gap-2 overflow-x-auto">{/* mode pills */}</div>
  </header>
  <main className="-mt-4 rounded-t-[24px] bg-white px-5 pt-7 pb-28 min-h-[70vh]">
    {/* everything else */}
  </main>
</div>
```

## 5. Components

### Primary button
Full-width, 52-56px tall, radius 28px, plum fill, white 700 label.
Disabled = `#DEDEDE` fill with `#9A9A9A` label (see `02-signin.jpg` — "Get OTP" disabled).
Secondary = white fill, 1.5px plum border, plum label (see "Back" and "Home" buttons).
Bottom-anchored CTAs sit in a fixed bar with white bg and 20px padding.

A CTA can carry a trailing value + chevron on the right — see `15-travel-fare-breakdown.jpg`:
`[ Pay Booking Amount            ₹105  › ]`

### Mode pills (Travel)
Horizontally scrollable row. Selected = **black fill, white text**. Unselected = white fill,
1.5px `#111` border, `#111` text. Radius 999px, ~40px tall, 16px horizontal padding.
Ref: `11-travel-datetime.jpg`, `14-travel-choose-ride.jpg`.

### Selectable chips (behavioural tags, filters)
Selected = black fill / white text. Unselected = white fill / `#E5E5E5` border / `#333` text.
Ref: `21-long-form.jpg`.

### Date tile
72px wide, radius 12px. Unselected: white, `#E5E5E5` border, day-abbrev 12px muted above a
20px/700 date. Selected: `#E7D3DF` fill, plum border, plum text.
Ref: `11-travel-datetime.jpg`.

### Time slot
Pill-ish rounded rect in a 3-column grid, 14px label. Unselected white/bordered, muted text.
Selected: `#E7D3DF` fill, plum border, plum 700 text.
Ref: `11-travel-datetime.jpg`.

### Pickup → Drop input group
ONE bordered card (radius 12px) containing two stacked rows separated by a hairline. A small
circle icon (pickup) and pin icon (drop) sit on the left, connected by a **vertical connector
line**. When filled, the whole card gets a plum border and icons turn plum. A circular `+`
button sits outside to the right for adding a stop.
Ref: `12-travel-location-empty.jpg`, `13-travel-location-filled.jpg`.

### Date/time recap pill
After date+time are chosen, they collapse into a small pill at the top of the next screen:
`#F5E9F0` fill, plum text, clock icon, chevron to re-edit. `🕐 Sat, 7th Jul | 5:00 PM ⌄`
Ref: `13-travel-location-filled.jpg`.

### Ride option row
Vehicle illustration left (~72px), name (16/700) + "15 mins away" (13/muted) center, price right.
Price shows green `Pay ₹500` with the original `₹700` struck through beneath in muted.
Selected row = `#F5E9F0` fill. A butter `#F8DE64`-tinted note bar sits above the list:
"Pay booking fees and the remaining payment after drop."
Ref: `14-travel-choose-ride.jpg`.

### Fare breakdown
Big butter `#F8DE64` card at top: "Booking Amount" label (14/700 centered) above a 34px/800
green amount. Below, plain label/value rows, a hairline, then a bold plum Total row.
Ref: `15-travel-fare-breakdown.jpg`.

### Success screen
Centered green circle with white check, surrounded by scattered decorative dots/plus marks.
Headline 20/700 centered. Then meta lines, then an uppercase label/value summary block
(TOTAL AMOUNT / AMOUNT PAID / AMOUNT TO BE PAID — the last in green). Secondary "Home" button pinned bottom.
Ref: `16-travel-success.jpg`.

### List card (Mart-style)
Horizontal card: circular illustration left, title (18/700) + one-line subtitle right.
White, radius 16px, soft shadow, ~12px gap between cards.
Ref: `24-list-cards.jpg`.

### Detail-view stat chips
Small rounded rects in a 4-across row: muted label above a bold value.
`Age / 2 weeks`, `Colour / Brown`. Mint-tinted background.
Below them, pill "attribute tags" with icons on a `#F5E9F0` fill with plum text.
Ref: `22-detail-view.jpg`.

### Grouped settings/attribute rows
A single white card containing rows separated by hairlines. Left: muted label. Right: plum
700 value + chevron. Tapping opens a picker.
Ref: `21-long-form.jpg`, `23-profile.jpg`.

### Bottom tab bar
5 tabs, white bg, hairline top border, ~64px tall. Icon above 11px label. Active = plum, inactive = `#7A7A7A`.
Ref: `23-profile.jpg`, `24-list-cards.jpg`.

### Callout banner
Butter `#F8DE64` rounded card (radius 16px) with body copy and, optionally, a white full-width
pill button inside it with plum 700 label.
Ref: `25-chat.jpg`.

## 6. Flow architecture — Travel booking

The designer's flow, which our booking screens should follow:

1. **Guidelines** (mint header + sheet of rules) → mode pills at top
2. **Date & time** — date tiles row, then time-slot grid, `Next` CTA
3. **Pickup / drop** — recap pill at top, connected input group, suggestions below
4. **Choose a ride** — map at top, ride options, `Select` CTA
5. **Fare breakdown** — butter amount card, line items, `Pay Booking Amount ₹105 ›`
6. **Success** — green check, amounts summary, `Home`

Each step is its own screen with one clear CTA. Do not merge steps into a single long form.

## 7. Rules

- **Mobile-first always.** 375px is the design target. Use `max-w-[480px] mx-auto` so it stays
  phone-shaped and centered on desktop rather than stretching.
- Every screen gets exactly **one primary CTA**, usually bottom-anchored.
- Touch targets ≥ 48px.
- Use the mint header for **all Travel screens**. Use plum headers for pet/profile flows.
- Never introduce a color outside the token list.
- Never use a serif font.
- Illustrations/photos are always in rounded containers (radius 14-16px).
- Empty, loading, and error states are required for every data-driven screen.

## 8. Tailwind config

```js
colors: {
  plum:    { DEFAULT: '#6B1A47', dark: '#4E1335', tint: '#E7D3DF', soft: '#F5E9F0' },
  mint:    '#A5EBE3',
  butter:  '#F8DE64',
  success: '#1F9D55',
  danger:  '#E5484D',
  ink:     '#111111',
  body:    '#333333',
  muted:   '#7A7A7A',
  line:    '#E5E5E5',
  surface: { DEFAULT: '#FFFFFF', alt: '#F7F7F7' },
},
fontFamily: { sans: ['Poppins', 'Montserrat', 'system-ui', 'sans-serif'] },
borderRadius: { btn: '28px', card: '16px', input: '12px', sheet: '24px' },
```

## 9. Reference screens

| File | Shows |
|---|---|
| `01-welcome.jpg` | Welcome — illustration, headline, primary CTA, text link |
| `02-signin.jpg` | Sign in — disabled CTA state, bottom illustration |
| `03-signin-otp.jpg` | OTP — 6 boxed digits, active CTA, countdown |
| `04-signup-preference.jpg` | 3-card selector, unselected |
| `05-signup-selected.jpg` | Same, selected state + feature list reveal |
| `10-travel-guidelines.jpg` | **Mint header + white sheet pattern**, mode pills |
| `11-travel-datetime.jpg` | Date tiles + time-slot grid, selected states |
| `12-travel-location-empty.jpg` | Pickup/drop connected input, empty |
| `13-travel-location-filled.jpg` | Same, filled + date/time recap pill |
| `14-travel-choose-ride.jpg` | Map + ride options + pricing + butter note bar |
| `15-travel-fare-breakdown.jpg` | Butter amount card, line items, CTA with value |
| `16-travel-success.jpg` | Success check, amount summary |
| `20-sheet-pattern-form.jpg` | **Plum header + sheet**, radio group, Back/Done pair |
| `21-long-form.jpg` | Long form: image grid, selectors, grouped rows, chips |
| `22-detail-view.jpg` | Detail page: gallery, stat chips, attribute pills |
| `23-profile.jpg` | Profile, grouped settings card, bottom tab bar |
| `24-list-cards.jpg` | Horizontal list cards with circular illustrations |
| `25-chat.jpg` | Chat bubbles, butter callout with inner CTA |
