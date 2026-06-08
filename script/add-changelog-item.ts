import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type ChangelogItemType =
  | "feature"
  | "improvement"
  | "fix"
  | "docs"
  | "breaking"
  | "internal";

type ChangelogItem = {
  id: string;
  title: string;
  description: string;
  type: ChangelogItemType;
  visibility: "public" | "internal";
  dateAdded: string;
  links: { label: string; url: string }[];
};

type ChangelogRelease = {
  version: string;
  releasedAt: string | null;
  summary: string;
  items: ChangelogItem[];
};

type ChangelogData = {
  releases: ChangelogRelease[];
};

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, "..");
const changelogPath = path.join(repoRoot, "shared", "changelog.json");
const validTypes = new Set([
  "feature",
  "improvement",
  "fix",
  "docs",
  "breaking",
  "internal",
]);

function getArgValue(name: string) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) {
    return inline.slice(prefix.length);
  }

  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

function requireArg(name: string) {
  const value = getArgValue(name);
  if (!value) {
    throw new Error(`Missing required --${name} value.`);
  }

  return value;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

async function main() {
  const title = requireArg("title");
  const description = requireArg("description");
  const type = (getArgValue("type") ?? "feature") as ChangelogItemType;
  const visibility = getArgValue("visibility") === "internal" ? "internal" : "public";
  const releaseVersion = getArgValue("release") ?? "Unreleased";
  const issueUrl = getArgValue("issue");
  const today = new Date().toISOString().slice(0, 10);

  if (!validTypes.has(type)) {
    throw new Error(`Invalid --type value: ${type}`);
  }

  const data = JSON.parse(await readFile(changelogPath, "utf8")) as ChangelogData;
  let release = data.releases.find((candidate) => candidate.version === releaseVersion);

  if (!release) {
    release = {
      version: releaseVersion,
      releasedAt: releaseVersion === "Unreleased" ? null : today,
      summary: "Release notes pending summary.",
      items: [],
    };
    data.releases.unshift(release);
  }

  const item: ChangelogItem = {
    id: `cl-${today}-${slugify(title)}`,
    title,
    description,
    type,
    visibility,
    dateAdded: today,
    links: issueUrl ? [{ label: "Issue", url: issueUrl }] : [],
  };

  release.items.push(item);
  await writeFile(changelogPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`Added ${item.id} to ${release.version}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
