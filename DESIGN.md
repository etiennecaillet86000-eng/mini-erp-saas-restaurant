# Design Brief — Mini-ERP Restaurant

**Tone & Purpose**: Professional utility for restaurant financial and operational management. Refined minimalism — no decoration, every visual element serves function. Information-dense, high-contrast, optimized for desk-based work.

**Color Palette**

| Semantic | Light | Dark |
|----------|-------|------|
| Background | `0.98 0.01 0` | `0.12 0.02 245` |
| Foreground | `0.2 0.03 245` | `0.93 0.02 245` |
| Primary (Action) | `0.52 0.14 198` (teal-blue) | `0.65 0.14 198` |
| Sidebar BG | `0.27 0.04 245` (slate) | `0.14 0.02 245` |
| Destructive | `0.6 0.19 32` (muted coral) | `0.65 0.18 30` |
| Border | `0.92 0.02 245` | `0.22 0.03 245` |

**Typography**

| Use | Font | Weight | Scale |
|-----|------|--------|-------|
| Display | General Sans | 600–700 | 24–32px |
| Body | Nunito | 400–600 | 14–16px |
| Mono | JetBrains Mono | 400 | 12–13px (financial data, code) |

**Elevation & Depth**: Cards raised via `border + shadow-sm` (subtle). Sidebar has distinct background color (`--sidebar` slate). Active nav link: `border-l-2` left border + `bg-sidebar-accent`. Header implies elevation via `border-b`.

**Structural Zones**: Sidebar (24% width, fixed, slate grey). Main content area (responsive grid, white/light background). Nav header (border-bottom separation). Card-based sections for financial data, menu simulator, staff scheduling.

**Spacing & Rhythm**: 4px base grid. Sidebar links: `py-2.5 px-4`. Cards: `p-6` internal, `gap-4` between sections. Breathing room between major sections via `mb-8`.

**Component Patterns**: Sidebar nav links use `.sidebar-link` (hover background, no rounded pills). Active state: `.nav-active` (left border accent, slight background). Buttons: primary teal via `--primary`, secondary via muted. Forms: inputs use `bg-input` with border, focus ring on `--ring` teal.

**Motion**: `transition-smooth` on interactive elements (0.3s cubic-bezier). Hover states on nav, cards, buttons. No entrance animations for Sprint 1.

**Constraints**: Light mode only (for now). No gradients (vs. chart colors use solid palette). Sidebar width fixed; content responsive. Focus on legibility over decoration.

**Signature Detail**: Active sidebar link uses left border accent (not floating pill or background-only highlight). Creates visual hierarchy while maintaining alignment with rest of layout.
