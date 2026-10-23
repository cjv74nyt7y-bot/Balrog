# Flee the Balrog: Roblox edition

A round-based Roblox climbing game based on the web game in this repo.
Everyone drops into a deep shaft. Lava rises from below with the Balrog riding on it, and you have to climb
the ledges to the golden **Escape Gate** at the top before the fire reaches you.

## Play it now

1. Open **`FleeTheBalrog.rbxlx`** in Roblox Studio (File → Open from File).
2. Press **Play**.

The lobby, the shaft, the lighting and the HUD are all built by scripts, so the place file needs nothing else.

To keep Runes and Wins between sessions in Studio, turn on
**Game Settings → Security → Enable Studio Access to API Services**. Without it the game still runs; it just
won't save.

## How a round works

| Phase | What happens |
|-------|--------------|
| Intermission (15 s) | Everyone waits in the lobby |
| Climb (up to 3 min) | A new random shaft is built and everyone is dropped in. After 8 s the lava starts rising, faster and faster |
| Escape | Touch the Escape Gate: **+1 Win, +25 Runes**, and you go back to the lobby |
| Caught | Lava or embers kill you, and you respawn in the lobby to wait for the next round |

- **Runes**: blue glowing pickups on the ledges, +1 each. They are saved on the leaderboard.
- **Embers**: fireballs drop on climbers and do 20 damage. More of them fall as the round goes on.
- **Crumbling ledges** (cracked, reddish): they drop away a moment after you land on them and come back 3 s later. There are more of them higher up.
- **Ward** (press **E**, the gamepad **X** button or the on-screen button on mobile): destroys every ember near you. 12 s cooldown.

The HUD shows the round status and timer, a climb meter (gold dot is you, orange is the lava), how far you are
from the gate and the fire, and a red glow when the lava gets close.

## Tuning

All the numbers are in `src/shared/Config.luau`: shaft height, lava speed, number of embers and runes, rewards,
ward cooldown and round times.

## Project layout (Rojo)

```
default.project.json          Rojo project (maps src/ into the game)
src/shared/Config.luau        → ReplicatedStorage.Shared.Config
src/server/GameManager.server.luau   round loop, hazards, pickups, ward (Script)
src/server/ShaftBuilder.luau  builds each round's random shaft, lava and Balrog
src/server/World.luau         lobby and lighting
src/server/DataService.luau   leaderstats and DataStore saving
src/client/Hud.client.luau    HUD and ward input (LocalScript)
```

To work with live sync, install [Rojo](https://rojo.space) 7.4+, run `rojo serve`, and connect from the Rojo
Studio plugin. After you change the code, run `rojo build default.project.json -o FleeTheBalrog.rbxlx` to rebuild the
place file.

## Publishing

In Studio: **File → Publish to Roblox**, then in Game Settings turn on API Services so DataStores work in live
servers. For more players in each server, raise **Max Players** in the place settings. Rounds work for any number of players.
