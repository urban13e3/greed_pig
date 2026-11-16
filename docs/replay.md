# Match replay

Lets a player watch a finished game again, one roll at a time. It builds on the match history page and the `turns` log that every roll, pass and power-up already writes to.

## What the player sees

- On **Match History**, each finished game has a **Watch replay** link. It opens `/history/<ROOM CODE>`.
- The replay page shows who won, a few numbers for the game (rolls, busts, banks, power-ups used, biggest bank), and a scoreboard.
- **Play**, **Pause**, **Back**, **Next** and a step slider move through the game. The scoreboard updates at every step.
- Below the controls is the full turn-by-turn list. Clicking a line jumps to that step.
- The page opens on the last step, so the final result is visible straight away. **Replay** starts it again from the beginning.

Every move is written in plain English, for example:

- `You rolled a 6 and earned Freeze`
- `Sam rolled a 1 and lost 14 running points`
- `Ada rolled a 1, but a Shield saved the turn`
- `You banked 18 points (total 52)`
- `Sam used Reverse`

## Rules

- Only players who were in the game can open its replay. Anyone else, and any game that is not finished, gets "Replay not available".
- No user ids are sent to the browser, only names and scores.
- Replay is read-only. It never changes a game.
- A game with no saved turns shows its final scores and a short message instead of controls.

## Where it lives in the code

| What | Where |
| --- | --- |
| Query that returns one game and its turns | `gameReplay` in `convex/history.js` |
| Turning turns into sentences, stats and step scores | `src/utils/replay.js` |
| The replay page | `src/routes/GameReplay.jsx` |
| Route | `history/:code` in `src/main.jsx` |
| Link from the history list | `src/routes/History.jsx` |
| Shared pieces moved out of `History.jsx` | `src/components/StatCard.jsx`, `src/utils/formatDate.js` |

## Accessibility

- All controls are real buttons with text labels, and the slider has a text label and value.
- The current step is announced in a polite live region. It is switched off while playing so a screen reader is not interrupted every second.
- The current line in the list is marked with `aria-current="step"` and a visible ring, not just colour.
- Loading and error messages use `role="status"` and `role="alert"`.
