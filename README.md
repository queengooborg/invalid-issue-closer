# [invalid-issue-closer GitHub Action](https://github.com/queengooborg/invalid-issue-closer)

Designed by [Daniel D. Beck](https://ddbeck.com/), updated by [Vinyl Da.i'gyu](https://www.queengoob.org).

The `invalid-issue-closer` GitHub Action helps you close nuisance issues. It checks whether a new issue contains specific text in the title or body and, if it does, closes it. For example, you can use this action to automatically close issues which contain unmodified template text.

This was created specifically for [mdn/browser-compat-data](https://github.com/mdn/browser-compat-data); see [#8017](https://github.com/mdn/browser-compat-data/issues/8017) for background.

You're free to use, share, and modify this action; see the [LICENSE](./LICENSE) for detials. This action is derived from the [actions/javascript-action](https://github.com/actions/javascript-action/tree/v1.0.1) template. See that repository for even more information.

## Use this action

Add this action as a step on a new or existing workflow. The basic usage looks like this:

```yaml
- uses: queengooborg/invalid-issue-closer@latest
  with:
    repo-token: ${{ secrets.GITHUB_TOKEN }}
    labels: label1,label2
    comment: "A message to post when closing the issue."
    normalize-newlines: true
    title-contains: "<PUT TITLE HERE>"
    body-contains: "<PUT PROBLEM DESCRIPTION HERE>"
```

The `with` settings are:

- `repo-token` (**required**): The `GITHUB_TOKEN` secret.
- `labels` (optional): A comma-separated list of labels to apply to issues closed by this action
- `comment` (optional): A message to post when closing the issue
- `normalize-newlines` (optional): boolean, whether to normalize CRLF to LF in issue and condition text
- `title-contains` (optional): Text that, if matched, closes the issue
- `body-contains` (optional): Text that, if matched, closes the issue

**Note**: If both `title-contains` and `body-contains` are set, then both conditions must be satisifed to close the issue.

For example, to run this on newly-created issues, create a file called `.github/workflows/close-invalid-issues.yml` containing the following:

```yaml
on:
  issues:
    types: [opened]

jobs:
  close-incomplete-issue-templates:
    steps:
      - uses: queengooborg/invalid-issue-closer@latest
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
          labels: "invalid :no_entry_sign:"
          comment: "This issue was automatically closed because it appears that the issue template has not been completed."
          normalize-newlines: true
          title-contains: "<PUT TITLE HERE>"
          body-contains: "<PUT PROBLEM DESCRIPTION HERE>"
```

## Maintenance

To maintain this action, here is some documentation left over from the [actions/javascript-action](https://github.com/actions/javascript-action/tree/v1.0.1) template.
