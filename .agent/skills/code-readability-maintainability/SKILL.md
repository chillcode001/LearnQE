---
name: code-readability-maintainability
description: Apply when implementing, refactoring, reviewing, or testing code in this project. Keep React, TypeScript, CSS, and QA automation changes clear, cohesive, accessible, and easy to maintain.
---

# Readable, maintainable project code

Use these guidelines when changing the Northstar QA Automation Interview Lab. Optimize for the next person understanding the behavior and safely changing it. Follow existing project patterns unless there is a concrete reason to improve them. Prefer focused changes over broad cleanup.

## Make behavior easy to understand

- Use descriptive names that convey purpose; avoid unexplained abbreviations and names that hide units, conditions, or side effects.
- Keep functions and components cohesive. Separate responsibilities when doing so makes behavior easier to follow or test; do not split code mechanically just to reduce line count.
- Prefer direct control flow and simple data transformations. Avoid clever expressions, needless indirection, duplicate sources of truth, and abstractions used only once without a clear benefit.
- Make important assumptions and non-obvious decisions explicit near the code that depends on them. Comments should explain why or a meaningful constraint, not restate the code.
- Preserve consistent formatting and idioms already used in the project. Use strict TypeScript types and avoid weakening types to bypass errors.
- Format source for comfortable reading and debugging: use consistent indentation, meaningful line breaks, and one logical element or declaration per line where practical. Never compress JSX/HTML trees, CSS rules, object literals, or control flow into long clumped lines. Keep nested markup visibly nested so its structure and closing tags are easy to verify.
- When editing JSX, put complex elements, props, conditional branches, and mapped children on separate, consistently indented lines. Keep short, simple inline text concise, but do not trade scanability for fewer lines.
- Keep CSS declarations and selectors readable: one declaration per line, blank lines between related rule groups, and clear separation of responsive/media-query sections. Avoid minifying hand-authored source.

## React and interface changes

- Keep state minimal and derive values such as cart count, totals, and filtered products from their source data rather than duplicating state.
- Use semantic HTML and accessible names for interactive controls. Prefer native browser behavior when it provides clear, accessible validation and interaction.
- Keep visual changes responsive and aligned with the existing CSS approach. Avoid introducing dependencies or design systems for a small local app without a demonstrated need.

## QA automation changes

- Write tests around user-visible behavior and meaningful risks. Each test should have a clear purpose, deterministic setup, and assertions that would fail if the behavior regressed.
- Prefer Playwright role, label, and placeholder locators. Avoid brittle selectors and fixed sleeps; wait for meaningful UI state with retrying assertions.
- Keep tests independent and avoid order-dependent state. Cover relevant success, failure, and boundary cases without duplicating existing coverage.
- For Selenium code, use explicit waits where needed and ensure the WebDriver is closed even when a test fails.

## Change and review discipline

- Read `README.md`, `.agent/MEMORY.md`, and `AGENTS.md` before substantial work. Check existing code and tests before proposing a new pattern.
- Make the smallest coherent change that satisfies the task. Do not combine unrelated refactors with behavior changes.
- Update relevant documentation and `.agent/MEMORY.md` when behavior, structure, commands, decisions, test coverage, or verification status changes.
- Report checks accurately. Never imply a test, build, or manual review was run unless it was.

## Completion checklist

- Can a reader infer intent from names and straightforward control flow?
- Is each new abstraction or state value justified by a concrete need?
- Are user-facing controls semantic and accessible?
- Do tests assert observable behavior without fixed sleeps or hidden ordering assumptions?
- Are docs and `.agent/MEMORY.md` accurate, including which checks were actually run?

## Basis

These project-specific practices are informed by Google’s [Go readability and maintainability guidance](https://github.com/google/styleguide/blob/gh-pages/go/guide.md) and [code review standards](https://google.github.io/eng-practices/review/reviewer/standard.html). Apply their general emphasis on clarity, consistency, maintainability, and proportionate review; use TypeScript/React and local project conventions for language-specific choices.
