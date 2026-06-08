import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type ChangelogItem = {
  id: string;
  title: string;
  description: string;
  type: "feature" | "improvement" | "fix" | "docs" | "breaking" | "internal";
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

const TYPE_HEADINGS: Record<ChangelogItem["type"], string> = {
  feature: "Added",
  improvement: "Improved",
  fix: "Fixed",
  docs: "Documentation",
  breaking: "Breaking Changes",
  internal: "Internal",
};

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, "..");
const changelogPath = path.join(repoRoot, "shared", "changelog.json");

function getArgValue(name: string) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) {
    return inline.slice(prefix.length);
  }

  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

function formatDate(date: string | null) {
  if (!date) {
    return "Unreleased";
  }

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function groupPublicItems(items: ChangelogItem[]) {
  return items
    .filter((item) => item.visibility === "public")
    .reduce<Record<string, ChangelogItem[]>>((groups, item) => {
      const heading = TYPE_HEADINGS[item.type];
      groups[heading] = [...(groups[heading] ?? []), item];
      return groups;
    }, {});
}

function renderItems(items: ChangelogItem[]) {
  return items
    .map((item) => {
      const links =
        item.links.length === 0
          ? ""
          : ` ${item.links.map((link) => `[${link.label}](${link.url})`).join(" ")}`;
      return `- ${item.title}: ${item.description}${links}`;
    })
    .join("\n");
}

function renderRelease(release: ChangelogRelease) {
  const groups = groupPublicItems(release.items);
  const sections = Object.entries(groups)
    .map(([heading, items]) => `### ${heading}\n\n${renderItems(items)}`)
    .join("\n\n");

  const heading =
    release.version === "Unreleased"
      ? "## Unreleased"
      : `## ${release.version} - ${formatDate(release.releasedAt)}`;

  return [heading, release.summary, sections].filter(Boolean).join("\n\n");
}

async function main() {
  const raw = await readFile(changelogPath, "utf8");
  const data = JSON.parse(raw) as ChangelogData;
  const publicReleases = data.releases.filter((release) =>
    release.items.some((item) => item.visibility === "public"),
  );

  const changelog = [
    "# Changelog",
    "All notable public changes to ChantLive are generated from `shared/changelog.json`.",
    "Use GitHub Issues and pull requests for implementation details, then add approved user-facing changes to the structured changelog data before a release.",
    ...publicReleases.map(renderRelease),
  ].join("\n\n");

  await writeFile(path.join(repoRoot, "CHANGELOG.md"), `${changelog}\n`, "utf8");

  const requestedVersion = getArgValue("version");
  const release =
    data.releases.find((candidate) => candidate.version === requestedVersion) ??
    publicReleases.find((candidate) => candidate.version !== "Unreleased");

  if (!release) {
    throw new Error("No public release found for release notes.");
  }

  const notesDir = path.join(repoRoot, "docs", "release-notes");
  await mkdir(notesDir, { recursive: true });
  await writeFile(
    path.join(notesDir, `${release.version}.md`),
    `${renderRelease(release)}\n`,
    "utf8",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
