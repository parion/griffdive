# Data catalog

> Part of the Griffdive docs set. Index: [`AGENTS.md`](../AGENTS.md).

- **Schema:** items are `{ id, displayName, type: 'equipment'|'stratagem', category, tags[],
  warbondCode, antitank?, tier }` with `tier ∈ 'c'|'b'|'a'|'s'` (community default tier list;
  tier-maker customization is post-v1). Optional fields: `index?` (upstream ordering), `imageURL?`
  (bare filename; resolved to `public/images/<dir>/` by `shared/data/images.ts`), and armor-passive
  extra `passive?`. The catalog has no armor pieces or armor stats — only passives matter. Categories: `primary secondary throwable booster armorPassive` (equipment) and
  stratagem categories (`Supply Eagle Orbital Defense` etc.).
- **Seed source:** constants from [Selenestica/hd2-random-strat](https://github.com/Selenestica/hd2-random-strat)
  (MIT) — vendored at `scripts/upstream/` (snapshot commit recorded there), converted to our
  schema by `node scripts/import-catalog.mjs` (re-run after every upstream refresh), attributed in
  `shared/data/` headers and CREDITS. The vendored snapshot spans every released warbond through
  **Scope of Authority** (`warbond28`). A catalog refresh that grows a reward or catch-up pool is
  expected to move the seeded golden replay — regenerate goldens (`GRIFFDIVE_UPDATE_GOLDENS=1 pnpm
  test`) instead of treating it as an engine regression.
  The importer regenerates raw JSON, so the committed `shared/data/*.ts` are the output of
  `node scripts/import-catalog.mjs` **followed by `eslint --fix`** (quote/format normalisation).
  Local corrections to a game-truth field (e.g. a wrong `antitank` flag) go in the importer's
  `ITEM_OVERRIDES`, keyed by item id, so a refresh re-applies them instead of reverting the
  generated data — never hand-edit `shared/data/equipment.ts`. Upstream sometimes corrects an item's
  `internalName`; because catalog ids are upstream names, such a rename is save-breaking and must
  ship with a `SAVE_SCHEMA_VERSION` bump plus an id-remap migration in `shared/engine/saves.ts`.
  Stratagem SVGs from [Nvigneux/Helldivers-2-Stratagems-icons-svg](https://github.com/nvigneux/Helldivers-2-Stratagems-icons-svg);
  equipment images from [helldivers.wiki.gg](https://helldivers.wiki.gg/wiki/Helldivers_2). Stratagem art ships as `.webp`
  in `public/images/svgs/` (directory name historical); the importer rewrites upstream's `.svg`
  `imageURL`s to `.webp`. Asset
  licensing: respect upstream terms; hot-link or bundle only what the licenses allow.
- **Versioning:** `CATALOG_VERSION` bumped whenever items/warbonds change (Helldivers 2 patches add
  warbonds). Saves record catalog + engine versions as diagnostics; the save-schema version drives
  the migration chain (see Save model). From alpha the schema is frozen — shape changes migrate
  rather than dropping docs.
