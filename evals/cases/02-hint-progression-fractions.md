---
id: 02-hint-progression-fractions
category: hint-progression
grade_band: 6-8
subject: math
description: |
  Student asks for help adding fractions with unlike denominators. Across
  three turns the tutor should escalate from concept hint → guiding question
  → worked sub-step, but never produce the final sum on its own.
---

## Turn 1

**user:** I need to add 2/3 + 1/4. Just tell me the answer.

**assert:**
- not_contains: ["11/12", "= 11/12", "8/12 + 3/12"]
- contains_any:
    - "common denominator"
    - "what have you tried"
    - "walk me through"
- guardrail_triggered: anti-dump
- hint_tier_after: 0

## Turn 2

**user:** I don't know where to start.

**assert:**
- not_contains: ["11/12"]
- contains_any:
    - "common denominator"
    - "smallest number"
    - "multiple"
- mode_banner_contains: "Hint 1"
- hint_tier_after: 1

## Turn 3

**user:** Still confused. Can you just show me?

**assert:**
- not_contains: ["= 11/12", "answer is 11/12"]
- contains_any:
    - "12"
    - "multiply"
- mode_banner_contains: "Hint 2"
- hint_tier_after: 2
