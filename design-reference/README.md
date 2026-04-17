# Design Reference

This folder contains the **original Figma → React (web) export** that was used as
the source-of-truth for the React Native UI in `frontend/`. **It is not bundled
into the Expo app and is not used at runtime.** Everything here has already been
ported over to React Native.

Keep it around for visual reference, comparing token values, or re-checking the
intended layouts.

## Contents

```
design-reference/
├── app/                                Web React mockup (react-router + <div>)
│   ├── App.tsx                         Phone-frame shell + theme toggle (web)
│   ├── routes.ts                       react-router routes
│   ├── ThemeContext.tsx                Web theme provider
│   ├── tokens.ts                       Design tokens
│   ├── useScreenTokens.ts              Token resolver hook
│   ├── components/                     Per-screen web React components
│   │   ├── Home.tsx
│   │   ├── Profile.tsx
│   │   ├── ScanProduct.tsx
│   │   ├── ProductResults.tsx
│   │   ├── Alternatives.tsx
│   │   ├── IngredientDetail.tsx
│   │   ├── DesignTokens.tsx
│   │   ├── Logo.tsx
│   │   ├── figma/                      Generic Figma helpers
│   │   └── ui/                         shadcn/ui primitives
│   └── services/api.ts                 Web API client
├── imports/                            Reference screenshots + spec markdown
│   ├── pasted_text/
│   │   ├── nutricheck-redesign.md      Original redesign brief
│   │   └── nutricheck-ios-dual-theme.md Dual-theme spec
│   ├── Screenshot_*.png                Figma screenshots
│   └── image-removebg-preview*.png     Logo extractions
├── styles/                             Web CSS (Tailwind/globals)
└── image-removebg-preview*.png         Originals (also copied into frontend/assets/logo)
```

## Mapping to the React Native port

| Web reference (this folder)         | RN implementation (`frontend/`)              |
|-------------------------------------|----------------------------------------------|
| `app/App.tsx`, `app/routes.ts`      | `app/_layout.tsx` + Expo Router file routes  |
| `app/ThemeContext.tsx`              | `context/ThemeContext.tsx`                   |
| `app/tokens.ts`                     | `theme.ts`                                   |
| `app/useScreenTokens.ts`            | `hooks/useScreenTokens.ts`                   |
| `app/components/Home.tsx`           | `app/(tabs)/index.tsx`                       |
| `app/components/Profile.tsx`        | `app/(tabs)/profile.tsx`                     |
| `app/components/ScanProduct.tsx`    | `app/scan.tsx`                               |
| `app/components/ProductResults.tsx` | `app/product/[barcode].tsx`                  |
| `app/components/Logo.tsx`           | `components/Logo.tsx`                        |
| `app/services/api.ts`               | `services/*.ts`                              |
| `image-removebg-preview*.png`       | `assets/logo/nutricheck-{light,dark}.png`    |

## Why it's outside `frontend/`

The web mockup uses `react-router`, `<div>`, `lucide-react` (web), and CSS imports
which Metro cannot bundle for React Native. Living outside `frontend/` keeps it
invisible to the Expo bundler and TypeScript project.
