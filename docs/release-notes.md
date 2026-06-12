# Release Notes Workflow

ChantLive uses `shared/changelog.json` as the canonical source for public release notes.

## Daily Feature Intake

- Create a GitHub Issue for each planned feature or daily automation item.
- Use labels such as `type:feature`, `type:improvement`, `public-changelog`, `internal-only`, and `release:next`.
- Keep implementation details in the issue or pull request.
- Add only approved user-facing wording to `shared/changelog.json`.
- Automation can append approved items with `npm run changelog:add -- --title "..." --description "..." --type feature --issue https://github.com/barsham/ChantLive/issues/123`.
- External daily automation can call the `release-items-created` repository dispatch event with an `items` array to store multiple new features at once.
- External scheduled runs should follow [daily-automation-guardrails.md](./daily-automation-guardrails.md) before reporting a deploy-ready commit.

Example repository dispatch payload:

```json
{
  "event_type": "release-items-created",
  "client_payload": {
    "release": "Unreleased",
    "items": [
      {
        "title": "Reusable chant templates",
        "description": "Organizers can start demonstrations faster with saved chant templates.",
        "type": "feature",
        "visibility": "public",
        "issue": "https://github.com/barsham/ChantLive/issues/123"
      }
    ]
  }
}
```

## Changelog Fields

- `id`: stable identifier for the change.
- `title`: short public title.
- `description`: one sentence that explains the user-visible impact.
- `type`: `feature`, `improvement`, `fix`, `docs`, `breaking`, or `internal`.
- `visibility`: `public` for website and release notes, `internal` for private tracking.
- `dateAdded`: date the feature was accepted into the changelog.
- `links`: related GitHub Issues, pull requests, or documentation.

## Preparing a Release

1. Move approved items from `Unreleased` into the target release in `shared/changelog.json`.
2. Set the release `version`, `releasedAt`, and `summary`.
3. Run `npm run changelog:generate -- --version <version>`.
4. Review `CHANGELOG.md`.
5. Use the generated `docs/release-notes/<version>.md` text for the GitHub Release.
6. Run `npm run check` and `npm run build`.
