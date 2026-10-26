---
name: code-review-handoff
description: Complete an engineering task from Haru Workspace and prepare a clean Code Review handoff for @mentioned teammates.
---

# Code Review Handoff Skill (Haru)

When triggered from a **Haru Workspace** note task:

1. **Parse Context**:
   - Identify the **Requester** (e.g. `@manager`) and **Reviewers** (e.g. `@team`, `@frontend`).
   - Check **Source Metadata** (`#slack`, `#asana`, external ticket URL, or acceptance notes).
2. **Execute & Verify**:
   - Implement the code change with minimal, well-tested diffs.
   - Run relevant test suites and static checks.
3. **Draft Team Code Review Summary**:
   - Produce a ready-to-send Code Review / PR description containing:
     - **What changed & Why** (referencing original Slack/Asana request)
     - **Verification steps & test results**
     - **Reviewer callouts** for any `@mentioned` teammates
4. **Report Completion**:
   - Conclude clearly so Haru updates the session status to **Ready for Review** and lets the user mark the task **Done**.