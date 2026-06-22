# Cognitive Runtime V1 Coherence Formalization

The deposited material presents an illustrative weighted coherence expression similar to:

```text
C = sum(w_i * s_i) / n
```

The V1 runtime uses:

```text
C(m) = sum(w_i * s_i) / sum(w_i)
```

This is a normalized weighted mean over configured validation dimensions. It preserves the `[0,1]` interval for arbitrary positive weights when each score is in `[0,1]`.

## Why V1 Normalizes By Weight Sum

If weights sum to `1`, the numerator already yields a normalized score. If weights do not sum to `1`, dividing by `sum(w_i)` keeps the result bounded and auditable.

Dividing by `n` is equivalent only under a particular convention for the weights. V1 stores configured weights in audit metadata and uses a mathematically bounded formula.

## What C(m) Means

C(m) is an operational promotion-coherence index calculated from configured validation dimensions. It is not a consciousness measurement, cognitive intelligence measurement, truth probability, scientific proof of cognition or universal answer-quality score.

Hard failures override the numeric score. A candidate with perfect weighted score still fails if privacy, vocation, Scientist approval or Scientist error/critical findings fail.

## Tested Cases

- all scores equal `1` gives coherence `1`;
- all scores equal `0` gives coherence `0`;
- equal scores remain equal after weighting;
- arbitrary positive weights remain normalized;
- theta boundary at `0.80` passes exactly;
- values immediately below `0.80` fail;
- values immediately above `0.80` pass;
- hard failure overrides score `1.0`.
