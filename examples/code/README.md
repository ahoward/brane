CODE EXAMPLES
=============

Three problems brane solves for developers. Each script is runnable proof.


01 — CIRCULAR DEPENDENCIES
---------------------------

**Problem:** Nobody introduces a circular dependency on purpose. It
happens over 50 PRs across 6 months. AuthService depends on UserService.
UserService depends on DatabaseLayer. Clean. Then a new developer adds
"UserService calls AuthService to validate tokens." Seems reasonable.
Deploy it and both services deadlock on startup.

**What brane does:** Model services as concepts, dependencies as edges.
The built-in `cycles` rule is 3 lines of Datalog — it follows
`DEPENDS_ON` edges transitively and reports any concept that can reach
itself. `brane verify` catches the cycle immediately, names both
services, and exits non-zero for CI.

```bash
./01-circular-deps.sh
```


02 — IMPACT ANALYSIS
---------------------

**Problem:** You're refactoring PaymentService. You know it talks to
OrderProcessor. But do you know about RefundHandler? ChargebackWebhook?
BillingReconciler? All three depend exclusively on PaymentService — if
you change its interface, they break with no fallback. `grep
PaymentService` finds import statements. It doesn't tell you that 4
consumers, 2 infrastructure systems, and every downstream event listener
are in the blast radius.

**What brane does:** `brane search "payment"` finds semantically related
concepts — not just exact name matches. `brane graph neighbors 5` shows
everything connected to PaymentService: 4 inbound dependencies, 2
outbound infrastructure connections. Check the dependents —
RefundHandler has exactly 1 connection (PaymentService). It's a single
point of failure you didn't know about.

```bash
./02-impact-analysis.sh
```


03 — ARCHITECTURE RULES
------------------------

**Problem:** "The frontend never calls the database directly." Every
team has this rule. It lives in code review comments, onboarding docs
nobody reads, and Slack threads that scroll away. Three months later,
production is down, and a developer adds a "temporary" direct database
call from MobileApp to UserDB. They'll clean it up later. They won't.

**What brane does:** Encode the architecture as a knowledge graph —
8 components across 4 layers (Frontend, API, Service, Database). Write
a custom Datalog rule: "no Frontend concept may have a DEPENDS_ON edge
to a Database concept." One line of Datalog, not a 500-line ESLint
plugin. `brane verify` passes when the architecture is clean and catches
the violation the moment someone adds the shortcut.

```bash
./03-architecture-rules.sh
```


RUNNING
-------

All three scripts are self-contained. They create a temp workspace,
build a knowledge graph, demonstrate the problem, and clean up.

```bash
# run one
./01-circular-deps.sh

# run all three
for f in ./0*.sh; do echo "=== $f ===" && $f && echo ""; done
```

Requires the `brane` binary (run `bun run build` from the repo root).
