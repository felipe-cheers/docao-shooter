---
name: fork-pr-matheus
description: Open a pull request from the current fork branch into its GitHub parent repository and send the PR and branch links to Matheus Valentim in Slack.
---

# Fork PR and Matheus notification

Use this workflow when the user asks to publish the current fork changes for review by the parent repository and notify Matheus Valentim.

## Required outcome

1. The current branch is pushed to the user's fork.
2. The fork's parent repository and default branch are identified from GitHub metadata.
3. The parent repository's default branch is merged or fast-forwarded into the working branch before opening the PR. Preserve user changes and stop for conflicts that need judgment.
4. A non-draft pull request is opened from `owner-fork:branch` to `owner-parent:default-branch`.
5. Matheus Valentim receives a Slack DM containing the branch link, PR link, and a short summary.

## Procedure

### 1. Inspect the repository

- Read `git status --short --branch` and `git remote -v`.
- Determine the fork repository from `origin` and query its GitHub repository metadata.
- Read the `parent.full_name` and `parent.default_branch` fields. Never infer the parent from a hard-coded owner.
- Keep unrelated working-tree changes intact. If the current branch has uncommitted changes, commit only changes in scope or ask the user which changes belong in the PR.

### 2. Synchronize and publish

- Fetch the parent default branch.
- Integrate it into the current branch with a fast-forward when possible; otherwise use a normal merge and preserve both histories.
- Run the repository's relevant checks before pushing.
- Push the current branch to `origin` and verify its remote SHA.

### 3. Open the parent PR

- Use the GitHub connector's PR creation action with:
  - `repository_full_name`: the parent repository;
  - `base`: the parent's default branch;
  - `head`: `fork-owner:current-branch`;
  - `draft: false`;
  - a title and body that describe the final behavior and validation.
- If the connector cannot create a cross-repository PR, provide the GitHub compare URL for the exact parent/base and fork/head refs. Do not claim that a PR was opened.

### 4. Notify Matheus in Slack

- Search Slack users for `Matheus Valentim` and verify the exact name before messaging.
- Send a direct message to the returned user ID with the branch URL, PR URL (or compare URL if PR creation was blocked), and a concise summary of checks.
- Link previews may be enabled for GitHub links.
- Report the Slack message link after sending.

## Safety and reporting

- Sending the Slack DM is an external side effect. Perform it only when the user explicitly asks for the notification in the current request.
- Do not merge the PR, deploy, or alter the parent repository beyond creating the PR.
- Report exact links, branch names, base/head repositories, and any permission failures. Distinguish an opened PR from a compare link.
