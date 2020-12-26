const isInvalid = require("./is-invalid");

describe("isInvalid()", () => {
  it("returns false when 0 of 1 conditions are met", () => {
    const issue = {
      number: 1234,
      title: "Some prefilled text - Text filled by the author",
      state: "open",
      body: "More text filled by the author",
    };
    const conditions = {
      title_contains: "replaceme",
    };

    expect(isInvalid(issue, conditions)).toBe(false);
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

    expect(isInvalid(issue, conditions)).toBe(true);
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

    expect(isInvalid(issue, conditions)).toBe(false);
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

    expect(isInvalid(issue, conditions)).toBe(true);
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

    expect(isInvalid(issue, conditions)).toBe(false);
  });
});
