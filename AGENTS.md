# AGENTS.md

## What this repository is

PD rockets is a public, vendorable Rocket component collection. Drag-and-drop
is the first family, with framework-neutral behavior, custom-element wrappers,
browser-safe contracts, and example server adapters. Future surfaces may reuse
mechanics without imposing one universal layout component.

The repository must remain independent of any consuming application's private
commands, actions, signal scopes, stores, deployment configuration, or
operational documentation.

## Public repository hygiene

This repository is intended to be publishable. Do not commit:

- Personal names, email addresses, usernames, credentials, tokens, or other PII.
- Private hostnames, domains, IP addresses, ports, provider names, organization
  names, internal URLs, dashboard links, or machine-specific paths. Public
  upstream documentation and source links for declared dependencies are fine.
- Deployment topology, service-manager configuration, private runbooks, or
  environment-specific operational instructions.
- Secrets in source, fixtures, examples, logs, comments, Git metadata, or
  documentation.
- User-provided text in telemetry or diagnostic output.

Use synthetic, generic demo data and neutral placeholders. If operational
knowledge is needed for local development, keep it in an ignored local file.

## Upstream runtime boundary

Rocket is part of the open-source Datastar bundle. Keep the pinned upstream
bundle and its MIT notice together, including in generated site output. Do not
add a Pro runtime or maintain parallel runtime copies with different versions.

The vendorable kit bundle is built from this repository's source. Do not add
source maps or accidental machine-specific build output.

## Git and release hygiene

- Use a neutral, generic Git author identity.
- Keep commit messages technical and anonymous; do not include deployment or
  personal context.
- Review staged files before every commit.
- Do not add generated output, local binaries, databases, logs, or editor files.
- Keep dependency changes intentional and review the lockfile diff.

## Instrumentation and examples

Example servers must use in-memory or synthetic state only. Logs and metrics
may contain bounded numeric observations and opaque IDs, but never card text,
draft input, request bodies, cookies, or user content.

The browser contract remains backend-neutral. Do not add consuming-application
command IDs, authorization policy, private URLs, or Datastar transport policy
to the Rocket core or contracts.

## Pre-publish scrub checklist

Before publishing or making a substantial release:

1. Search the tree for hostnames, IPs, provider names, usernames, email
   patterns, personal names, internal paths, and organization names.
2. Review all Git commits and staged files for personal or deployment context.
3. Inspect fixtures and examples for real-looking names, emails, URLs, and
   credentials.
4. Confirm the upstream runtime is paired with its license notice, and source
   maps, local binaries, and build output are absent from the staged tree.
5. Confirm logs and telemetry contain only bounded numbers, tags, and opaque
   identifiers.
6. Run formatting, typechecking, tests, and both demo smoke tests.

When in doubt, leave the detail out of the public repository.
