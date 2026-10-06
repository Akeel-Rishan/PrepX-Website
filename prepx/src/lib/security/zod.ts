import { config } from 'zod/v4/core';

// Zod's optional JIT probes Function(), which emits a CSP violation even when
// caught. Use its interpreter for the same schemas in browsers and on the server.
config({ jitless: true });

