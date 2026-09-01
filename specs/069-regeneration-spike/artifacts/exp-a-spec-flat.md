# Specification: the claims + authority feature

The complete specification available to you, as a list of statements.

1. the CozoDB relation is declared as :create claims { id: Int, subject_type: String, subject_id: Int, predicate: String, assertion: String, authority: String, source: String, created_at: String }
2. created_at is an ISO 8601 timestamp generated server-side
3. predicate max 256 chars, assertion max 4096, source max 1024, all measured after trim, all non-empty after trim
4. id is a sequential handle allocated the same way annotations and episodes allocate theirs
5. no two rows share the tuple (subject_type, subject_id, predicate, assertion, authority, source); enforced by a pre-insert lookup comparing stored trimmed values
6. claims are immutable once written; there is no update path, correction is delete then re-assert
7. the declaration has no => so all 8 columns form the composite key; id uniqueness is enforced by the allocator, not the schema
8. predicate, assertion, authority and source are trimmed at write time and stored trimmed, so every downstream comparison is exact equality
9. claims are first-class records with fields: id (Int), subject_type (String), subject_id (Int), predicate (String), assertion (String), authority (String), source (String), created_at (String)
10. the CozoDB relation is declared as :create authorities { name: String => rank: Int, description: String }
11. tier name max 64 chars, non-empty after trim
12. ranks need not be unique; two tiers may tie, which is what produces unresolved conflict groups
13. rank must be a non-negative integer; non-integer or negative is a validation error
14. seeded descriptions are: observation='Recorded from experience; non-binding by default', implementation='What the code actually does', product='Product intent', legal='Legal or regulatory constraint', manual='Direct human assertion; highest standing'
15. init seeds five tiers: observation rank 10, implementation rank 20, product rank 30, legal rank 40, manual rank 100
16. the authority registry stores tiers, each with a unique name, an integer rank (higher = more authoritative), and a description
17. all operations follow the sys.call Result envelope, POD only, snake_case field names
18. an unregistered tier returns code not_found on authority with message 'authority tier not registered: <name>'
19. a field that is empty after trim returns code invalid on that field with message '<field> must not be empty'
20. a missing required field returns code required with message '<field> is required' on that field
21. a subject that does not exist returns code not_found on subject_id with message '<subject_type> not found: <id>'
22. an invalid subject_type returns code invalid on subject_type with message 'subject_type must be one of: concept, edge'
23. a field over its cap returns code invalid on that field with message '<field> exceeds <N> characters'
24. created is false when an identical claim already existed; the existing row is returned unchanged including its original id and created_at
25. params are subject_type, subject_id, predicate, assertion, authority, source - all required
26. the handler is registered at sys.call path /mind/claims/create
27. result is the claim fields plus rank plus a boolean created flag
28. source is part of the identity tuple: the same assertion from two different sources is two claims, which is corroboration
29. subject_type is concept or edge; validation must check the matching relation, not always concepts
30. the subject must exist before a claim is written
31. an unknown id returns code not_found on id with message 'claim not found: <id>'
32. params is id, required
33. the handler is registered at sys.call path /mind/claims/get
34. result is a single claim object with joined rank, same shape as create minus the created flag
35. no matches returns an empty list with count 0 and status success, not an error
36. competing claims are stored side by side; nothing is overwritten, merged, or given precedence at write time
37. claims are ordered by rank descending, then id ascending
38. params are all optional and AND-combined: subject_type, subject_id, predicate, authority, resolve (bool, default false), limit (int, default 100)
39. the handler is registered at sys.call path /mind/claims/list
40. requesting a resolved view performs no writes and does not remove or hide the losing claims from unresolved queries
41. with resolve true, one claim per (subject_type, subject_id, predicate) group is returned - the highest-rank one - and resolution is per group, not a global maximum
42. with resolve true, a tie at the top rank between different assertions returns all tied claims for that group
43. result is { claims: [...], count: N, resolved: bool }
44. subject_id given without subject_type matches claims on either subject type
45. no conflicts returns an empty list with count 0 and status success
46. conflict groups are returned whole; there is no silent truncation
47. params are all optional filters: subject_type, subject_id, predicate
48. the handler is registered at sys.call path /mind/claims/conflicts
49. result is { conflicts: [group...], count: N }
50. an unknown id returns code not_found on id with message 'claim not found: <id>'
51. params is id, required
52. the handler is registered at sys.call path /mind/claims/delete
53. claims is an all-key relation, so removal needs the full 8-column row: read the row by id, then remove it
54. result is { id: <id>, deleted: true }
55. an omitted description on an update preserves the existing description rather than blanking it
56. a name over 64 chars returns code invalid on name with message 'name exceeds 64 characters'
57. a non-integer or negative rank returns code invalid on rank with message 'rank must be a non-negative integer'
58. a missing name or rank returns code required on that field with message '<field> is required'
59. updating a rank does not rewrite claims; they pick up the new rank on the next read
60. params are name (required), rank (required), description (optional)
61. the handler is registered at sys.call path /mind/authorities/create
62. result is { name, rank, description, created }
63. re-registering an existing name updates it rather than duplicating; created is false in that case
64. ordered by rank descending, then name ascending
65. takes no params
66. the handler is registered at sys.call path /mind/authorities/list
67. result is { authorities: [{name, rank, description}...], count: N }
68. an unknown tier returns code not_found on name with message 'authority tier not found: <name>'
69. deleting a tier that any claim references returns code conflict on name with message 'authority tier is referenced by <N> claim: <name>' (singular for one) and deletes nothing
70. params is name, required
71. the handler is registered at sys.call path /mind/authorities/delete
72. result is { name, deleted: true }
73. the same assertion from two authorities is agreement, not a conflict, and produces no group
74. claims within a group are ordered by rank descending, then id ascending
75. a group is a conflict when one (subject_type, subject_id, predicate) holds two or more distinct assertions
76. a conflict group is derived per request, never stored
77. edge subjects produce conflict groups here even though the built-in contradictions rule is concept-only
78. groups are ordered by subject_type ascending, then subject_id ascending, then predicate ascending
79. resolution is the single highest-rank claim, carrying id, assertion, authority and rank
80. a group carries subject_type, subject_id, predicate, claims (each with id, assertion, authority, rank, source, created_at), resolution, and unresolved
81. if two or more claims tie at the top rank with different assertions, resolution is null and unresolved is true; ties are never broken by recency, id, or insertion order
82. the rule body is: contradictions[id, name] := *concepts[id, name, _, _, _], *claims[c1, 'concept', id, pred, a1, _, _, _], *claims[c2, 'concept', id, pred, a2, _, _, _], c1 < c2, a1 != a2
83. a built-in Datalog rule named contradictions ships alongside cycles and orphans
84. it returns [id, name] concept pairs, the fixed contract consumed by /mind/rules/query, /mind/verify and pr-verify
85. its registered description is 'Detects concepts carrying competing claims (contradiction)'
86. the rule flags every contradiction including ones that resolve cleanly by rank; it reports that the graph disagrees with itself, not whether the disagreement has a winner
87. it is a built-in and must be protected from deletion and overwrite like cycles and orphans
88. the rule covers concept subjects only; an edge id would be indistinguishable from a concept id in the [id, name] contract
89. deleting a concept removes claims on the concept AND claims on every edge that the deletion cascades away
90. concept delete reports the count as cascade.claims_removed
91. deleting an edge removes claims with subject_type edge and matching subject_id, reported as claims_removed
92. re-extraction removes claims for replaced concepts and edges
93. prune removes claims for every concept and edge it prunes; it deletes directly, bypassing the delete handlers
94. all concept and edge removal flows through one cascade function so no path can forget
95. the migration creates both relations, seeds the five tiers, and inserts the contradictions rule; no existing relation is touched
96. the migration preserves every existing concept, edge, provenance record, annotation, rule and episode
97. a freshly initialized 1.13.0 database and a migrated 1.12.0 database must be indistinguishable: same relations, same seeded tiers, same built-in rules
98. the schema version moves from 1.12.0 to 1.13.0
99. a claim whose tier is absent from the registry reads with rank null, sorts last, and never wins a resolution
100. rank is looked up from the registry at read time and never copied onto a claim, so re-ranking a tier changes resolution without rewriting any claim
101. the authority tier on a claim must already be registered; unregistered tiers are rejected
102. predicate and assertion are never validated against any vocabulary - strict about authority, loose about vocabulary
