# Repository Guidelines

## Project Purpose

This workspace contains architecture documents and static prototypes for a chip software validation automation platform. The platform design covers requirement management, use case management, resource management for EMU/FPGA/CPU/QEMU, execution planning, execution tasks, milestone tracking, failure Issue/PR workflow, Managed Agent orchestration, event/rule engines, and dashboards.

`CATP_Platform/` is an existing TypeScript implementation reference. Treat it as a separate subproject with its own instructions in `CATP_Platform/AGENTS.md`.

## Repository Structure

- `architecture/`: final design documents, module-level designs, data models, SVG diagrams, and PNG previews.
- `prototype/`: static HTML prototype for the complete platform workflow.
- `CATP_Platform/`: existing pnpm monorepo implementation reference.
- `a.md`, `a.PNG`, `image.png`: original reference materials from the product/design discussion.

## Primary Design Artifacts

- `architecture/final-design-document.md`: entry point for the final architecture.
- `architecture/final-end-to-end-flow.svg`: end-to-end workflow overview.
- `architecture/final-domain-data-map.svg`: core domain data relationship map.
- `architecture/chip-validation-platform-layered.svg`: five-layer architecture.
- `architecture/resource-management-scheduling.md`: resource management and scheduling design.
- `architecture/automation-orchestration.md`: event/rule engine and Managed Agent design.
- `architecture/use-case-execution-orchestration.md`: use case execution orchestration design.
- `architecture/failure-analysis-issue-pr.md`: failure analysis modeled after GitHub Issue/PR workflows.

## Prototype

The static prototype is in `prototype/`.

- Open directly: `prototype/index.html`
- Optional local server from repo root:

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:4173/prototype/
```

The prototype intentionally has no build step and no external runtime dependency. It contains 13 views: dashboard, requirements, cases, resources, plans, tasks, failures, PR checks, Agent Studio, rules, milestones, settings, and architecture gallery.

## Working With Architecture Files

- Prefer editing Markdown source files and SVG source files directly.
- Keep generated PNG previews next to the SVG when adding or changing diagrams.
- Validate SVG files with:

```bash
xmllint --noout architecture/*.svg
```

- Generate PNG previews on macOS with:

```bash
sips -s format png architecture/<diagram>.svg --out architecture/<diagram>.svg.png
```

## Working With Prototype Files

- Keep the prototype static and easy to open.
- Main files:
  - `prototype/index.html`
  - `prototype/styles.css`
  - `prototype/app.js`
- Validate JavaScript syntax with:

```bash
node --check prototype/app.js
```

- If using a temporary local server for browser verification, stop it before finishing.

## Working With `CATP_Platform/`

When modifying files under `CATP_Platform/`, follow `CATP_Platform/AGENTS.md`.

Useful commands from inside `CATP_Platform/`:

```bash
pnpm install
pnpm db:generate
pnpm dev:api
pnpm dev:web
pnpm dev:worker
pnpm build
pnpm test
pnpm verify:backend
```

Do not commit secrets. Runtime configuration belongs in environment variables such as `DATABASE_URL`, `REDIS_*`, `S3_*`, `JWT_SECRET`, `GITLAB_*`, and `AGENT_PLATFORM_*`.

## Design Conventions

- Preserve the current architecture terminology: `EventRecord`, `AutomationRule`, `RuleActivation`, `AgentRun`, `ResourceRequest`, `ResourceLease`, `ExecutionGraph`, `CaseExecutionNode`, `PlatformExecutionResult`, `FailSnapshot`, `FailureIssue`, `FixProposal`, `VerificationCheck`, and `CloseGateEvaluation`.
- Keep the rule-to-agent trigger semantics explicit: configuration-level 1:1 and runtime-level 1:1.
- FPGA and EMU are non-virtualizable resources and should be modeled with exclusive leases.
- Daytime scheduling prioritizes humans by default; nighttime scheduling prioritizes programmatic execution by default.
- Use case platform assignment is human annotated. Agents may suggest changes, but should not silently overwrite approved annotations.
- QEMU precheck failures may skip higher-cost FPGA/EMU nodes; `model_unsupported` must not be treated as a real functional failure.
- Failure analysis should preserve the GitHub Issue/PR mental model: Failure Issue, Fix/Verification PR, checks, timeline, labels, owner, milestone, duplicate/related links, and close gates.

## Verification Expectations

Before claiming a change is complete, run the smallest useful verification:

- Documentation and diagram edits: `xmllint --noout` for changed SVG files and link/path spot checks.
- Prototype edits: `node --check prototype/app.js` and, when practical, open the prototype in a browser.
- `CATP_Platform/` edits: run the relevant pnpm test/build command from that subproject.

Report any verification that could not be run.
