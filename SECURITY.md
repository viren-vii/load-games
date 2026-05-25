# Security Policy

## Supported versions

`@load-games/*` is pre-1.0. Only the latest minor (`0.x`) receives security fixes.

| Version | Supported |
|---------|-----------|
| latest `0.x` | yes |
| older `0.x` | no |

## Reporting a vulnerability

**Do not open a public issue for security reports.**

Email **virubhosale112@gmail.com** with:

- A description of the vulnerability and its impact.
- Steps to reproduce, or a minimal proof of concept.
- The affected package(s) and version(s).
- Any suggested fix, if you have one.

You will receive an acknowledgement within 72 hours. Fixes for confirmed reports are typically released within 14 days, depending on severity and complexity. Coordinated disclosure is preferred — please do not publish details until a patched release is out.

## Scope

In scope:
- Code in `packages/*` published to npm under `@load-games/*`.
- The release pipeline in `.github/workflows/release.yml` (OIDC / Trusted Publishing).

Out of scope:
- The demo app in `apps/demo` (deployed only to GitHub Pages; no user data, no backend).
- Vulnerabilities in upstream dependencies — report those to the upstream project. We will update our pin once a fix is available.
- Findings that require physical access, a compromised npm account, or a malicious local extension.

## Supply-chain hardening

- Every published tarball carries a SLSA Provenance v1 attestation tying it to the exact GitHub Actions workflow run and commit SHA. Verify with `npm audit signatures` or check the "Provenance" badge on the npmjs.com page.
- Publishing uses npm Trusted Publishing (OIDC) — no long-lived `NPM_TOKEN` stored as a repo secret.
- Lockfile (`pnpm-lock.yaml`) is committed and CI installs with `--frozen-lockfile`.
