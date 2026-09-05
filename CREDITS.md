# Credits

Griffdive stands on the work of the Helldivers community. Thank you.

## Equipment data + default tiers

- Source: [Selenestica/hd2-random-strat](https://github.com/Selenestica/hd2-random-strat) by
  Selenestica — MIT license.
- Vendored snapshot: `scripts/upstream/`, upstream commit
  `9c4a8aaffd83385a2ca85d1105adfe9c9afe430b`.
- Converted to the Griffdive schema by `scripts/import-catalog.mjs` into `shared/data/`.
  Regenerate with: `node scripts/import-catalog.mjs`.

## Stratagem icons

- [Nvigneux/Helldivers-2-Stratagems-icons-svg](https://github.com/nvigneux/Helldivers-2-Stratagems-icons-svg).
- Bundled in `public/images/svgs/` (imported via the Penitent Crusade asset bundle); resolved to
  URLs by `shared/data/images.ts`.

## Equipment images

- [helldivers.wiki.gg](https://helldivers.wiki.gg/wiki/Helldivers_2).
- Bundled in `public/images/{equipment,armor,armorpassives,warbonds}/` (imported via the Penitent
  Crusade asset bundle); resolved to URLs by `shared/data/images.ts`.
- These are Arrowhead/Sony game renders reproduced for non-commercial fan use; see Intellectual
  property below.

## Fonts

- Body/UI typeface: [Chakra Petch](https://fonts.google.com/specimen/Chakra+Petch) by Cadson Demak —
  SIL Open Font License 1.1. Free stand-in for Helldivers 2's FS Sinclair (Monotype).
- Display typeface: [Archivo](https://fonts.google.com/specimen/Archivo) by Omnibus-Type —
  SIL Open Font License 1.1 (bundled with the font file in `public/fonts/`). Free stand-in for
  Helldivers 2's Swiss 721, used with `font-stretch: 125%` (Archivo's width axis reaches 125%,
  approximating Swiss 721 Extended).

## Game systems inspiration

- [Penitent Crusade](https://helldivers2challenges.com/penitentcrusade/) campaign ladder
  (hd2-random-strat, MIT).
- The community Wheel of Misfortune challenge video (see AGENTS.md design north star).
- Hades' Pact of Punishment risk economy, Deep Rock Galactic mutator design, Dead Cells
  cursed-biome legibility, Balatro rarity-class guarantees, Slay the Spire 2 co-op risk model.

## Intellectual property

Griffdive is a fan project. Helldivers and Helldivers 2 are trademarks of Sony Interactive
Entertainment / Arrowhead Game Studios. Griffdive is not affiliated with or endorsed by them.
Non-commercial, no ads, no monetization.
