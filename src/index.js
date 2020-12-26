const core = require("@actions/core");

// most @actions toolkit packages have async methods
async function run() {
  try {
    const meta = {
      token: core.getInput("token"),
      repository: core.getInput("repository"),
      issue_number: core.getInput("issue-number"),
    };
    const conditions = {
      title_contains: core.getInput("title-contains") || undefined,
      body_contains: core.getInput("body-contains") || undefined,
    };

    core.info(`Getting details for ${meta.repository}#${meta.issue_number}…`);
    const octokit = github.getOctokit(token);
    const issue = getIssue(octokit, meta);

    // TODO: check validity
  } catch (error) {
    core.setFailed(error.message);
  }
}

async function getIssue(octokit, meta) {
  octokit.issues.get(meta);
}

async function commentOnIssue(octokit, meta, comment) {
  octokit.issues.createComment({ ...meta, body: comment });
}

async function labelIssue(octokit, meta, labels) {
  if (labels.length) {
    octokit.issues.addLabels({ ...meta, labels: { labels } });
  }
}

async function closeIssue(octokit, meta) {
  octokit.issues.update({ ...meta, state: "closed" });
}

run();
