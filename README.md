# Flee the Balrog

A touch-friendly arcade game for iPad (also works on phones and desktop browsers).
Climb out of the deep while dodging embers, boulders, icy drips, crystal shards, bats and the fire whip.

## Realms

| # | Realm | Goal | New danger |
|---|-------|------|------------|
| 1 | The Bridge of Embers | 300 fathoms | Embers, boulders, the fire whip |
| 2 | The Flooded Halls | 400 fathoms | Icy drips |
| 3 | The Mithril Veins | 500 fathoms | Crystal shards |
| 4 | The Glowing Grotto | 600 fathoms | Bats that sweep across the shaft |
| 5 | The Burning Deep | 750 fathoms | Whip strikes again and again |
| ∞ | The Endless Stair | none | Everything at once, for a high score |

Clearing a realm opens the next one. Each realm has its own background.

## Wizards

Runes you collect are kept between runs. Spend them in **Wizards** on new looks: Halfling, Brown Herbalist,
Dwarf Warden, Elf Archer and Shadow Walker. White Rider, Blue Wanderer and Ember Mage join you when you
clear realms 1, 3 and 5.

## Play offline on iPad

1. Host the folder with GitHub Pages (Settings → Pages → Deploy from branch) or any web server.
2. Open the page once in Safari while online.
3. Tap **Share → Add to Home Screen**. The game then opens full screen and works with no connection.

`sw.js` caches every file. When you change a file, bump `VERSION` in `sw.js`.

## Controls

- **Drag anywhere** to move.
- **Tap ✦** (or touch with a second finger) to cast a ward that clears nearby hazards.
- Desktop: arrow keys / WASD to move, Space to ward, P to pause.
