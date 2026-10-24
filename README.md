# AI Workflow Time Machine — Phase 2

## Run
Open this folder in VS Code and run `index.html` with Live Server. No build step needed.

## What works
- Phase 1: local n8n JSON import, node/connection counts, node explorer
- Phase 2: scrollable SVG node map; checks for missing connection endpoints, duplicate names/IDs, isolated nodes, disabled nodes and trigger nodes without a main output
- The map is an illustrative grid layout, not a faithful recreation of the n8n canvas.
- Risk report is a basic structural lint, not AI, a full configuration audit, or a simulation.
- JSON is processed locally in the browser. Never upload sensitive credentials to third-party services.

## Test
1. Click Load Demo; review map and risk report.
2. Upload a safe exported n8n JSON workflow.
3. Verify node counts, visual map and warnings.
4. Use Clear to reset.

## Coming later
Phase 3: assumption-based simulation. Phase 4: n8n + Gemini analysis using a secure backend and sanitized workflow data.
