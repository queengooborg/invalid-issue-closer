import isInvalid from "./is-invalid.js";
import { expect } from "chai";

describe("isInvalid()", () => {
  it("returns false when no conditions are met", () => {
    const issue = {
      number: 1234,
      title: "Some prefilled text - Text filled by the author",
      state: "open",
      body: "More text filled by the author",
    };
    const conditions = {
      title_contains: "replaceme",
    };

    expect(isInvalid(issue, conditions, {})).to.equal(false);
  });

  it("returns true when 1 of 1 condition is met", () => {
    const issue = {
      number: 1234,
      title: "Some prefilled text - replaceme",
      state: "open",
      body: "More text filled by the author",
    };
    const conditions = {
      title_contains: "replaceme",
    };

    expect(isInvalid(issue, conditions, {})).to.equal(true);
  });

  it("returns false when 1 of 2 condition is met", () => {
    const issue = {
      number: 1234,
      title: "Some prefilled text - replaceme",
      state: "open",
      body: "Text filled by the author",
    };
    const conditions = {
      title_contains: "replaceme",
      body_contains: "deleteme",
    };

    expect(isInvalid(issue, conditions, {})).to.equal(false);
  });

  it("returns true when 2 of 2 conditions are met", () => {
    const issue = {
      number: 1234,
      title: "Some prefilled text - replaceme",
      state: "open",
      body: "deleteme",
    };
    const conditions = {
      title_contains: "replaceme",
      body_contains: "deleteme",
    };

    expect(isInvalid(issue, conditions, {})).to.equal(true);
  });

  it("returns true when 1 of 2 condition is met in 'any' mode", () => {
    const issue = {
      number: 1234,
      title: "Some prefilled text - replaceme",
      state: "open",
      body: "Text filled by the author",
    };
    const conditions = {
      title_contains: "replaceme",
      body_contains: "deleteme",
    };
    const settings = {
      any: true,
    };

    expect(isInvalid(issue, conditions, settings)).to.equal(true);
  });

  it("Condition for a blank body", () => {
    const issue = {
      number: 1234,
      title: "Foo bar",
      state: "open",
      body: "",
    };
    const conditions = {
      body_is_blank: true,
    };

    expect(isInvalid(issue, conditions, {})).to.equal(true);
  });

  it("returns false when issue is a pull request", () => {
    const issue = {
      number: 1234,
      title: "Some prefilled text - replaceme",
      state: "open",
      body: "deleteme",
      pull_request: {
        url: "http://…",
      },
    };
    const conditions = {
      title_contains: "replaceme",
      body_contains: "deleteme",
    };

    expect(isInvalid(issue, conditions, {})).to.equal(false);
  });

  it("normalizes newlines with option", () => {
    const issue = {
      number: 1234,
      title: "Some prefilled text - replaceme",
      state: "open",
      body: "deleteme-line1\r\ndeleteme-line2\r\n",
    };
    const conditions = {
      title_contains: "replaceme",
      body_contains: "deleteme-line1\ndeleteme-line2\n",
    };
    const settings = { normalizeNewlines: true };

    expect(isInvalid(issue, conditions, settings)).to.equal(true);
    expect(isInvalid(issue, conditions, {})).to.equal(false);
  });
});
