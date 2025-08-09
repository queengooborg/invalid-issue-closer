function detectSpam(bodyRaw, options = {}) {
  const cfg = {
    spamThreshold: 3,
    nonTemplateThreshold: 1,
    sectionMinJunkRatio: 0.6,
    entropyFloor: 3,
    uniqueTokenFloor: 0.35,
    ignoredSections: [
      "mdn url",
      "mdn metadata",
      "mdn page report details",
      "what type of issue is this?",
      "what browsers does this problem apply to, if applicable?",
    ],
    badDomains: ["onlyfans.com", "pornhub.com"],
    strongSectionMinChars: 200,
    strongSectionMinTokens: 40,
    ...options,
  };

  const body = bodyRaw.replace(/\r\n/g, "\n").trim();

  // --- Easy rules (fast path) ---
  const isBlank = removeHtmlComments(body).trim().length === 0;
  const isOnlyLink = isLinkOnly(body);
  const isTooShort = body.trim().length < 20;
  const isOnlyBlockquotes = bodyOnlyBlockquotes(body);
  const isOnlyImages = bodyOnlyImages(body);

  // “Originally posted by …” variants (plain/#123/markdown link/full URL)
  const isQuotedOtherIssue =
    /_?Originally posted by @\w+ in (?:#\d+|\[#\d+\]\([^)]*\)|https?:\/\/github\.com\/[^\s)\]]+)\s?$/i.test(
      body,
    );

  // “[spam]” placeholder
  const isCensoredSpam =
    /^['"`\s]*$begin:math:display$\\s*spam\\s*$end:math:display$['"`\s]*$/i.test(
      removeHtmlComments(body),
    );

  // NEW: banned domains present anywhere (raw or in markdown links)
  const badDomainHit = containsBadDomain(body, cfg.badDomains);

  let reasons = [];
  if (isBlank) reasons.push("blank body");
  if (isOnlyLink) reasons.push("only a link");
  if (isTooShort) reasons.push("body too short");
  if (isOnlyBlockquotes) reasons.push("body is only blockquotes");
  if (isOnlyImages) reasons.push("body is only images");
  if (isQuotedOtherIssue) reasons.push("quote of another issue");
  if (isCensoredSpam) reasons.push("censored spam placeholder");
  if (badDomainHit) reasons.push(`contains banned domain: ${badDomainHit}`);

  if (reasons.length) {
    return { isSpam: true, score: 99, reasons, sections: [] };
  }

  // --- Template-aware parsing ---
  const sectionsAll = splitSections(body);
  const sections = sectionsAll.filter(
    (s) => !cfg.ignoredSections.includes(s.title.toLowerCase()),
  );

  // Normalize answers
  const answers = sections.map((s) => s.answer);
  const normalized = answers.map(normText).filter(Boolean);

  // Counts
  const minimalCount = answers.filter(isMinimalContent).length;
  const linkOnlyCount = answers.filter(isLinkOnly).length;
  const imageOnlyCount = answers.filter(isImageOnly).length;

  // Detect strong sections
  const sectionStats = answers.map((a) => {
    const t = normText(a);
    const tokens = t ? t.split(/\s+/).filter(Boolean) : [];
    return { len: t.length, tokens: tokens.length };
  });
  const strongSections = sectionStats.filter(
    (st) =>
      st.len >= cfg.strongSectionMinChars ||
      st.tokens >= cfg.strongSectionMinTokens,
  ).length;

  // Repetition / low-entropy
  const joined = normalized.join(" ");
  const entropy = shannonEntropy(joined);
  const tokens = joined.split(/\W+/).filter(Boolean);
  const uniqueRatio = tokens.length ? new Set(tokens).size / tokens.length : 0;

  // Canonicalize before counting repeats (so "Duplicate of #27058/#27059" collapse)
  const counts = new Map();
  for (const a of answers) {
    const canon = canonicalizeForRepeat(a);
    if (!canon || canon === "no response") continue;
    // If there is a strong section, ignore repeats of short boilerplate
    if (strongSections > 0 && canon.length <= 50) continue;
    counts.set(canon, (counts.get(canon) || 0) + 1);
  }
  const maxRepeat = Math.max(0, ...counts.values());

  // Score
  let score = 0;
  let detail = [];

  if (strongSections == 0 && minimalCount >= 2) {
    score += minimalCount;
    detail.push(`${minimalCount} minimal answers`);
  }
  if (linkOnlyCount >= 2) {
    score += linkOnlyCount;
    detail.push(`${linkOnlyCount} link-only answers`);
  }
  if (imageOnlyCount >= 2) {
    score += imageOnlyCount;
    detail.push(`${imageOnlyCount} image-only answers`);
  }
  if (maxRepeat >= 2) {
    score += maxRepeat;
    detail.push(`same answer repeated ${maxRepeat} times (canonical)`);
  }
  if (entropy < cfg.entropyFloor) {
    score += 1;
    detail.push(`low entropy (${entropy.toFixed(2)})`);
  }
  if (uniqueRatio < cfg.uniqueTokenFloor) {
    score += 1;
    detail.push(`low unique-token ratio (${uniqueRatio.toFixed(2)})`);
  }

  const hasSections = sections.length >= 2;
  const junkCount = minimalCount + linkOnlyCount;
  if (
    hasSections &&
    junkCount >= Math.ceil(sections.length * cfg.sectionMinJunkRatio)
  ) {
    score += 2;
    detail.push(`most sections are minimal/link-only`);
  }

  return {
    isSpam:
      score >= (hasSections ? cfg.spamThreshold : cfg.nonTemplateThreshold),
    score,
    reasons: detail,
    sections,
  };
}

/* ----------------- helpers ----------------- */

function removeHtmlComments(s) {
  return (s || "").replace(/<!--[\s\S]*?-->/g, "");
}

function isLinkOnly(s) {
  const raw = removeHtmlComments(s || "").trim();
  if (!raw) return false;

  // Unwrap optional quotes/backticks around the whole section
  const unwrapped = raw.replace(/^['"`]\s*([\s\S]*?)\s*['"`]$/m, "$1").trim();

  // Remove markdown *image* links first (so images don't look like links)
  let tmp = unwrapped.replace(
    /!\[[^\]]*]\(\s*https?:\/\/[^)\s]+(?:\s+"[^"]*")?\s*\)/gim,
    " ",
  );

  // Count markdown links and raw URLs before stripping
  const mdLinkCount = (
    tmp.match(/\[[^\]]*]\(\s*https?:\/\/[^)\s]+(?:\s+"[^"]*")?\s*\)/gim) || []
  ).length;
  const rawUrlCount = (tmp.match(/https?:\/\/[^\s)]+/gim) || []).length;
  const hadAnyLink = mdLinkCount + rawUrlCount > 0;

  // Remove markdown links and raw URLs
  tmp = tmp
    .replace(/\[[^\]]*]\(\s*https?:\/\/[^)\s]+(?:\s+"[^"]*")?\s*\)/gim, " ")
    .replace(/https?:\/\/[^\s)]+/gim, " ");

  // Strip punctuation/whitespace leftovers
  const leftover = tmp.replace(/[\s.,;:!?"'(){}\[\]<>-]+/g, " ").trim();

  return hadAnyLink && leftover.length === 0;
}

function isImageOnly(s) {
  const noComments = removeHtmlComments(s || "").trim();
  if (!noComments) return false;

  // Strip markdown images: ![alt](url "title")
  let stripped = noComments.replace(
    /!\[[^\]]*]\(\s*https?:\/\/[^)\s]+(?:\s+"[^"]*")?\s*\)/gim,
    " ",
  );

  // Strip HTML <img> tags, optionally wrapped in <a>
  stripped = stripped
    .replace(/<a[^>]*>\s*<img[^>]*>\s*<\/a>/gim, " ")
    .replace(/<img[^>]*>/gim, " ");

  // Remove trivial whitespace/punctuation artifacts
  stripped = stripped.replace(/[\s.,;:!?"'(){}\[\]<>-]+/g, " ").trim();

  // If nothing meaningful remains, it was image-only
  return stripped.length === 0;
}

// Body is only blockquotes (ignoring blank lines and comments)
function bodyOnlyBlockquotes(s) {
  const noComments = removeHtmlComments(s || "");
  const lines = noComments
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return false;
  return lines.every(
    (l) => l.startsWith(">") || /^_?Originally posted by @/i.test(l),
  );
}

// NEW: Body is only images (markdown and/or HTML), possibly multiple
function bodyOnlyImages(s) {
  const noComments = removeHtmlComments(s || "").trim();
  if (!noComments) return false;
  // Remove markdown images: ![alt](url "title")
  let stripped = noComments
    .replace(/!\[[^\]]*\]\(\s*https?:\/\/[^)]+\)/gim, "")
    .trim();
  // Remove HTML <img> tags (with optional wrapping <a>)
  stripped = stripped
    .replace(/<a[^>]*>\s*<img[^>]*>\s*<\/a>/gim, "")
    .replace(/<img[^>]*>/gim, "")
    .trim();
  // Remove purely decorative line breaks
  stripped = stripped.replace(/^[>\s-]*$/gim, "").trim();
  return stripped.length === 0;
}

// Split on "### Heading" sections (common in GitHub issue forms)
function splitSections(markdown) {
  const lines = (markdown || "").split(/\r?\n/);
  const sections = [];
  let current = null;

  const push = () => {
    if (current) {
      current.answer = current.answer.join("\n").trim();
      sections.push(current);
    }
  };

  for (const line of lines) {
    if (/^###\s+/.test(line)) {
      push();
      const title = line.replace(/^###\s+/, "").trim();
      current = { title, answer: [] };
    } else {
      if (!current) current = { title: "Body", answer: [] };
      current.answer.push(line);
    }
  }
  push();
  return sections;
}

function stripMarkdown(s) {
  return (s || "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/`{1,3}[\s\S]*?`{1,3}/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // markdown images
    .replace(/<img[^>]*>/g, "") // html images
    .replace(/<[^>]+>/g, " ") // ANY html tags (e.g., <div ...>)
    .replace(/^>\s?.*$/gm, " ") // drop blockquote lines entirely
    .replace(/\[([^\]]+)\]\((.*?)\)/g, "$1") // links -> text
    .replace(/[*_#>~\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normText(s) {
  return stripMarkdown(s).toLowerCase();
}

// Canonicalize text for repeat detection (strip issue numbers & GH URLs)
function canonicalizeForRepeat(s) {
  return normText(s)
    .replace(/#\d+/g, "#num")
    .replace(/https?:\/\/github\.com\/[^\s)]+/g, "github_url")
    .replace(/\s+/g, " ")
    .trim();
}

function isMinimalContent(s) {
  const t = normText(s);
  if (!t) return true;
  // NOTE: keeping your current “No response” rule disabled to avoid FPs
  if (/^duplicate of\s+#\d+\s*$/i.test(t)) return true; // treat as minimal
  if (["n/a", "na", "none", "nil", "-", "--", ".", "…"].includes(t))
    return true;
  if (/^\p{Emoji}+$/u.test(t)) return true;
  if (t.length <= 10) return true;
  return false;
}

// NEW: check for banned domains (both raw URLs and inside markdown links)
function containsBadDomain(body, domains) {
  if (!domains?.length) return null;
  const lower = (body || "").toLowerCase();
  const flat = domains.map((d) => d.toLowerCase().replace(/^www\./, ""));
  // Quick substring check first
  for (const d of flat) {
    if (lower.includes(d)) return d;
  }
  // More precise: extract URLs from markdown and raw text and test hostnames
  const urls = [];
  const mdLinks = [...lower.matchAll(/\[[^\]]*]\((https?:\/\/[^)\s]+)\)/g)];
  for (const m of mdLinks) urls.push(m[1]);
  const raws = [...lower.matchAll(/https?:\/\/[^\s)]+/g)];
  for (const m of raws) urls.push(m[0]);
  try {
    for (const u of urls) {
      const host = new URL(u).hostname.replace(/^www\./, "");
      if (flat.includes(host)) return host;
    }
  } catch {}
  return null;
}

function shannonEntropy(s) {
  if (!s) return 0;
  const freq = Object.create(null);
  for (const ch of s) freq[ch] = (freq[ch] || 0) + 1;
  const len = s.length;
  let H = 0;
  for (const k in freq) {
    const p = freq[k] / len;
    H -= p * Math.log2(p);
  }
  return H;
}

export default detectSpam;
