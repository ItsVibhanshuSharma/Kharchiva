# Split Expense UI reference

## Current approved design

Use the latest approved **expense-details form** reference for the Split Expense screen. The intended screen is a vertically scrolling form with:

- a Split Expense header;
- an Expense Details card with description, amount, date, group, payer, and category fields;
- Equal Split, Exact Amount, and Custom Percentage modes;
- a participant list with per-person shares and participant actions;
- an optional notes field with a 200-character limit; and
- a fixed **Create Split Expense** action at the bottom, inset for the device safe area.

The form layout and its fixed bottom action are the current visual source of truth. Keep the CTA outside the scroll view and provide enough scroll-content inset for Notes to move fully above it on shorter screens.

## Legacy image

[`15-split-expense.png`](./15-split-expense.png) is an older calculator-style concept retained in the design archive. It is superseded for implementation and must not be used to restore the calculator-style layout or its former save action. The latest approved expense-details form reference takes precedence.

## Implementation notes

This screen currently uses typed local/mock data and local submission feedback only. Do not describe the CTA as persisting an expense to a backend unless real persistence is implemented separately.
