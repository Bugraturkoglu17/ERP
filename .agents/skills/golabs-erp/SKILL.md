---
name: golabs-erp
description: Loads GOLABS ERP context, reads architecture registries, and applies project-specific agent constraints.
---

# SKILL: GOLABS_ERP
*(This skill natively integrates GOLABS ERP bootstrap procedures into the agent's workflow)*

When invoked, you MUST strictly adhere to the following sequence:

1. READ `docs/AGENT_BOOTSTRAP.md` using the `view_file` tool to load the project's vision, tech stack, and core rules.
2. READ `apps/backend/docs/architecture_registry.md` to understand domain boundaries.
3. READ `apps/backend/docs/dependency_graph.md` to map dependencies.
4. READ `apps/backend/docs/event_registry.md` and `apps/backend/docs/task_registry.md` for async architecture.
5. IF `apps/backend/docs/api_inventory.md` exists, read it.
6. Summarize the `apps/backend/architecture/*.json` manifests for yourself internally (do not output them all to the user, just understand them).
7. List any active risks or technical debts based on your quick analysis.
8. Apply the Agent Response Style defined in `.agent/GOLABS_ERP_SKILL.md` (which requires formatting responses with Durum, Kısa Not, Sonraki Adım, and Agent Prompt).
9. Once the context is loaded, PROCEED with the user's main task.
