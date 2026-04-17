Convert the NutriCheck iOS app to a dual-theme system supporting both Light and Dark modes. The app is currently fully implemented in Dark mode — use that as the reference, then derive Light mode from a shared token system. Every screen must be delivered in both modes side-by-side.
Deliverable structure
Create a Figma file with these pages:

Design Tokens — the semantic color/type/spacing system (single source of truth).
Components — Light — every reusable component (cards, buttons, chips, nav bar, tab bar, text field, checkbox, score badge) in light mode.
Components — Dark — same components, dark mode.
Screens — Light — Home, Scanner, Manage Health Profile, Scan Result.
Screens — Dark — same screens, dark mode.
Mode Comparison — every screen paired L/R with its dark counterpart for easy review.

Use Figma Variables with a single collection called theme and two modes: Light and Dark. Every color on every component references a variable, never a raw hex. Switching mode on a frame should flip the entire screen with no manual recoloring.
Logo handling
Two logo assets exist:

Logo / Light — the newer light-mode logo the user has on hand (use for light theme).
Logo / Dark — the current dark-mode logo (use for dark theme).

Create a single Logo component with a variant property theme = Light | Dark. Bind the variant to the theme variable so placing one Logo instance on any frame auto-swaps based on that frame's mode. Both logos render at 40×40pt in the header, with Galaxia BC wordmark beside them.
Semantic token system (name these, then assign per mode)
Surfaces — the containers, ordered by elevation:
TokenLightDarksurface/background#F2F2F7#000000surface/primary#FFFFFF#1C1C1Esurface/elevated#FFFFFF#2C2C2Esurface/tinted-success#ECFDF5rgba(16,185,129,0.15)surface/tinted-danger#FEF2F2rgba(255,69,58,0.15)surface/tinted-warning#FFFBEBrgba(255,159,10,0.15)
Labels — text colors:
TokenLightDarklabel/primary#000000#FFFFFFlabel/secondaryrgba(60,60,67,0.60)rgba(235,235,245,0.60)label/tertiaryrgba(60,60,67,0.30)rgba(235,235,245,0.30)label/on-accent#FFFFFF#FFFFFF
Accents — interactive and semantic colors. Dark variants shift slightly brighter/less saturated to avoid vibrating on black:
TokenLightDarkaccent/brand#10B981#34D399accent/brand-pressed#059669#10B981accent/danger#FF3B30#FF453Aaccent/warning#FF9500#FF9F0Aaccent/info#007AFF#0A84FF
Separators & borders:
TokenLightDarkseparator/opaquergba(60,60,67,0.18)rgba(84,84,88,0.65)separator/non-opaquergba(60,60,67,0.10)rgba(84,84,88,0.30)
Shadows — crucial difference between modes:

shadow/card Light: two-layer, 0 1 2 rgba(0,0,0,0.04) + 0 8 24 rgba(0,0,0,0.06).
shadow/card Dark: none (Figma: 0 opacity). Depth comes from surface/primary (#1C1C1E) sitting on surface/background (#000000).

Scan score colors (shared, don't theme these — they need to mean the same thing everywhere):

score/good ≥70: accent/brand
score/okay 40–69: accent/warning
score/bad <40: accent/danger

Typography tokens
Same in both modes. Galaxia BC only for the NutriCheck wordmark. SF Pro everywhere else.
TokenSizeWeightTrackingtype/large-title34Bold+0.37type/title-222Bold+0.35type/headline17Semibold-0.43type/body17Regular-0.43type/subheadline15Regular-0.23type/footnote13Regular-0.08
Spacing tokens (8pt grid)
spacing/xs 4, spacing/sm 8, spacing/md 12, spacing/lg 16, spacing/xl 20, spacing/2xl 24, spacing/3xl 32.
Radius tokens
radius/sm 8, radius/md 12, radius/lg 14 (buttons), radius/xl 20 (cards), radius/full 999. All with iOS corner smoothing set to 60%.
Components to build (each with both theme variants)

Card — surface/primary fill, radius/xl, shadow/card, spacing/xl internal padding.
Button / Primary — accent/brand fill, label/on-accent text, 52pt tall, radius/lg.
Button / Destructive-Text — no fill, accent/danger label, 44pt tap target.
Selectable Card — unselected = surface/primary; selected = surface/tinted-success + 1pt accent/brand border at 40% opacity + 24pt trailing checkmark circle.
Chip — unselected: surface/primary (light) / #2C2C2E (dark) fill, label/primary text. Selected: accent/brand fill, label/on-accent text. 36pt tall, radius/full, spacing/lg horizontal padding.
Nav Bar — 44pt + safe area, flush with surface/background, hairline separator/opaque appears only on scroll.
Tab Bar — surface/primary with 72% opacity + backdrop-blur-20 (both modes), top hairline separator/non-opaque.
Score Badge — 24pt circle, fill by score tier, white 12pt Bold number.
Text Field — surface/elevated fill, radius/md, 48pt tall, label/tertiary placeholder.
Section Footer — label/tertiary 13pt with optional inline SF Symbol, no container.

Screen-specific mode notes
All screens except Scanner: fully themed, swap cleanly via variable mode toggle.
Scanner screen: hardcode to dark in both modes. Cameras are dark. Override the theme for this one screen — use raw #000000 background, dimming overlay, corner-bracket reticle. Add a comment in Figma noting "This screen ignores the theme system by design, matching iOS Wallet/Camera conventions."
Status bar tint: set per screen.

Light mode screens: dark status bar content.
Dark mode screens: light status bar content.
Scanner: light status bar content regardless of mode.

Validation checklist (apply to every screen pair)
Before shipping a screen pair, verify:

 No raw hex values on any layer — everything references a variable.
 Logo instance, not a flat image, in the header.
 Shadows present in light, absent in dark.
 Brand green shifts from #10B981 to #34D399 between modes.
 Red/warning colors shift to their dark variants.
 Tinted backgrounds (success, danger, warning) shift from solid pastels to translucent color overlays.
 Text contrast ≥4.5:1 on body, ≥3:1 on large text, in both modes.
 Selected/pressed states remain visible in both modes (especially the green-on-green selected card).
 One visual treatment per concept — no duplicate selection indicators, no redundant info cards.

Deliver
For each of the four primary screens (Home, Manage Health Profile, Scan Result, Scanner), place the light and dark versions side-by-side on the Mode Comparison page. Label each pair. The screens should be visually identical in structure and layout — the only differences should be color values driven by the theme variable.