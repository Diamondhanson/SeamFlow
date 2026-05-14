# SeamFlow

SeamFlow is a workflow platform for tailors and seamstresses — client management, body measurements, orders, fittings, designs, and payments. This repository is the SeamFlow monorepo, containing every app, package, and service that makes up the product.

## Repository layout

```
.
├── apps/
│   ├── seamflow-app/      # Expo / React Native tailor mobile app
│   ├── seamflow-client/   # Expo / React Native consumer mobile app (Phase 3)
│   ├── seamflow-web/      # Next.js client-facing web (magic-link order views, lookbook)
│   ├── seamflow-admin/    # Next.js internal admin dashboard
│   └── seamflow-api/      # NestJS backend API
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── schemas/          # Shared Zod validation schemas
│   ├── api-client/       # Typed API client SDK
│   ├── ui/               # Shared web UI components
│   ├── utils/            # Shared pure utilities
│   └── config/           # Shared eslint / prettier / tsconfig
├── services/
│   └── ai/               # Python (FastAPI) AI microservice — placeholder
├── infra/                # Infrastructure as code — placeholder
├── docs/                 # Architecture docs, API reference, runbooks
└── .github/workflows/    # CI / CD pipelines
```

## Tooling

- **Package manager:** [pnpm](https://pnpm.io) (workspaces)
- **Task runner:** [Turborepo](https://turbo.build/repo)
- **Language:** TypeScript across all Node-based apps and packages
- **Node version:** see `.nvmrc`

## Common commands

Run from the repo root:

```bash
pnpm install          # install all workspace dependencies
pnpm dev              # run dev servers across all apps
pnpm build            # build everything
pnpm lint             # lint everything
pnpm test             # run tests
```

To work in a single app:

```bash
pnpm --filter seamflow-app dev
pnpm --filter seamflow-api dev
```

## Status

This is the initial scaffold. Only `apps/seamflow-app` contains source code today; every other directory is an empty workspace placeholder pending implementation.

See [`docs/ROADMAP.md`](./docs/ROADMAP.md) for the phased plan of what gets built when.
