# PrepX application

This directory contains the Next.js application for PrepX, an O/L examination results portal currently in development.

See the [main project README](../README.md) for feature status, environment configuration, database setup, administrator provisioning, and deployment instructions.

After completing that setup, run commands from this directory:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000/admin/login](http://localhost:3000/admin/login) to access the admin sign-in page.

Public result search applies IP and identifier rate limits before database access. Production requires Upstash credentials and a private HMAC secret; `npm run dev` uses an in-memory store. See [RATE-LIMITING.md](RATE-LIMITING.md) for deployment configuration, failure behavior and testing. Run `npm run test:rate-limit` for deterministic limiter tests without Redis.
