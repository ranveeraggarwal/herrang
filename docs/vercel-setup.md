# Connecting Vercel (one-time, manual)

This has to be done once from the Vercel dashboard by someone with access to
the `ranveeraggarwal` GitHub account/org — it can't be scripted from a repo
session because it requires an interactive OAuth grant.

## 1. Import the project

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository** →
   pick `ranveeraggarwal/herrang`. If it's not listed, click **Adjust GitHub
   App Permissions** and grant access to the repo.
2. Vercel reads `vercel.json` and needs no further input:
   - Framework Preset: **Other** (`framework: null`)
   - Install Command: `npm ci`
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Set **Production Branch** to `main`.
4. Click **Deploy**.

## 2. What this gets you

Once the repo is connected, no further configuration is needed — Vercel's
GitHub App handles the rest natively:

- **Every push to `main`** → production deploy at the assigned domain.
- **Every pull request** → a preview deploy, with the PR URL and a
  bot-posted comment containing the preview link and build status. You get
  a working preview to click through *before* merging, exactly like a
  normal CI check.
- **Bad data ships nothing, silently correct.** `npm run build` calls
  `npm run validate` first (`scripts/build.mjs`) and exits non-zero on any
  schema or cross-file error — a hallucinated venue id or a malformed time
  fails the Vercel build outright. The PR gets a red ✗ and no preview URL
  instead of a broken deploy. This is the same safety net documented in
  `CLAUDE.md`, now enforced at deploy time too, with zero extra workflow
  files (see the note below on why `.github/workflows` isn't used for this).

## 3. Domain

`herrang.stockholmswing.com` is a subdomain of an existing zone (see the
spec, §7). In the Vercel project: **Settings → Domains → Add**, enter
`herrang.stockholmswing.com`, then add the CNAME record it displays
(typically `cname.vercel-dns.com`) to the `stockholmswing.com` DNS zone.
Propagation is usually minutes, occasionally longer.

## Why not a GitHub Actions workflow?

Vercel's native Git integration *is* the CI/CD here — it doesn't need a
`.github/workflows/*.yml` file at all, which conveniently sidesteps the
`workflow` OAuth scope that agent sessions in this repo don't have (see the
`ci/validate.yml` note in the README, which is a separate, optional
data-linting check — it doesn't deploy anything).

If preview deploys should ever run *without* granting Vercel's GitHub App
access to the repo, the alternative is a scoped GitHub Actions workflow
using the Vercel CLI (`vercel build` + `vercel deploy --prebuilt`) with
`VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` repo secrets
(`vercel link` locally prints the org/project IDs). That trades one
dependency (Vercel's GitHub App) for another (a token with deploy rights
sitting in GitHub Secrets) and needs the same manual, credentialed setup
either way — it isn't included here since the native integration above is
simpler and was what the original spec (§7) described.
