// What the executable files of the Umka plugin share: the branch of the checkout, which
// link is a GitHub issue of the repository, the issues an issue names under a heading,
// the tickets of a spec issue, and `gh`. Each runs with the checkout as its working
// directory, told the spec issues by the host as arguments.
const { execFileSync } = require("node:child_process");
const { readFileSync, statSync } = require("node:fs");
const path = require("node:path");

const LABEL = "umka";
// The exit code with which the pick declines: the spec issue is no case of the pick
// script, so the agent picks.
const DECLINED = 3;
// A link, as the host reads one: a web address starting with `https://`, with no space
// and none of the characters that end a link in Slack.
const LINK = /^https:\/\/[^\s<>|]+$/;
// The most issues with the label that one listing reads.
const LIST_LIMIT = 1000;

// What a program printed, with what it wrote to the standard error shown as it is.
const run = (file, args, input) =>
  execFileSync(file, args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: [input === undefined ? "ignore" : "pipe", "pipe", "inherit"],
    ...(input !== undefined && { input }),
  });

const gh = (...args) => JSON.parse(run("gh", args));

// The branch of the checkout, read from the `HEAD` of its git folder, which a worktree
// names in its file `.git`.
function branch() {
  const dotGit = path.resolve(".git");
  const gitDir = statSync(dotGit).isDirectory()
    ? dotGit
    : path.resolve(
        readFileSync(dotGit, "utf8")
          .replace(/^gitdir:\s*/, "")
          .trim(),
      );
  const head = readFileSync(path.join(gitDir, "HEAD"), "utf8").trim();
  const [, name] = /^ref: refs\/heads\/(.+)$/.exec(head) ?? [];
  if (!name) throw new Error("the checkout is on no branch");
  return name;
}

// The number of a GitHub issue of the repository, when a link is one: the address that
// `gh repo view --json url` prints, followed by `/issues/<n>`, as the link is written.
// Any other link, of another repository, of a pull request or of another tracker, is
// none, and the rule tells no more about it. The address is asked of `gh` when it is
// not given.
function repositoryIssue(link, url = gh("repo", "view", "--json", "url").url) {
  if (!link.startsWith(`${url}/issues/`)) return;
  const [, number] =
    /^\/issues\/([1-9]\d*)$/.exec(link.slice(url.length)) ?? [];
  return number === undefined ? undefined : Number(number);
}

// The numbers of the issues of its own repository that an issue names under a heading of
// its body: as `#12`, as `acme/app#12`, or by their address, bare or as the target of a
// link. The section of a heading ends at the next heading of its level or above. An issue
// of another repository is not among them, whatever the text of its link says.
function issuesUnder(issue, heading) {
  const lines = issue.body.split(/\r?\n/);
  const start = lines.findIndex((line) =>
    new RegExp(`^#{1,6}\\s+${heading}:?\\s*$`, "i").test(line),
  );
  if (start < 0) return [];
  const level = /^#+/.exec(lines[start])[0].length;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) =>
    new RegExp(`^#{1,${level}}\\s`).test(line),
  );
  const section = rest.slice(0, end < 0 ? rest.length : end).join("\n");
  const withoutScheme = (url) => url.replace(/^https?:\/\//i, "").toLowerCase();
  const repository = withoutScheme(issue.url.replace(/\/issues\/\d+$/, ""));
  const slug = repository.split("/").slice(-2).join("/");
  const numbers = [];
  const withoutReferences = section
    .replace(/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/gi, " $1 ")
    .replace(/https?:\/\/[^\s)>\]]+/gi, (url) => {
      const [, address, number] =
        /^(.+?)\/(?:issues|pull)\/(\d+)(?:\W.*)?$/.exec(withoutScheme(url)) ??
        [];
      if (address === repository) numbers.push(Number(number));
      return " ";
    })
    .replace(/([\w.-]+\/[\w.-]+)#(\d+)(?!\w)/g, (_, of, number) => {
      if (of.toLowerCase() === slug) numbers.push(Number(number));
      return " ";
    });
  for (const [, number] of withoutReferences.matchAll(
    /(?<![\w/])#(\d+)(?!\w)/g,
  ))
    numbers.push(Number(number));
  return numbers;
}

const oneLine = (text) => text.replace(/\s+/g, " ").trim();

// The issues with the label of the tickets that are in a state, with the fields given.
const labelled = (state, fields) =>
  gh(
    "issue",
    "list",
    "--label",
    LABEL,
    "--state",
    state,
    "--limit",
    String(LIST_LIMIT),
    "--json",
    fields,
  );

// Whether an issue is a ticket of a spec issue: its `## Parent` heading names it.
const ticketOf = (spec) => (issue) =>
  issuesUnder(issue, "Parent").includes(spec);

module.exports = {
  DECLINED,
  LINK,
  oneLine,
  labelled,
  ticketOf,
  run,
  gh,
  branch,
  repositoryIssue,
  issuesUnder,
};
