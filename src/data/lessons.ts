import type { Lesson } from '../types/lesson';

export const lessons: Lesson[] = [
  {
    day: '01',
    title: 'Think like an inventory QA engineer',
    tag: 'Foundations',
    time: '25 min',
    summary: 'Start with stock accuracy and operational risk, not a list of clicks.',
    learn: [
      'Functional vs. non-functional quality',
      'Test case, test, and bug report',
      'Inventory accuracy, traceability, and replenishment risks',
    ],
    exercise: 'Write three inventory risks. Consider an incorrect count, a missing movement reason, and an item below its reorder point. Rank impact and likelihood.',
    prompt: 'What happens if stock is adjusted below zero, a receipt is duplicated, or a low-stock item is missed? Identify evidence that would expose each failure.',
  },
  {
    day: '02',
    title: 'Explore and design inventory checks',
    tag: 'Manual testing',
    time: '30 min',
    summary: 'Turn stock workflows into observable, reproducible checks.',
    learn: [
      'Happy path and negative path',
      'Boundary values and equivalence classes',
      'Clear reproduction steps and expected results',
    ],
    exercise: 'Search by SKU, filter to low stock, receive units for one item, then adjust another. Record the before and after quantity and movement reason.',
    prompt: 'For each stock movement, what are the preconditions, action, expected quantity, reason, and audit evidence?',
  },
  {
    day: '03',
    title: 'Automate with Playwright',
    tag: 'TypeScript · Playwright',
    time: '35 min',
    summary: 'Use accessible locators and assertions that wait for real outcomes.',
    learn: [
      'Role, label, and placeholder locators',
      'Test isolation and deterministic setup',
      'Assertions, traces, and failure diagnosis',
    ],
    exercise: 'Write a Playwright journey that receives stock, verifies the count changes, and checks that the new movement appears in history.',
    prompt: 'Which accessible locators and observable assertions verify a stock receipt without coupling the test to component internals?',
  },
  {
    day: '04',
    title: 'Reliability and Selenium',
    tag: 'WebDriver',
    time: '30 min',
    summary: 'Compare explicit waits with Playwright’s auto-waiting.',
    learn: [
      'Why fixed sleeps create flaky tests',
      'Explicit wait conditions',
      'Driver lifecycle and cleanup',
    ],
    exercise: 'Automate an inventory search with Selenium. Wait for the matching SKU row and ensure the driver is closed if a check fails.',
    prompt: 'What explicit condition proves the inventory row is ready? How would you ensure driver cleanup after an assertion failure?',
  },
  {
    day: '05',
    title: 'Ship confidently with CI',
    tag: 'GitHub Actions',
    time: '35 min',
    summary: 'Make quality checks repeatable on every change.',
    learn: [
      'Build and test workflow stages',
      'CI failures and artifacts',
      'Smoke vs. regression suites',
    ],
    exercise: 'Inspect .github/workflows/ci.yml. Plan where unit, integration, and inventory E2E checks should run and which artifacts help diagnose a failure.',
    prompt: 'If stock history is correct locally but wrong in CI, what logs, traces, and test evidence would distinguish a product defect from setup trouble?',
  },
];
