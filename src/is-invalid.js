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
function isInvalid(issue, conditions) {
  if (issue.pull_request !== undefined) {
    return false;
  }

  const conditionsMet = {
    body_contains: issue.body.includes(conditions.body_contains),
    title_contains: issue.title.includes(conditions.title_contains),
  };

  const applicableConditionsMet = Object.keys(conditions).map(
    (key) => conditionsMet[key]
  );
  const invalid = applicableConditionsMet.every((v) => v);

  return invalid;
}

module.exports = isInvalid;
