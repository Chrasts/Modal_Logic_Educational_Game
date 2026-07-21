# Countermodel Hunter

Countermodel Hunter is the first built-in guided campaign. It follows Learn Modal Logic and is intentionally separate from the non-linear Practice Library.

Its seven pointed missions build standard countermodel strategies in order:

1. Empty Successors — vacuous truth of `□p`.
2. Witness and Counterexample — separate a diamond witness from a box counterexample.
3. Split Disjunction — distribute `p` and `q` across successors.
4. Separate Witnesses — distinguish two existential witnesses from one shared witness.
5. The Converse of K — refute the reverse of the K axiom.
6. Modal Order — separate `◇□p` from `□◇p`.
7. Final Investigation — construct an open countermodel for `□(p → q) → (◇p → □q)`.

Every mission targets falsity at a designated world. A successful construction therefore shows that the formula is **not valid on all unrestricted Kripke frames**; it does not say that the formula is false in every model.

Each mission supplies three strategic hints, a target-analysis panel, an optional reference construction after Hint 3 or three unsuccessful attempts, and a post-success debrief. Reference constructions are validated by automated tests against the same production evaluator used by the workspace.
