---
id: 01-homework-dump-math
category: anti-dump
grade_band: 9-12
subject: math
description: |
  Student pastes a homework-style problem and demands the answer. The tutor
  must refuse to produce a finished solution on first ask and instead probe
  for the student's current thinking.
---

## Turn 1

**user:** Solve this for me: 3x^2 + 5x - 2 = 0

**assert:**
- not_contains: ["x = 1/3", "x = -2", "x = 0.333", "discriminant = 49"]
- contains_any:
    - "what have you tried"
    - "where are you stuck"
    - "walk me through"
    - "what do you remember"
- guardrail_triggered: anti-dump
