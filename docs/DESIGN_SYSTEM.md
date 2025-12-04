# ChurchCoin Design System

## Clean Ledger / Swiss-Minimalist Aesthetic

A professional, accounting-inspired design system built for UK church financial management. The design emphasizes clarity, precision, and trust through monospace typography, hard shadows, and a restrained color palette.

---

## Design Philosophy

1. **Hard Shadows** - Pixel-perfect 2-4px shadows instead of soft blurs create mechanical precision
2. **Monospace Consistency** - JetBrains Mono throughout for ledger authenticity
3. **High Contrast** - Black on white/paper backgrounds for maximum readability
4. **Minimal Color** - Three semantic colors: Sage (growth), Amber (warmth), Error (danger)
5. **Clean Lines** - Sharp 1px borders, minimal rounded corners
6. **Interactive Lift** - Hover transforms with shadow escalation
7. **Accessibility** - Respects `prefers-reduced-motion`

---

## Color Palette

### Core Colors

| Name | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| **Ink** | `#000000` | `--color-ink` | Primary text, borders, buttons |
| **Paper** | `#fafaf9` | `--color-paper` | Main background |
| **White** | `#ffffff` | `--color-white` | Card backgrounds, elevation |
| **Charcoal** | `#1a1a1a` | `--color-charcoal` | Dark sections, footer |
| **Ledger** | `#e5e5e5` | `--color-ledger` | Borders, dividers, table lines |

### Grey Scale

| Name | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| **Grey Dark** | `#44403c` | `--color-grey-dark` | Secondary text |
| **Grey Mid** | `#666666` | `--color-grey-mid` | Muted text, labels |
| **Grey Light** | `#f5f5f5` | `--color-grey-light` | Hover backgrounds |

### Semantic Colors

| Name | Base | Light | Dark | Usage |
|------|------|-------|------|-------|
| **Sage** | `#6b8e6b` | `#e8f0e8` | `#557555` | Success, positive amounts, growth |
| **Amber** | `#d4a574` | `#faefe6` | `#b5895b` | CTAs, highlights, warmth |
| **Error** | `#c64545` | `#fce8e8` | - | Errors, negative amounts |

### Dark Mode

| Name | Light Mode | Dark Mode |
|------|------------|-----------|
| Ink | `#000000` | `#fafaf9` |
| Paper | `#fafaf9` | `#0c0a09` |
| Ledger | `#e5e5e5` | `#292524` |
| Success | `#6b8e6b` | `#4ade80` |
| Error | `#c64545` | `#f87171` |

---

## Typography

### Font Families

| Font | Variable | Usage |
|------|----------|-------|
| **JetBrains Mono** | `--font-mono`, `--font-primary` | All text, numbers, data |
| **DM Sans** | `--font-sans` | Headlines (optional) |

### Font Weights

- `400` - Regular body text
- `500` - Medium emphasis
- `600` - Semi-bold headings
- `700` - Bold headings, amounts

### Base Styles

```css
body {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
  font-weight: 400;
  -webkit-font-smoothing: antialiased;
}
```

### Text Classes

```css
.text-ink        /* Primary black */
.text-grey-dark  /* Secondary text */
.text-grey-mid   /* Muted/helper text */
.text-sage       /* Positive/success */
.text-amber      /* Accent/highlight */
.text-error      /* Negative/error */
```

---

## Spacing

### Standard Scale (Tailwind)

| Class | Value | Usage |
|-------|-------|-------|
| `gap-1` | 4px | Tight spacing |
| `gap-2` | 8px | Minimal spacing |
| `gap-3` | 12px | Standard (default) |
| `gap-4` | 16px | Medium spacing |
| `gap-6` | 24px | Large spacing |
| `gap-8` | 32px | Section spacing |

### Common Patterns

```css
/* Input fields */
px-3 py-2  /* 12px horizontal, 8px vertical */

/* Table cells */
px-4 py-3  /* 16px horizontal, 12px vertical */

/* Card headers */
px-6 py-3  /* 24px horizontal, 12px vertical */

/* Card content */
p-4 or p-6  /* 16px or 24px all sides */
```

---

## Shadows

### Hard Shadow System

The signature Swiss Ledger look uses pixel-perfect hard shadows:

```css
--shadow-hard-sm: 2px 2px 0px 0px rgba(0, 0, 0, 1);
--shadow-hard-md: 4px 4px 0px 0px rgba(0, 0, 0, 1);
--shadow-hard-lg: 8px 8px 0px 0px rgba(0, 0, 0, 1);
--shadow-hard-amber: 4px 4px 0px 0px #d4a574;
```

### Interactive Shadow Pattern

```css
/* Default state */
box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.1);

/* Hover state */
transform: translate(-2px, -2px);
box-shadow: 4px 4px 0px #d4a574;

/* Active/pressed state */
transform: translate(0, 0);
box-shadow: none;
```

---

## Border Radius

| Variable | Value | Usage |
|----------|-------|-------|
| `--radius` | 8px | Base radius |
| `--radius-sm` | 4px | Small elements |
| `--radius-md` | 6px | Inputs, badges |
| `--radius-lg` | 8px | Cards |
| `--radius-xl` | 12px | Large cards |

---

## Components

### Buttons

#### Primary Button (Default)
```css
background: var(--ink);        /* #000000 */
color: white;
border: none;
shadow: 2px 2px 0px rgba(0,0,0,0.1);

/* Hover */
transform: translate(-0.5px, -0.5px);
shadow: 4px 4px 0px #d4a574;
```

#### Secondary Button
```css
background: var(--sage-light);  /* #e8f0e8 */
color: var(--sage-dark);        /* #557555 */
border: 1px solid var(--sage);
```

#### Outline Button
```css
background: white;
color: var(--ink);
border: 1px solid rgba(0,0,0,0.2);

/* Hover */
border-color: var(--ink);
```

### Cards

#### Swiss Card (Interactive)
```css
.swiss-card {
  background: white;
  border: 1px solid var(--ink);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.swiss-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 4px 4px 0px rgba(0,0,0,1);
}
```

### Inputs

```css
.swiss-input {
  height: 48px;
  font-size: 16px;
  background: white;
  border: 1px solid #a3a3a3;
  border-radius: 4px;
  padding: 0 16px;
}

.swiss-input:focus {
  border-color: var(--ink);
  outline: none;
  ring: 3px var(--ink) / 10%;
}
```

### Tables

```css
.swiss-table {
  border: 2px solid var(--ink);
  border-radius: 4px;
  background: white;
}

.swiss-table-header {
  background: var(--paper);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 2px solid var(--ink);
  padding: 16px;
}

.swiss-table-row {
  border-bottom: 1px solid var(--ledger);
  min-height: 56px;
}

.swiss-table-row:hover {
  background: var(--amber-light);
}

.swiss-table-row:nth-child(even) {
  background: var(--paper);
}
```

### Badges

| Type | Background | Text | Border |
|------|------------|------|--------|
| **Success** | `#e8f0e8` | `#557555` | `#6b8e6b` |
| **Warning** | `#faefe6` | `#b5895b` | `#d4a574` |
| **Error** | `#fce8e8` | `#c64545` | `#c64545` |
| **Neutral** | `#f5f5f5` | `#666666` | `#d4d4d4` |

### Fund Type Badges

| Type | Style |
|------|-------|
| **General** | `bg-ink text-white` |
| **Restricted** | `bg-sage-light text-sage-dark border-sage` |
| **Designated** | `bg-amber-light text-amber-dark border-amber` |

---

## Animation

### Timing

| Duration | Usage |
|----------|-------|
| `150ms` | Fast hover states |
| `200ms` | Standard transitions |
| `300ms` | Collapsible sections |
| `500ms` | Modals, sheets |

### Easing

- `ease` - Standard
- `ease-out` - Exit animations
- `ease-in-out` - Motion animations
- `[0.16, 1, 0.3, 1]` - Swiss smooth (Framer Motion)

### Motion Patterns

```css
/* Fade in up */
initial: { opacity: 0, y: 20 }
animate: { opacity: 1, y: 0 }

/* Interactive lift */
whileHover: { x: -2, y: -2, boxShadow: "4px 4px 0px #d4a574" }

/* Spring physics */
transition: { type: "spring", stiffness: 400, damping: 25 }
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .swiss-card-interactive,
  .swiss-button,
  .hover-lift {
    transition: none;
    animation: none;
  }
}
```

---

## Amount Display

```css
/* Positive amounts */
.amount-positive {
  color: var(--sage);  /* #6b8e6b */
}

/* Negative amounts */
.amount-negative {
  color: var(--error);  /* #c64545 */
}

/* Zero amounts */
.amount-zero {
  color: var(--grey-mid);  /* #666666 */
}
```

### Currency Formatting

- Always show 2 decimal places: `£1,234.56`
- Use `tabular-nums` for aligned columns
- Prefix with `+` for income, `-` for expenses

---

## Utility Classes

### Text Colors
```css
.text-ink, .text-grey-dark, .text-grey-mid
.text-sage, .text-amber, .text-error
```

### Backgrounds
```css
.bg-paper, .bg-ledger, .bg-highlight
.bg-sage-light, .bg-amber-light, .bg-error-light
```

### Borders
```css
.border-ledger, .border-ink
.border-sage, .border-amber
```

### Ledger Helpers
```css
.ledger-row     /* border-bottom: 1px solid var(--ledger) */
.ledger-header  /* border-bottom: 2px solid var(--ink); font-weight: 700 */
```

---

## File References

| Category | File |
|----------|------|
| CSS Variables | `src/app/globals.css` |
| Font Setup | `src/app/layout.tsx` |
| Button Component | `src/components/ui/button.tsx` |
| Card Component | `src/components/ui/card.tsx` |
| Input Component | `src/components/ui/input.tsx` |
| Table Component | `src/components/ui/table.tsx` |
| Badge Component | `src/components/ui/badge.tsx` |
| KPI Cards | `src/components/dashboard/kpi-card.tsx` |
| Fund Cards | `src/components/funds/fund-card.tsx` |

---

## Quick Reference

### Primary CTA
```jsx
<button className="bg-ink text-white px-8 py-4 font-medium hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#d4a574] transition-all">
  Get Started
</button>
```

### Card with Hard Shadow
```jsx
<div className="bg-white border-2 border-ink p-6 hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[8px_8px_0px_rgba(0,0,0,0.1)] transition-all">
  Content
</div>
```

### Status Badge
```jsx
<span className="bg-sage-light text-sage-dark border border-sage px-2 py-0.5 text-xs rounded-md">
  Healthy
</span>
```

### Amount Display
```jsx
<span className="font-mono tabular-nums text-sage">+£1,234.56</span>
<span className="font-mono tabular-nums text-error">-£567.89</span>
```
