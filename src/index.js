const core = require("@actions/core");
const github = require("@actions/github");

const isInvalid = require("./is-invalid");

// most @actions toolkit packages have async methods
async function run() {
  try {
    const token = core.getInput("repo-token", { required: true });
    const settings = {
      labels: core.getInput("labels") || undefined,
      comment: core.getInput("comment") || undefined,
    };
    const conditions = {
      title_contains: core.getInput("title-contains") || undefined,
      body_contains: core.getInput("body-contains") || undefined,
    };

    core.debug("Getting GitHub issue context");
    const octokit = github.getOctokit(token);
    const context = github.context;

    core.debug(
      `Getting details for ${context.repository}#${context.issue_number}`
    );
    const issue = await octokit.issues.get(context);

    core.debug(
      `Checking validity of ${context.repository}#${context.issue_number}`
    );
    if (isInvalid(issue, conditions)) {
      await handleInvalidIssue(octokit, context, settings);
    }
  } catch (error) {
    core.setFailed(error.message);
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
}

async function commentOnIssue(octokit, context, comment) {
  octokit.issues.createComment({ ...context, body: comment });
}

async function labelIssue(octokit, context, labels) {
  if (labels.length) {
    octokit.issues.addLabels({ ...context, labels: labels.split(",") });
  }
}

async function closeIssue(octokit, context) {
  octokit.issues.update({ ...context, state: "closed" });
}

run();
