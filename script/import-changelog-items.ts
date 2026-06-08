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

type IncomingItem = {
  title: string;
  description: string;
  type?: ChangelogItemType;
  visibility?: "public" | "internal";
  issue?: string;
  release?: string;
};

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

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function parseItems(value: string | null) {
  if (!value) {
    throw new Error("Provide items with --items-json or CHANGELOG_ITEMS_JSON.");
  }

  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Feature payload must be a JSON array.");
  }

  return parsed as IncomingItem[];
}

function findOrCreateRelease(data: ChangelogData, version: string) {
  let release = data.releases.find((candidate) => candidate.version === version);

  if (!release) {
    release = {
      version,
      releasedAt: version === "Unreleased" ? null : new Date().toISOString().slice(0, 10),
      summary: "Release notes pending summary.",
      items: [],
    };
    data.releases.unshift(release);
  }

  return release;
}

async function main() {
  const items = parseItems(getArgValue("items-json") ?? process.env.CHANGELOG_ITEMS_JSON ?? null);
  const defaultRelease = getArgValue("release") || "Unreleased";
  const today = new Date().toISOString().slice(0, 10);
  const data = JSON.parse(await readFile(changelogPath, "utf8")) as ChangelogData;

  for (const incoming of items) {
    if (!incoming.title || !incoming.description) {
      throw new Error("Every imported feature needs title and description.");
    }

    const type = incoming.type ?? "feature";
    if (!validTypes.has(type)) {
      throw new Error(`Invalid changelog type: ${type}`);
    }

    const release = findOrCreateRelease(data, incoming.release ?? defaultRelease);
    const id = `cl-${today}-${slugify(incoming.title)}`;

    if (release.items.some((item) => item.id === id)) {
      continue;
    }

    release.items.push({
      id,
      title: incoming.title,
      description: incoming.description,
      type,
      visibility: incoming.visibility ?? "public",
      dateAdded: today,
      links: incoming.issue ? [{ label: "Issue", url: incoming.issue }] : [],
    });
  }

  await writeFile(changelogPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`Imported ${items.length} changelog item(s).`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
