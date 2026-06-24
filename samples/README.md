# Sample data

Upload these in the **Nexlara home page header** (top-right), in order:

| File | What it does |
| --- | --- |
| `catalogue.csv` | 12 SKUs across 3 families (Networking, Software, Services). Includes `allowed_phases` and `asc606_class` so phasing + ASC-606 rules fire. |
| `phasing_rules.csv` | One narrative per family — used as a `warn`-severity nudge when you have lines in that family. |
| `asc606_rules.csv` | Four ASC-606 rules. The `license` rule **blocks** submit unless a `service` line is also present. |
| `dhi_codes.csv` | Six DHI codes — cached responses for fast plain-language decode (LLM is used only for codes not in this table). |

## Scenarios this data exercises

After uploading all four files, create a quote and try:

1. **ASC-606 companion required (block)** — add `SKU-SW-001 Network Analytics License` alone → Validate. You'll see a red block: *"requires a line with class 'service'"*. Add `SKU-SV-001 Implementation Service` → re-Validate → resolves.
2. **Strict phasing (block)** — add `SKU-NW-003 Core Router` (phase 1 only) and change its phase to 2 → Validate. Red block.
3. **Soft phasing (warn)** — add `SKU-SW-003 Performance Pack` in phase 1 → Validate. Amber warn (its `allowed_phases` is `2,3`).
4. **Subscription min_phase** — `SKU-SV-002 24x7 Support Subscription` in phase 0 (manually edit) → Validate.
5. **DHI cached lookup** — on any line click **+ DHI code**, enter `E1042` → block-level cached message appears in Issues.
6. **DHI LLM fallback** — enter a code that isn't in the table (e.g. `E9999`) → backend calls Azure OpenAI to decode it on the fly.
7. **Chat overlay** — bottom-right icon. Still works for ad-hoc CSV RAG; independent from the quote workspace.
