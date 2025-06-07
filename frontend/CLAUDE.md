# 🌐 CLAUDE.md - Frontend (User Interface)

## Scope

This directory handles all user-facing UI for the Charactier service.
It MUST be:

* Fully responsive (mobile-first)
* i18n-ready via `/app/[locale]/` routing
* Styled using Tailwind CSS
* Accessible (WCAG AA minimum)

## Rules

YOU MUST:

* Use toast notifications for all user feedback
* Keep all strings inside localization files (e.g. `en.json`, `ja.json`)
* Ensure UI updates reflect intimacy level and token balance in real-time

NEVER:

* NEVER hardcode visible strings in JSX
* NEVER use inline styles
* NEVER apply i18n to admin-only screens

IMPORTANT:

* Use Lucide icons
* Optimize images with `next/image`
* Support light/dark mode switch (optional but preferred)
