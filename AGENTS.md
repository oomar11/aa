<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Deployment preference

- For user-facing changes, the final result should land on `master` so the main Vercel production URL updates.
- Do not leave the user's requested fix only on a preview branch unless the user explicitly asks for preview-only delivery.
- If a temporary feature branch is used for implementation or testing, finish by moving the validated change onto `master` and pushing it there.
