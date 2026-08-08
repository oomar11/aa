<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Token efficiency

- Do not waste tokens on trial-and-error loops, repeated exploratory attempts, or attaching evidence the user did not ask for.
- Do not take screenshots, screen recordings, or similar visual captures unless the user explicitly requests them.
- Do not send screenshots or screen recordings in responses, PRs, or comments unless the user explicitly asks for visual proof.
- Prefer reading code, logs, and targeted automated checks (tests, lint, typecheck, curl) over browser automation or manual UI verification.
- If something fails, diagnose from error output first; do not fall back to visual debugging by default.

## Deployment preference

- For user-facing changes, the final result should land on `master` so the main Vercel production URL updates.
- Do not leave the user's requested fix only on a preview branch unless the user explicitly asks for preview-only delivery.
- If a temporary feature branch is used for implementation or testing, finish by moving the validated change onto `master` and pushing it there.
