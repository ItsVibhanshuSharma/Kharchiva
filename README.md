# Kharchiva

India-first personal finance and expense tracking application.

> Record your money in seconds. Understand your money over time.

The four documents in `docs/` are the project source of truth. This repository is an npm-workspaces monorepo containing a React Native CLI mobile app and a NestJS modular-monolith server. The API and worker are separate entry points in the same server codebase.

## Repository

- `apps/mobile/`: React Native CLI application, organized by feature and infrastructure boundary. SQLite is the local operational database; sync behavior is intentionally not implemented yet.
- `apps/server/`: NestJS API, Mongoose infrastructure, P0 domain module boundaries, and BullMQ worker bootstrap.
- `docs/`: authoritative product, architecture, database, and API documents. Keep these source files unchanged unless updating the specifications is explicitly approved.
- `scripts/`: repository-level development and maintenance scripts.
- `tests/`: cross-application and contract test organization.

## Development Prerequisites

- Node.js 24.15.0 or newer and npm.
- Xcode and CocoaPods for iOS builds on macOS; Android Studio and an Android SDK for Android builds.
- A MongoDB instance and Redis for local server/worker execution. MongoDB Atlas may be used by configuring `MONGODB_URI`; no cloud provider is selected for application hosting.

Install workspace dependencies from the repository root with `npm install`.

## Environment

The server reads runtime configuration from `apps/server/.env`. The location is resolved from the server source tree, so the command can be launched from any workspace directory. Use `apps/server/.env.example` as the template. A root `.env` is not required and is not read by the server. Copy the server template to `apps/server/.env` for local use; keep real secrets untracked and never commit them.

The root `.env.example` contains the mobile app's public build-time configuration only. Set `MOBILE_API_BASE_URL` to the complete API URL, including `/api/v1`, in the environment used to start Metro and bundle the app. For example:

- Android emulator: `http://10.0.2.2:3000/api/v1`
- iOS simulator: `http://localhost:3000/api/v1`
- Physical device: `http://<development-machine-LAN-IP>:3000/api/v1`
- Staging/production: the corresponding HTTPS API URL

Set `MOBILE_API_BASE_URL` directly in the command environment or source the root `.env` file before starting Metro. This mobile setting is public and must never contain server credentials or secrets. Android emulator and device URLs must be reachable from that target device; `localhost` refers to the device itself.

Development, staging, and production must use separate service credentials and data stores. Hosting and CI/CD provider selection remain open.

## Dependency Audit Note

The scaffold's existing npm audit report included high-severity findings in the React Native/Metro dependency graph (20 reported when production dependencies were included; 48 across the full install). No automatic audit fix or React Native downgrade was applied. Review upstream/transitive remediation before release; do not use a forced downgrade without compatibility review.

## Applications

Start Metro with `MOBILE_API_BASE_URL` set in its environment, then use `npm run android --workspace @kharchiva/mobile` or `npm run ios --workspace @kharchiva/mobile` with the corresponding native toolchain available. Keep the URL consistent for the JS bundle build and target device.

Start the API with `npm run start:api`; `apps/server/src/main.ts` applies the `/api/v1` prefix. Start the worker separately with `npm run start:worker`; `apps/server/src/worker.ts` boots a Nest application context from the same module graph. Product endpoints, authentication, job processors, and financial business logic have not been implemented.

Run the server build with `npm run build:server`; run app tests with `npm run test:mobile` and `npm run test:server`.