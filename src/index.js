import * as core from "@actions/core";
import * as github from "@actions/github";

import isInvalid from "./is-invalid.js";

// most @actions toolkit packages have async methods
async function run() {
  try {
    const token = core.getInput("repo-token", { required: true });
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");

    const settings = {
      labels: core.getInput("labels") || undefined,
      comment: core.getInput("comment") || undefined,
      normalizeNewlines: !!core.getInput("normalize-newlines"),
      any: !!core.getInput("any"),
      lock: core.getInput("lock") || undefined,
    };
    const conditions = {
      title_contains: core.getInput("title-contains") || undefined,
      body_contains: core.getInput("body-contains") || undefined,
      body_is_blank: !!core.getInput("body-is-blank"),
    };

    core.debug("Getting GitHub issue context");
    const octokit = github.getOctokit(token);
    const context = github.context;
    const issue_number = context.payload.issue.number;

    const issueDetails = {
      owner,
      repo,
      issue_number,
    };

    core.debug(`Getting details for ${owner}/${repo}#${issue_number}`);
    const issue = (await octokit.rest.issues.get(issueDetails)).data;
    core.debug(JSON.stringify(issue, undefined, 2));

    core.debug(`Checking validity of ${owner}/${repo}#${issue_number}`);
    const invalid = isInvalid(issue, conditions, settings);
    if (invalid) {
      await handleInvalidIssue(octokit, issueDetails, settings);
    }
    core.setOutput("was-closed", invalid);
  } catch (error) {
    core.setFailed(error.stack);
  }
}

async function handleInvalidIssue(octokit, context, settings) {
  if (settings.labels) {
    await labelIssue(octokit, context, settings.labels);
  }
  if (settings.comment) {
    await commentOnIssue(octokit, context, settings.comment);
  }
  await closeIssue(octokit, context);
  if (settings.lock) {
    await lockIssue(octokit, context, settings.lock);
  }
}

async function commentOnIssue(octokit, context, comment) {
  octokit.rest.issues.createComment({ ...context, body: comment });
}

async function labelIssue(octokit, context, labels) {
  if (labels.length) {
    octokit.rest.issues.addLabels({ ...context, labels: labels.split(",") });
  }
}

async function closeIssue(octokit, context) {
  octokit.rest.issues.update({
    ...context,
    state: "closed",
    state_reason: "not_planned",
  });
}

async function lockIssue(octokit, context, lockReason) {
  octokit.rest.issues.lock({
    ...context,
    lock_reason: lockReason,
  });
}

run();
