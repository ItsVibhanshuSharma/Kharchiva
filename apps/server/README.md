# Server

NestJS modular monolith containing the REST API and a separately runnable BullMQ worker.

- `src/main.ts`: API process; applies the `/api/v1` prefix and global security/validation middleware.
- `src/worker.ts`: worker process; creates a Nest application context from the same codebase.
- `src/modules/`: P0 domain module boundaries. No product controllers, providers, or job processors are implemented yet.
- `src/common/`: configuration, Mongoose, queue, validation, storage, health, guard, error, and logging boundaries.

Copy `.env.example` to `.env` or provide environment variables to configure local MongoDB and Redis. The defaults target local services; no cloud host is selected.
