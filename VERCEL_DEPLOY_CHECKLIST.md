# Vercel Deploy Checklist

## Check Time

- Date: 2026-06-01
- Project: AI Practice Research Agent MVP
- Target: Vercel / Next.js

## Build Check

- Command: `corepack pnpm build`
- Result: passed
- Note: build completed successfully. There is one existing lint warning in `app/projects/[id]/page.tsx` about the `loadProject` hook dependency; it does not block the production build.

## Git Ignore Check

Required ignored paths:

- `.env`: present
- `.env.local`: present
- `.env.*.local`: present
- `node_modules`: present
- `.next`: present

Current check:

- `.env.local` is ignored and not tracked by git.
- `node_modules` is ignored.
- `.next` is ignored.

## Environment Variables For Vercel

Configure these in Vercel Project Settings -> Environment Variables:

```bash
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=<your DeepSeek API key>
```

Do not commit real API keys. Do not prefix the key with `NEXT_PUBLIC_`.

## AI Key Exposure Check

- No `NEXT_PUBLIC_` environment variable usage was found.
- AI provider keys are read from `process.env` in server-side AI service code.
- Real API keys were not printed or copied into project files.

## README Check

- README includes a Vercel deployment section.
- README documents `AI_PROVIDER=deepseek`.
- README documents `DEEPSEEK_API_KEY` as a Vercel environment variable.

## Deployment Risks

- If no production database is configured, project records use the current fallback storage strategy. This is acceptable for MVP demos, but not durable production storage on Vercel serverless deployments.
- `.env.local` is intentionally local-only and must not be uploaded.
- The app depends on server-side environment variables for real AI generation; missing keys will trigger mock fallback.

## Final Status

- Build: passed
- Secret exposure: no real API key found in tracked diff
- Ready for Vercel import after final build verification
