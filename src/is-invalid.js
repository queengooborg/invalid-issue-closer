import normalizeNewline from "normalize-newline";

const dontNormalizeNewline = (str) => str;

/**
 * Check whether an issue is invalid and eligible to be closed.
 *
 * An issue is invalid if all of these rules are true:
 * - The issue is not a pull request
 * - All of `conditions` are met
 *
 * @param {*} issue
 * @param {*} conditions
 * @returns {Boolean}
 */
function isInvalid(issue, conditions, options) {
  const normal =
    options && options.normalizeNewlines
      ? normalizeNewline
      : dontNormalizeNewline;

  if (issue.pull_request !== undefined) {
    return false;
  }

  const conditionsMet = {
    body_contains: normal(issue.body).includes(
      normal(conditions.body_contains),
    ),
    title_contains: normal(issue.title).includes(
      normal(conditions.title_contains),
    ),
  };

  const applicableConditionsMet = Object.keys(conditions).map(
    (key) => conditionsMet[key],
  );
  const invalid = applicableConditionsMet.every((v) => v);

  return invalid;
}

export default isInvalid;
