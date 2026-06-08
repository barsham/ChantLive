import changelogData from "./changelog.json";

export type ChangelogItemType =
  | "feature"
  | "improvement"
  | "fix"
  | "docs"
  | "breaking"
  | "internal";

export type ChangelogVisibility = "public" | "internal";

export type ChangelogLink = {
  label: string;
  url: string;
};

export type ChangelogItem = {
  id: string;
  title: string;
  description: string;
  type: ChangelogItemType;
  visibility: ChangelogVisibility;
  dateAdded: string;
  links: ChangelogLink[];
};

export type ChangelogRelease = {
  version: string;
  releasedAt: string | null;
  summary: string;
  items: ChangelogItem[];
};

export type ChangelogData = {
  releases: ChangelogRelease[];
};

export const changelog = changelogData as ChangelogData;

export const publicReleases = changelog.releases
  .map((release) => ({
    ...release,
    items: release.items.filter((item) => item.visibility === "public"),
  }))
  .filter((release) => release.items.length > 0);

export function getLatestPublicRelease() {
  return publicReleases.find((release) => release.version !== "Unreleased") ?? null;
}
