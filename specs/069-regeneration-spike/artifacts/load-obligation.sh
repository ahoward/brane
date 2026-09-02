#!/usr/bin/env bash
#
# Round 3 delta: encode the cross-cutting escaping obligation.
# This is the #128 acceptance fixture - can the graph carry an obligation that
# lands on a component outside the feature's own subject?
#
set -e
BRANE=${BRANE:-/home/drawohara/gh/ahoward/brane/bin/brane}

concept() { echo "{\"name\": \"$1\", \"type\": \"$2\"}" | $BRANE /mind/concepts/create > /dev/null; }
edge()    { echo "{\"source\": $1, \"target\": $2, \"relation\": \"$3\"}" | $BRANE /mind/edges/create > /dev/null; }

claim() {
  python3 - "$@" <<'PY' | $BRANE /mind/claims/create > /dev/null
import json, sys
print(json.dumps({"subject_type":"concept","subject_id":int(sys.argv[1]),"predicate":sys.argv[2],
                  "assertion":sys.argv[3],"authority":sys.argv[4],"source":sys.argv[5]}))
PY
}

concept CozoStringEscaping Caveat   # 16
concept RulesCreateHandler Entity   # 17

edge 16 1 DEPENDS_ON
edge 12 16 DEPENDS_ON
edge 3 16 DEPENDS_ON
edge 17 16 DEPENDS_ON

S="incident: brane #113, rules/create parse failure"

claim 16 rule "CozoDB string literals use backslash escapes, not SQL-style doubling. 'it''s' is a parse error; 'it\\'s' is correct." implementation "$S"
claim 16 alternative "Bound query parameters - db.run(script, params) with \$name placeholders - sidestep escaping entirely and round-trip quotes, backslashes and newlines correctly." implementation "$S"
claim 16 blast_radius "Every code path that interpolates a user-supplied string into a Cozo query must use one of the two correct approaches. SQL-style doubling silently rejects any value containing an apostrophe." implementation "$S"
claim 16 detection "The failure surfaces as: The query parser has encountered unexpected input / end of input at N..N" implementation "$S"
claim 16 why_unnoticed "The bug predates claims and was unreachable until claims existed, because no rule body had ever contained a quote character." implementation "$S"

claim 17 file "The handler lives at src/handlers/mind/rules/create.ts" implementation "$S"
claim 17 defect "It interpolates rule name, description and body into single-quoted Cozo literals using SQL-style doubling (.replace(/'/g, \"''\")), which CozoDB rejects." implementation "$S"
claim 17 obligation "Shipping the claims feature REQUIRES correcting this handler. A user-defined rule that joins *claims must contain the literal 'concept', so claims makes the latent bug reachable. Regenerating claims without fixing rules/create leaves a failing system." manual "$S"
claim 17 verification "A rule whose body contains a single-quoted literal must be creatable and queryable end to end." manual "$S"

echo "loaded extra"
