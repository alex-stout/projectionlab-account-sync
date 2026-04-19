export const PL_MATCHES = [
  "https://app.projectionlab.com/*",
  "https://ea.projectionlab.com/*",
  ...(__E2E__ ? ["http://localhost:3000/projectionlab/*"] : []),
] as const;
