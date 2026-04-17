
Redesign a React Native iOS app called "NutriCheck" — a personalized nutrition scanner — as a polished, native-feeling iOS 17+ app. Follow Apple Human Interface Guidelines strictly. Deliver a single iPhone 15 Pro frame.
Frame & canvas

Frame size: 393 × 852 pt (iPhone 15 Pro, 1x). Do not use pixel equivalents (1179×2556) — design at 1x and let Figma handle export density.
Safe areas: 59pt top inset (status bar + Dynamic Island region), 34pt bottom inset (home indicator).
Page background: #F2F2F7 (iOS systemGroupedBackground) — this is what makes white cards visually "lift."
Horizontal content margins: 16pt left and right. Cards span the full content width (361pt).
Baseline grid: 8pt spacing system. All vertical gaps, padding, and element heights must be multiples of 4, preferably 8.

Typography (SF Pro, with correct tracking)
Use SF Pro Display for ≥20pt, SF Pro Text for <20pt. Apply Apple's optical tracking — don't leave it at 0.
RoleSizeWeightTrackingLine heightLarge Title34ptBold+0.3741ptTitle 222ptBold+0.3528ptHeadline17ptSemibold-0.4322ptBody17ptRegular-0.4322ptSubheadline15ptRegular-0.2320ptFootnote13ptRegular-0.0818pt
Only ONE font family. Weight and size carry hierarchy, not color variety.
Color system

Brand green (actions only): #10B981 — primary buttons, active tab icon, accent dots, success states. Never as a full header banner.
Brand green tint (icon backgrounds): #ECFDF5
Label colors (iOS semantic): Primary #000000, Secondary #3C3C43 at 60% opacity, Tertiary at 30% opacity.
Card surface: #FFFFFF
Separator: #3C3C43 at 18% opacity, 0.5pt stroke.
Destructive/warning: #FF3B30 (systemRed) reserved for scan failure states.

Rule: color signals interactivity. If it's green, it's tappable. Nothing decorative is green.
Screen layout (top to bottom)
1. Status bar region — 59pt tall, transparent, native iOS icons (time, signal, battery in black).
2. Large Title header — 96pt tall section, white background.

"NutriCheck" in Large Title 34pt Bold, left-aligned at 16pt margin.
Small 32×32pt logo mark to the left of title, 8pt gap.
Subtitle "Your personalized nutrition guide" in Subheadline 15pt Regular, Secondary label color, directly below title with 2pt gap.
16pt bottom padding before first card.
No colored banner. The large title IS the header.

3. Scan Barcode card — primary action, 200pt tall.

White surface, 20pt corner radius with iOS corner smoothing (Figma: set smoothing to 60%/iOS — this creates the squircle, not a circular arc).
Shadow: 0 1 2 rgba(0,0,0,0.04) + 0 8 24 rgba(0,0,0,0.06) (two-layer, soft).
Internal padding: 24pt all sides.
72×72pt green gradient circle centered horizontally, 24pt from top. Gradient #10B981 → #059669 at 135°. Inside: SF Symbol barcode.viewfinder in white, 32pt, Semibold weight.
Title "Scan Barcode" in Title 2 22pt Bold, centered, 16pt below icon.
Caption "Tap to scan a product" in Subheadline 15pt Regular, Secondary color, centered, 4pt below title.
Entire card tappable; add subtle pressed state (scale 0.98, shadow reduces).

4. Profile card — 168pt tall, 12pt gap above.

Same white surface, 20pt radius, same shadow.
Internal padding: 20pt horizontal, 20pt vertical.
Header row: SF Symbol person.crop.circle 20pt in brand green, 8pt gap, "Your Profile" in Headline 17pt Semibold.
16pt gap, then iOS list-row pattern: label left in Body Secondary color, value right in Body Primary Semibold. Rows separated by 12pt (no divider line between them — use spacing).

Row 1: "Health Conditions" → "Diabetes, Celiac"
Row 2: "Fitness Goal" → "Weight Loss"


16pt gap, then "Edit Profile" button: full card-width, 50pt tall, 14pt corner radius (squircle), brand green fill, white "Edit Profile" in Headline 17pt Semibold centered. Minimum tap target satisfied (50 > 44pt).

5. Recent Scans card — 180pt tall, 12pt gap above.

Same card treatment.
Header row: SF Symbol clock.arrow.circlepath 20pt green, 8pt gap, "Recent Scans" in Headline 17pt Semibold. Trailing "See All" in Subheadline 15pt brand green, right-aligned.
Horizontal scroll row, 12pt gap. Each chip: 120×108pt, 12pt radius, #F9FAFB background. Contains 48×48pt product thumbnail top, product name in Footnote 13pt Semibold (1 line, truncate), small score badge bottom-right (20×20pt circle, color-coded: green ≥70, amber 40–69, red <40).
Scroll extends beyond right edge for affordance — last chip should be half-visible.

6. Tab bar — 83pt tall, pinned to bottom (49pt bar + 34pt home indicator inset).

Background: rgba(255,255,255,0.72) with backdrop blur 20px (iOS UltraThinMaterial equivalent).
Top hairline: 0.5pt, #3C3C43 at 18% opacity.
Two tabs, each 50% width, icons centered 8pt from top.
Icons: SF Symbols, 25pt, barcode.viewfinder and person. Active = brand green, inactive = #8E8E93 (systemGray).
Label below icon: 10pt Medium, 2pt gap. Same color as icon.
4pt home indicator bar centered at bottom.

iOS polish checklist (apply all)

Corner smoothing: every rounded rectangle uses iOS squircle (Figma: corner smoothing 60%). No plain circular-arc corners.
Tap targets: every interactive element ≥44×44pt.
Shadows: always two-layer (tight contact + diffuse ambient), never a single heavy shadow.
Icons: SF Symbols only. Weight matches surrounding text weight.
Hierarchy by weight, not size jumps: Semibold vs Regular does more work than 17pt vs 19pt.
No gratuitous green: brand color appears only on the scan icon, Edit button, active tab icon, and small accent marks.
Density: cards breathe — internal padding ≥16pt, card-to-card gap 12pt.
Dark mode variant: swap background to #000000, cards to #1C1C1E, primary label to white, secondary to #EBEBF5 at 60%. Same green.