---
"@auto-wiz/dom": patch
"@auto-wiz/playwright": patch
"@auto-wiz/puppeteer": patch
---

Improve input target disambiguation using recorded metadata for form fields.
This update helps Playwright and Puppeteer runners choose the intended input
when multiple similar selectors exist in the same form.
