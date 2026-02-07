# ObjectStack Mobile

Enterprise low-code platform mobile runtime built with Expo, React Native, and TypeScript.

## Tech Stack

- **Framework:** Expo SDK 54 (Managed Workflow)
- **Navigation:** Expo Router (file-based routing)
- **Language:** TypeScript (strict mode)
- **Styling:** NativeWind v4 (Tailwind CSS for React Native)
- **UI Components:** shadcn/ui pattern (`components/ui/`)
- **Icons:** lucide-react-native
- **State Management:** Zustand
- **Data Fetching:** TanStack Query (React Query)

## Project Structure

```
├── app/                    # Expo Router pages
│   ├── _layout.tsx         # Root layout (providers)
│   └── (tabs)/             # Bottom tab navigation
│       ├── _layout.tsx     # Tab bar configuration
│       ├── index.tsx       # Home / Dashboard
│       ├── apps.tsx        # Apps listing
│       ├── notifications.tsx
│       └── profile.tsx
├── components/
│   └── ui/                 # Reusable UI components (shadcn pattern)
│       ├── Button.tsx
│       ├── Card.tsx
│       └── Input.tsx
├── lib/
│   └── utils.ts            # cn() utility (clsx + tailwind-merge)
├── global.css              # Tailwind base + CSS variables (light/dark)
├── tailwind.config.js      # Tailwind configuration
├── babel.config.js         # Babel + NativeWind preset
├── metro.config.js         # Metro + NativeWind integration
└── nativewind-env.d.ts     # NativeWind TypeScript types
```

## Getting Started

```bash
npm install
npx expo start
```

## Design System

The app uses a CSS-variable-based design token system with light and dark mode support. Color tokens are defined in `global.css` and consumed via Tailwind classes.
