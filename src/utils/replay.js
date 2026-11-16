// Turns the raw turn log of a finished game into plain-English steps,
// a few summary numbers, and the scoreboard at any point in the game.

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// turns: the `turns` array returned by api.history.gameReplay
// powerUpInfo: { shield: { name: "Shield" }, ... } so IDs read as names
export function buildReplay(turns, powerUpInfo = {}) {
  const powerUpName = (id) => powerUpInfo[id]?.name ?? id;

  // What each seat had before the turn being described
  const runningBefore = {};
  const totalBefore = {};

  const stats = {
    rolls: 0,
    busts: 0,
    shieldSaves: 0,
    banks: 0,
    powerUps: 0,
    biggestBank: null, // { who, points }
  };

  const steps = turns.map((t, i) => {
    const running = runningBefore[t.seat] ?? 0;
    const total = totalBefore[t.seat] ?? 0;
    const who = t.isMe ? "You" : t.name;
    const parts = (t.detail ?? "").split(", ").filter(Boolean);
    let kind = "neutral";
    let text = "";

    if (t.action === "pass") {
      stats.banks += 1;
      if (!stats.biggestBank || running > stats.biggestBank.points) {
        stats.biggestBank = { who, points: running };
      }
      text = `${who} banked ${plural(running, "point")} (total ${t.totalAfter})`;
    } else if (t.action === "powerUp") {
      stats.powerUps += 1;
      kind = "power";
      text = `${who} used ${powerUpName(t.detail)}`;
    } else {
      stats.rolls += 1;
      if (t.value === 1) {
        if (parts.includes("shield saved the turn")) {
          stats.shieldSaves += 1;
          kind = "good";
          text = `${who} rolled a 1, but a Shield saved the turn`;
        } else {
          stats.busts += 1;
          kind = "bad";
          text =
            running > 0
              ? `${who} rolled a 1 and lost ${plural(running, "running point")}`
              : `${who} rolled a 1 and the turn ended`;
        }
      } else {
        // The winning roll moves everything into the total, so work the gain out from that
        const gained = t.isWinningRoll
          ? t.totalAfter - total - running
          : t.runningAfter - running;
        const earned = parts.find((p) => p.startsWith("earned "))?.slice("earned ".length);
        text = `${who} rolled a ${t.value}`;
        if (parts.includes("doubled")) text += `, doubled to +${gained}`;
        if (t.isWinningRoll) {
          kind = "win";
          text += ` and reached ${t.totalAfter} points to win the game`;
        } else if (earned) {
          text += ` and earned ${powerUpName(earned)}`;
        }
      }
    }

    runningBefore[t.seat] = t.runningAfter;
    totalBefore[t.seat] = t.totalAfter;
    return { ...t, number: i + 1, kind, text };
  });

  return { steps, stats };
}

// Every player's total and running points after the first `n` turns of the game
export function scoresAt(players, turns, n) {
  const state = new Map(players.map((p) => [p.seat, { total: 0, running: 0 }]));
  for (let i = 0; i < n; i++) {
    const t = turns[i];
    state.set(t.seat, { total: t.totalAfter, running: t.runningAfter });
  }
  return players.map((p) => ({ ...p, ...state.get(p.seat) }));
}
