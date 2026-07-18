# Mathematical conventions and scope

This document records the modal-logical conventions used by Logic Model
Builder. It is also a checklist for reviewing future objectives and campaigns.

## Language and models

The current language is basic unimodal propositional logic generated from
propositional atoms using `¬`, `∧`, `∨`, `→`, `□`, and `◇`. Constants such as
`⊤` and `⊥` are not yet part of the parser.

A finite Kripke frame is `F = ⟨W,R⟩`, where `W` is a non-empty finite set and
`R ⊆ W × W`. A model based on `F` is `M = ⟨W,R,ν⟩`, with valuation
`ν: Prop → ℘(W)`. Many textbooks call the valuation `V`; using `ν` here is a
notational choice, not a mathematical difference.

The satisfaction relation is written `M,w ⊨ φ`. It is a metalinguistic
relation between a model, a world, and a formula; it is not a third component
of a frame and does not replace the valuation in a model tuple.

## Semantic clauses

- `M,w ⊨ □φ` iff, for every `v ∈ W`, if `wRv`, then `M,v ⊨ φ`.
- `M,w ⊨ ◇φ` iff there is some `v ∈ W` such that `wRv` and `M,v ⊨ φ`.
- `M ⊨ φ` iff `M,w ⊨ φ` for every `w ∈ W` (the displayed valuation is fixed).
- `F ⊨ φ` iff `M,w ⊨ φ` for every model `M` based on `F` and every `w ∈ W`.

Consequently, `□φ` is true and `◇φ` is false at a world with no successors.
For finite frames, the game decides `F ⊨ φ` by enumerating every valuation of
the atoms occurring in `φ`. Atoms not occurring in the formula cannot affect
its truth value and therefore need not be enumerated.

## Frame correspondences

The built-in presets use these standard correspondences:

| Axiom formula | Frame condition |
| --- | --- |
| `T: □p → p` | reflexive |
| `D: □p → ◇p` | serial |
| `B: p → □◇p` | symmetric |
| `4: □p → □□p` | transitive |
| `5: ◇p → □◇p` | Euclidean |

Here Euclidean means: if `wRv` and `wRu`, then `vRu`. S4 frames are reflexive
and transitive. S5 frames can be presented as equivalence frames (reflexive,
symmetric, and transitive); `T + 5` is an equivalent axiomatization.

A correspondence objective in the game compares the two truth values on one
displayed finite frame. Agreement is an instance check and pedagogical
evidence. It is **not** a proof of the general claim that the frames validating
an axiom are exactly the frames with its corresponding relational property.

## Finite-scope limitations

- Frame-validity checks are exhaustive only for the displayed finite frame.
- Testing many finite examples does not establish validity over all frames.
- Conversely well-foundedness, central to standard GL frames together with
  transitivity, is not currently implemented. On finite transitive frames it
  coincides with irreflexivity, but that finite shortcut must not be stated as
  the unrestricted definition.
- The game currently handles one accessibility relation and ordinary Boolean
  valuations; it does not yet model multimodal, intuitionistic, neighborhood,
  or first-order modal semantics.

## Content-review checklist

For every new mission:

1. State whether truth is pointed (`M,w ⊨ φ`), model-global (`M ⊨ φ`), or frame
   validity (`F ⊨ φ`).
2. Distinguish a fixed displayed valuation from quantification over all
   valuations.
3. Ensure `W` is non-empty and every edge endpoint and evaluation world exists.
4. Call a finite correspondence comparison an instance check, not a proof.
5. Test a known solution and, when practical, a nearby non-solution.
