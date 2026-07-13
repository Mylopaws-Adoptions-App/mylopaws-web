---
name: mylopaws-ops-design
description: Design system and interaction patterns for the Mylopaws OPS/groomer dashboard (the /ops section, especially Dermacare). Derived from competitor benchmarking against Woofly's groomer app. Use this skill whenever building, restyling, or reviewing any screen under /ops — booking boards, job detail screens, payment collection, groomer workflows. This is DIFFERENT from the mylopaws-design skill (which covers the CUSTOMER-facing app) — for ops screens, this skill takes precedence on layout and information architecture, while mylopaws-design still governs brand colors and typography.
---

# Mylopaws Ops Dashboard — Design & Interaction System

Reference screens in `screens/` are from **Woofly**, a competitor's groomer-facing app. They are
a benchmark for *information architecture and workflow*, not for brand styling. We adopt their
patterns; we keep our own brand (plum `#6B1A47`, not their coral).

## The governing insight

A groomer using this app is **standing outside a customer's door, on a phone, possibly in the rain**.
They have exactly three questions:

1. **Where am I going?** → address + one-tap Navigate
2. **Who/what am I dealing with?** → client name, pet breed, age, and **how aggressive the pet is**
3. **How much do I collect, and have they already paid?** → payment badge + amount + Collect button

Every ops screen is judged against those three. Anything that doesn't serve them is clutter.
Our current ops board fails this test — it's an admin's six-column status board, not a groomer's
job card.

## 1. Information architecture

### Two tabs, not six status sections
`Upcoming` | `Past` — a segmented control at the top. That is the whole navigation.
- **Upcoming** = today and future jobs, grouped under a **"Today's Bookings"** heading first.
- **Past** = completed and cancelled, newest first.

Admins may still need status filtering, but the *default* view for everyone is Upcoming.
Do NOT make a groomer scroll past "unassigned" and "cancelled" sections to find today's work.
Ref: `01-upcoming-todays-bookings.jpeg`, `02-past-bookings.jpeg`.

### The job card (list view)
Each card shows, in this order:
- **Date + time** (top-left) and **amount** (top-right, bold)
- **Client name**
- **Full address** — wrapped, up to 3 lines, not truncated to one
- **A split action bar at the bottom of the card**: `📞 Call` | `▲ Navigate`
  — Call is a secondary/outline button, Navigate is the filled primary. Both are full-height,
  edge-to-edge halves of the card footer. Minimum 48px tall.

The action bar is the key pattern: **the two most common actions are available without opening
the booking at all.** Ref: `01-upcoming-todays-bookings.jpeg`.

### The job detail screen
Ordered top to bottom:
1. **Payment status badge** — pill, top-left, immediately below the header.
   `Paid` = green outline/green text. `Cash On Delivery` = amber outline/amber text.
   This is the first thing a groomer must see. Ref: `03-booking-detail-cod.jpeg` (amber),
   `04-booking-detail-paid.jpeg` (green).
2. **Date + time**, then **Client: {name}**, then the **full address**.
3. **Package Summary card** — see section 2.
4. **Payment Summary card** — see section 3.
5. **Action stack** — see section 4.
6. **Sticky bottom bar**: `Call Client` | `Navigate` (always visible, never scrolls away).

## 2. Package Summary card — this is where we differentiate

A bordered card containing:
- **Service name** (17/700) — e.g. "Full Service", "Minor Service", "Spa Bath"
- **One-line description** in muted text — what's physically done.
  Woofly writes: "Full body haircut, bath and blow dry" / "Hygiene haircut (face, sanitary area
  and underpaws), bath and blow dry". Ours must come from `services.description` in Supabase.
- **Price**, large (22/700)
- **"Included" list** — Woofly calls this "Free Services" and lists:
  *nail cutting, ear cleaning, mouth cleaning, paw butter application, combing and perfume.*
  This is a deliberate value-justification device. We must do the same, sourced from
  `services.includes[]` in our DB. Label it **"Included"** (not "Free Services" — we're not
  copying their copy).
- **Add-ons**, if any — listed with individual prices (Medicated Bath ₹300, Neem Therapy ₹400, etc.)
- **Pet context row**: `Breed: {breed}` | `Age: {age}` | **`Aggression: {0-3}`**
- **View Details** link

### The Aggression score — adopt this
Woofly surfaces a **numeric aggression rating (0–3)** on every job. This is a genuine safety
feature for a groomer walking into a stranger's home. We currently only have a boolean
`pets.aggressive`. Upgrade it to a 0–3 scale:
- `0` = calm
- `1` = nervous
- `2` = handle with care
- `3` = high risk — two-person job

Render it with color: 0 = muted, 1 = amber, 2 = orange, 3 = red + bold. A groomer must be able to
see a `3` from across the room.

Ref: `03-booking-detail-cod.jpeg` (Aggression: 3), `04-booking-detail-paid.jpeg` (Aggression: 0).

## 3. Payment Summary card

Bordered card with a small ₹ icon in the header. Contains:
- Itemised lines: service name → amount; each add-on → amount
- A hairline, then **Total Amount:** in bold
- Then the primary workflow button (see below)

Ref: `05-payment-summary-actions.jpeg`.

## 4. Action stack — the groomer's workflow

The status lifecycle for a Dermacare job, and the button that advances it:

| Current status | Button shown | Style |
|---|---|---|
| `assigned` | **Start Booking** (with a `»` chevron badge) | outline, plum |
| `in_progress` + unpaid | **Collect Payment** | **filled, plum, full width** |
| `in_progress` + paid | **Mark Completed** | filled, plum |
| any active | **Call Alternate Number** | outline |
| any active | **Cancel Booking** | text link, red, centered, no border |

Key points:
- **Start Booking** is a distinct action from being assigned the job. It means "I have arrived and
  begun work." It should set status → `in_progress`.
- **Collect Payment** must be a first-class, filled, full-width button whenever the booking is
  Cash-on-Delivery and not yet paid. This is how the groomer actually gets our money — do not
  bury it.
- **Cancel Booking** is deliberately the least prominent element on the screen — a red text link,
  not a button. It should require a reason (audit-logged), consistent with our existing pattern.

Ref: `05-payment-summary-actions.jpeg`.

## 5. Styling

Layout, hierarchy and interaction come from these Woofly screens. **Colors and type come from the
`mylopaws-design` skill** — use our plum `#6B1A47` wherever Woofly uses coral, our type scale,
our radii.

```
Card              white, radius 14px, 1px #E5E5E5 border, 16px padding
Segmented control full-width, 2 segments, radius 10px; active = plum fill / white text;
                  inactive = white / muted text
Card action bar   split 50/50 at the card's bottom edge, sharing the card's bottom radius.
                  Left = outline, right = filled plum. 48px min height.
Payment badge     pill, 1.5px border, transparent fill. Paid = green. COD = amber.
Sticky bottom bar full-width, 2 halves, sits above the safe area, always visible on detail screens
Aggression 3      red, bold — must be impossible to miss
```

**Mobile-first, non-negotiable.** Groomers work from phones. Design at 375px. Desktop is a
centered, widened version — never a different layout.

## 6. Reference screens

| File | Shows |
|---|---|
| `01-upcoming-todays-bookings.jpeg` | Upcoming tab, "Today's Bookings", job cards with Call/Navigate split action bar |
| `02-past-bookings.jpeg` | Past tab, completed jobs list |
| `03-booking-detail-cod.jpeg` | Detail screen, **Cash On Delivery** amber badge, package summary, Aggression: 3 |
| `04-booking-detail-paid.jpeg` | Detail screen, **Paid** green badge, Aggression: 0 |
| `05-payment-summary-actions.jpeg` | Payment summary, Start Booking, Collect Payment, Call Alternate, Cancel |

## 7. What NOT to copy

- Their coral/orange palette — we use plum.
- The phrase "Free Services" — we say "Included".
- Their overall visual polish is mediocre; we should be better. Take the *architecture*, not the
  aesthetics.
