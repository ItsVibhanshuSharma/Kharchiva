# Server

NestJS modular monolith containing the REST API and a separately runnable BullMQ worker.

- `src/main.ts`: API process; applies the `/api/v1` prefix and global security/validation middleware.
- `src/worker.ts`: worker process; creates a Nest application context from the same codebase.
- `src/modules/`: modular domain boundaries; the expenses module now exposes authenticated MongoDB CRUD.
- `src/common/`: configuration, Mongoose, queue, validation, storage, health, guard, error, and logging boundaries.

Copy `.env.example` to `.env` or provide environment variables. Set `MONGODB_URI` to the MongoDB Atlas URI (or a local MongoDB URI for development), `JWT_SECRET` to the secret used to sign HS256 access tokens, and `REDIS_URL` for the existing queue infrastructure. `.env` is ignored by Git; never commit credentials.

Phone OTP auth endpoints are `POST /api/v1/auth/phone/request-otp`, `POST /api/v1/auth/phone/verify-otp`, `POST /api/v1/auth/refresh`, and authenticated `POST /api/v1/auth/logout`. Configure random `JWT_SECRET` and `OTP_HASH_SECRET` values of at least 32 characters, plus the issuer and audience values shown in `.env.example`. In development, explicitly set `AUTH_DEV_OTP_ENABLED=true` to receive the random OTP in the response; it is disabled by default and configuration permits it only in `development` or `test`. OTPs expire after five minutes, have five verification attempts, and request limits apply per phone and IP. OTPs are stored as keyed HMAC hashes; refresh tokens are random high-entropy values stored only as SHA-256 hashes. Refresh rotates the stored hash.

There is no SMS provider adapter in this repository yet. OTP requests outside explicitly enabled development therefore return `503` safely; production SMS delivery requires integrating and configuring a vetted provider. Access tokens are short-lived HS256 JWTs. Expense endpoints use the authenticated subject for ownership, integer `amountPaise`, UTC `expenseDate`, idempotent `clientId`, and soft deletion. `/api/v1/health/ready` returns `503` until MongoDB is connected.
