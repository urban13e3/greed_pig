import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Navbar from "src/components/Navbar";
import StatCard from "src/components/StatCard";
import formatDate from "src/utils/formatDate";
import { buildReplay, scoresAt } from "src/utils/replay";
import { POWER_UP_INFO } from "src/routes/room/roomHooks";

const STEP_MS = 1100; // time between steps while playing

const kindStyle = {
  neutral: "border-[#ffffff40] bg-[#ffffff10]",
  good: "border-[#4ade80] bg-[#4ade8020] text-[#bbf7d0]",
  bad: "border-[#E71D36] bg-[#E71D3620] text-[#F17E8C]",
  power: "border-[#D30CBD] bg-[#D30CBD30]",
  win: "border-[#FFD700c0] bg-[#FFD70010] text-[#FFEA70]",
};

const buttonBase =
  "rounded px-4 py-2 border border-[#ffffff60] duration-300 disabled:opacity-40";
const secondary = "bg-[#ffffff15] hover:bg-[#ffffff30]";
const primary = "bg-[#056FA4c0] hover:bg-[#056FA4]";

function ResultBadge({ won }) {
  return (
    <span
      className={`rounded px-3 py-1 text-sm font-bold ${
        won ? "bg-[#4ade8030] text-[#bbf7d0]" : "bg-[#E71D3630] text-[#F17E8C]"
      }`}
    >
      {won ? "You won" : "You lost"}
    </span>
  );
}

function Replay({ data }) {
  const { steps, stats } = useMemo(
    () => buildReplay(data.turns, POWER_UP_INFO),
    [data.turns],
  );
  const total = steps.length;
  const [step, setStep] = useState(total); // how many turns have been played
  const [playing, setPlaying] = useState(false);
  const activeRef = useRef(null);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setStep((s) => Math.min(s + 1, total)), STEP_MS);
    return () => clearInterval(id);
  }, [playing, total]);

  useEffect(() => {
    if (playing && step >= total) setPlaying(false);
  }, [playing, step, total]);

  // Keep the current step on screen while it plays
  useEffect(() => {
    if (playing) {
      activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [playing, step]);

  const header = (
    <div className="w-full flex flex-col gap-2 items-center text-center">
      <ResultBadge won={data.won} />
      <p className="text-sm opacity-80">
        {formatDate(data.finishedAt)} · Room {data.code} · {data.maxPoints} max points
      </p>
    </div>
  );

  // Games finished before the turn log existed have nothing to replay
  if (total === 0) {
    return (
      <>
        {header}
        <p className="opacity-80 text-center">
          No turn-by-turn log was saved for this game. Here is how it ended:
        </p>
        <ul className="flex flex-wrap justify-center gap-2">
          {data.players.map((p) => (
            <li
              key={p.seat}
              className={`rounded border px-3 py-1 text-sm ${
                p.isWinner ? kindStyle.win : "border-[#ffffff40]"
              }`}
            >
              {p.name}
              {p.isMe ? " (you)" : ""}: {p.score}
              {p.isWinner ? " · Winner" : ""}
            </li>
          ))}
        </ul>
      </>
    );
  }

  const scores = scoresAt(data.players, data.turns, step);
  const current = step > 0 ? steps[step - 1] : null;
  const atEnd = step >= total;

  function jumpTo(n) {
    setPlaying(false);
    setStep(n);
  }

  function togglePlay() {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (atEnd) setStep(0);
    setPlaying(true);
  }

  return (
    <>
      {header}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
        <StatCard label="Rolls" value={stats.rolls} />
        <StatCard label="Busts" value={stats.busts} />
        <StatCard label="Banks" value={stats.banks} />
        <StatCard label="Power-ups used" value={stats.powerUps} />
      </div>
      {stats.biggestBank ? (
        <p className="text-sm opacity-80 text-center">
          Biggest bank: {stats.biggestBank.who} banked {stats.biggestBank.points} points.
          {stats.shieldSaves > 0
            ? ` A Shield saved the turn ${stats.shieldSaves === 1 ? "once" : `${stats.shieldSaves} times`}.`
            : ""}
        </p>
      ) : null}

      <div className="w-full rounded-lg border border-[#ffffff40] bg-[#ffffff10] p-4 flex flex-col gap-4">
        <p
          role="status"
          aria-live={playing ? "off" : "polite"}
          className="min-h-[3.5rem] text-center text-lg flex items-center justify-center"
        >
          {current ? current.text : "Press Play to watch the game from the start."}
        </p>

        <ul
          aria-label="Scores at this step"
          className="grid grid-cols-2 md:grid-cols-3 gap-2 w-full"
        >
          {scores.map((p) => {
            const crowned = atEnd && p.isWinner;
            const acting = current?.seat === p.seat;
            return (
              <li
                key={p.seat}
                className={`rounded-lg border p-3 ${
                  crowned
                    ? kindStyle.win
                    : acting
                      ? "border-white bg-[#ffffff30]"
                      : "border-[#ffffff40] bg-[#ffffff10]"
                }`}
              >
                <p className="font-semibold truncate">
                  {p.name}
                  {p.isMe ? " (you)" : ""}
                </p>
                <p className="pri-font text-2xl">{p.total}</p>
                <p className="text-xs opacity-80">
                  {p.running > 0 ? `+${p.running} running` : "no running points"}
                  {crowned ? " · Winner" : ""}
                </p>
              </li>
            );
          })}
        </ul>

        <label className="flex flex-col gap-1 text-sm">
          <span>
            Step {step} of {total}
          </span>
          <input
            type="range"
            min={0}
            max={total}
            value={step}
            onChange={(e) => jumpTo(Number(e.target.value))}
            aria-valuetext={`Step ${step} of ${total}`}
            className="w-full accent-[#d30cbc]"
          />
        </label>

        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => jumpTo(step - 1)}
            disabled={step === 0}
            className={`${buttonBase} ${secondary}`}
          >
            Back
          </button>
          <button
            type="button"
            onClick={togglePlay}
            className={`${buttonBase} ${primary} font-bold min-w-[96px]`}
          >
            {playing ? "Pause" : atEnd ? "Replay" : "Play"}
          </button>
          <button
            type="button"
            onClick={() => jumpTo(step + 1)}
            disabled={atEnd}
            className={`${buttonBase} ${secondary}`}
          >
            Next
          </button>
        </div>
      </div>

      <h3 className="pri-font text-2xl self-start">Turn by turn</h3>
      <ol aria-label="Turn by turn timeline" className="flex flex-col gap-2 w-full">
        {steps.map((s, i) => {
          const isCurrent = i === step - 1;
          return (
            <li key={s.number} ref={isCurrent ? activeRef : null}>
              <button
                type="button"
                onClick={() => jumpTo(s.number)}
                aria-current={isCurrent ? "step" : undefined}
                className={`w-full text-left rounded-lg border px-3 py-2 flex items-center gap-3 duration-300 ${
                  kindStyle[s.kind]
                } ${isCurrent ? "ring-2 ring-white" : ""} ${i >= step ? "opacity-60" : ""}`}
              >
                <span className="text-xs opacity-80 w-8 shrink-0">#{s.number}</span>
                <span className="flex-1">{s.text}</span>
                <span className="text-xs opacity-80 whitespace-nowrap">
                  {s.totalAfter} total
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </>
  );
}

export default function GameReplay() {
  const { code: rawCode } = useParams();
  const code = (rawCode ?? "").toUpperCase();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const replay = useQuery(api.history.gameReplay, isAuthenticated ? { code } : "skip");

  let body;
  if (isLoading || (isAuthenticated && replay === undefined)) {
    body = (
      <p role="status" className="text-center opacity-80">
        Loading replay...
      </p>
    );
  } else if (!isAuthenticated) {
    body = (
      <div className="text-center grid justify-items-center gap-4">
        <p>Sign in to watch this replay.</p>
        <Link
          to={`/sign-in?next=/history/${code}`}
          className="sec-font rounded px-8 py-3 bg-[#d30cbcc0] font-bold hover:bg-[#d30cbc] duration-300"
        >
          Sign in / Sign up
        </Link>
      </div>
    );
  } else if (replay === null) {
    body = (
      <div className="text-center grid justify-items-center gap-4">
        <p role="alert">Replay not available.</p>
        <p className="opacity-80">
          Room {code} either has not finished yet or is not one of your games.
        </p>
      </div>
    );
  } else {
    body = <Replay key={replay.code} data={replay} />;
  }

  return (
    <div className="text-white">
      <Navbar />
      <section className="max-w-3xl mx-auto flex flex-col items-center gap-4 p-4 md:p-8">
        <Link to="/history" className="self-start text-sm underline hover:no-underline">
          &larr; Back to match history
        </Link>
        <h2 className="pri-font text-3xl md:text-4xl">Game Replay</h2>
        {body}
      </section>
    </div>
  );
}
