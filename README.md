# LMG Marketing Campaign Operations

Campaign planning, approval, scheduling, publication tracking, and performance measurement for Laughing Moose Gifts. ChatGPT is the content-creation and interpretation layer; LMG Marketing is the operational system of record.

## Architecture

- **Sellerchamp** — product, inventory, marketplace, order, revenue and channel performance data.
- **LMG Analytics** — LaughingMooseGifts.com visitor and sales-funnel behavior.
- **LMG Marketing** — normalized analytics, campaign definitions, ChatGPT handoffs, content approval, scheduling, adapter-confirmed publication, measurement, decisions, actions and results.

## Core principle

Every campaign should be traceable through:

**Data → Campaign Brief → ChatGPT Content → Approval → Schedule → Publication → Measurement → ChatGPT Diagnosis → Decision → Action → Result**

## Primary workflow

1. Campaign Definition
2. Product and Channel Selection
3. ChatGPT Campaign Brief (Markdown and JSON)
4. Approved Content Import
5. Review and Approval
6. Scheduling and Execution
7. Performance Measurement and ChatGPT Performance Packet
8. Campaign Closeout

## Execution truth

- WooCommerce/WordPress homepage, landing-page, and collection-page assets are executable when credentials are configured.
- Pinterest organic campaign Pins are executable when a token and board ID are configured.
- Other channels are represented as manual scheduled tasks.
- A content asset is only marked published after adapter confirmation or an explicit user confirmation note.

## Feature flags

All deprecated/unfinished internal intelligence features default to off:

- `FEATURE_INTERNAL_AI_COPY`
- `FEATURE_INTERNAL_AI_IMAGES`
- `FEATURE_AI_STRATEGY`
- `FEATURE_COMPLEX_DIAGNOSTICS`
- `FEATURE_AUTOMATIC_CORRECTIVE_ACTIONS`
- `FEATURE_LEGACY_CAMPAIGN_WORKFLOW`

Set a flag to `true` only for deliberate legacy review. The focused workflow does not require an OpenAI API key.

## Database and tests

Apply migrations with `npm run db:deploy`. Run the focused packet and lifecycle tests with `npm test`; run the production validation with `npm run build`.

<!-- Deployment trigger: WordPress homepage publisher retry after build window -->
