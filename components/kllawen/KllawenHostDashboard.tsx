"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, Music2, Volume2, VolumeX, RotateCcw, Flag, Smartphone, Monitor, BookOpen, Shuffle, Crown, ArrowLeftRight, Dices, Hand, Users, Vote } from "lucide-react";
import { getOrCreateHostGameId, createNewHostGameId } from "@/lib/id";
import { useKllawenHost } from "@/hooks/useKllawenHost";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useBroadcastHostMode } from "@/hooks/useHostMode";
import { HostLobbyShell, HeaderButton, LobbyCard, SectionLabel, Divider, OptionCard, NumberSegment, ChipButton, InfoNote, StartButton } from "@/components/HostLobby";
import { type HostMode } from "@/components/GameModeSelector";
import { HatBoard } from "@/components/kllawen/HatRow";
import { TeamScoreboard, TeamScoreCard } from "@/components/kllawen/TeamScoreboard";
import { SeekActionBar } from "@/components/kllawen/SeekActionBar";
import { KllawenRulesModal } from "@/components/kllawen/KllawenRulesModal";
import { KllawenWinnerModal } from "@/components/kllawen/KllawenWinnerModal";
import { RoundIntro } from "@/components/kllawen/RoundIntro";
import { TossIntro, TossQuestionPanel, TossResultPanel } from "@/components/kllawen/TossQuestion";
import { TEAM_UI, describeMistake, describeResult, seekStakes } from "@/components/kllawen/kllawenUi";
import { playCorrectSound } from "@/lib/quizSound";
import { playHatEmpty, playHatSelect, playRingReveal, playKurdishVictory, playCountdownGo, kllawenMusic, warmUpKllawenAudio } from "@/lib/kllawenSound";
import { MAX_ROUNDS, MAX_TRIES, ROUND_PRESETS, TEAMS, TRIES_PRESETS, otherTeam, type Team } from "@/lib/kllawenChannel";

/** Toolbar button for the in-game screen (it grows with the TV via `.kl-tv`). */
function ToolButton({
  icon: Icon,
  label,
  onClick,
  active = false,
  activeClass = "",
  hoverClass = "hover:bg-gray-200 hover:text-gray-600",
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  active?: boolean;
  activeClass?: string;
  hoverClass?: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      title={label}
      className={`flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-2xl min-w-[4.5rem] px-3 h-16 transition-colors duration-200 cursor-pointer ${
        active ? activeClass : `bg-gray-100 text-gray-400 ${hoverClass}`
      }`}
    >
      <Icon className="w-6 h-6" strokeWidth={2.5} />
      <span className="text-xs font-bold leading-tight whitespace-nowrap">{label}</span>
    </motion.button>
  );
}

const isPresetRounds = (n: number) => (ROUND_PRESETS as readonly number[]).includes(n);
const isPresetTries = (n: number) => (TRIES_PRESETS as readonly number[]).includes(n);

export function KllawenHostDashboard({
  mode,
  onModeChange,
}: {
  mode: HostMode;
  onModeChange: (mode: HostMode) => void;
}) {
  useWakeLock();

  const [gameId, setGameId] = useState("");
  useEffect(() => setGameId(getOrCreateHostGameId()), []);
  useBroadcastHostMode(gameId, "kllawen");

  const {
    connected, roster, captains, captainVoteCounts, canStart, gameOver,
    phase, controlMode, setControlMode, teamMode, setTeamMode, totalRounds, setTotalRounds,
    maxTries, setMaxTries, triesLeft, wrongClaims, mistake,
    hiderTeam, scores, round, lifted, result, toss, tossStartedAt,
    setPlayerTeam, setCaptain, shuffleTeams,
    startGame, startFirstRound, hideRandom, seek, nextRound, endGame, resetGame,
  } = useKllawenHost(gameId);

  // In game, the whole screen grows with the TV (see `.kl-tv` in globals.css).
  const inLobby = phase === "LOBBY";
  useEffect(() => {
    if (inLobby) return;
    const html = document.documentElement;
    html.classList.add("kl-tv");
    return () => html.classList.remove("kl-tv");
  }, [inLobby]);

  const [joinUrl, setJoinUrl] = useState("");
  useEffect(() => {
    if (!gameId || typeof window === "undefined") return;
    setJoinUrl(`${window.location.origin}/play?gameId=${gameId}`);
  }, [gameId]);

  const handleNewGame = () => { resetGame(); setGameId(createNewHostGameId()); };

  /* ── Toolbar state ──────────────────────────────────────────────────── */
  const [musicOn, setMusicOn] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [selectedHat, setSelectedHat] = useState<number | null>(null);
  // The custom field stays empty while a preset is picked, so the value isn't shown twice.
  const [roundsInput, setRoundsInput] = useState(isPresetRounds(totalRounds) ? "" : String(totalRounds));
  useEffect(() => {
    setRoundsInput(prev => !isPresetRounds(totalRounds) ? String(totalRounds) : prev === String(totalRounds) ? prev : "");
  }, [totalRounds]);
  const [triesInput, setTriesInput] = useState(isPresetTries(maxTries) ? "" : String(maxTries));
  useEffect(() => {
    setTriesInput(prev => !isPresetTries(maxTries) ? String(maxTries) : prev === String(maxTries) ? prev : "");
  }, [maxTries]);
  // Sounds follow the state, so moves made from a captain's phone play here too.
  const prevLiftedRef = useRef(lifted.length);
  const prevPhaseRef = useRef(phase);
  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    const newEmpty = lifted.length > prevLiftedRef.current;
    if (soundOn) {
      if (prevPhase !== "ROUND_RESULT" && phase === "ROUND_RESULT" && result) {
        const fail = result.outcome === "miss" || result.outcome === "wrongClaim";
        // Last empty hat comes up first, then the ring's hat (autoFound).
        if (newEmpty) playHatEmpty(lifted.length);
        const reveal = () => playRingReveal(fail ? "fail" : result.outcome === "cut" ? "cut" : "found");
        if (newEmpty) setTimeout(reveal, 450); else reveal();
      } else if (newEmpty && phase === "SEEKING") {
        playHatEmpty(lifted.length);
      }
      if (prevPhase !== "TOSS_RESULT" && phase === "TOSS_RESULT") playCorrectSound();
      // The intro countdown ran out and play opens.
      if ((prevPhase === "ROUND_INTRO" && phase === "HIDING") || (prevPhase === "TOSS_INTRO" && phase === "TOSS_QUESTION")) playCountdownGo();
    }
    if (prevPhase !== "ENDED" && phase === "ENDED") {
      if (soundOn) playKurdishVictory();
      const cheer = new Audio("/audio/win-cheer.wav");
      cheer.volume = 0.6;
      cheer.play().catch(() => {});
    }
    if (prevPhase !== phase) setSelectedHat(null);
    prevLiftedRef.current = lifted.length;
    prevPhaseRef.current = phase;
  }, [phase, result, lifted.length, soundOn]);

  // One music engine scores the page like a game show: with 🔊, suspense while
  // the ring is hidden and sought; with 🎵, a thinking cue under the toss
  // question and the theme everywhere else. Reveals get a moment of silence,
  // then the theme comes back.
  useEffect(() => {
    if (soundOn && phase === "HIDING") { kllawenMusic.start("hiding"); return; }
    if (soundOn && phase === "SEEKING") { kllawenMusic.start("seeking"); return; }
    const reveal = phase === "ROUND_RESULT";
    if (musicOn && phase === "TOSS_QUESTION") { kllawenMusic.start("think"); return; }
    if (musicOn && !reveal && phase !== "ENDED") { kllawenMusic.start("theme"); return; }
    kllawenMusic.stop(reveal ? 0.15 : 0.6);
    if (musicOn && phase === "ROUND_RESULT") {
      const id = setTimeout(() => kllawenMusic.start("theme"), 3500);
      return () => clearTimeout(id);
    }
  }, [phase, soundOn, musicOn]);
  useEffect(() => kllawenMusic.setIntensity(lifted.length), [lifted.length]);
  useEffect(() => { warmUpKllawenAudio(); return () => kllawenMusic.stop(); }, []);

  const pickHat = (hat: number) => {
    if (soundOn) playHatSelect();
    setSelectedHat(hat);
  };

  const handleRoundsInput = (raw: string) => {
    setRoundsInput(raw);
    const v = parseInt(raw, 10);
    if (!isNaN(v) && v >= 1 && v <= MAX_ROUNDS) setTotalRounds(v);
  };

  const handleTriesInput = (raw: string) => {
    setTriesInput(raw);
    const v = parseInt(raw, 10);
    if (!isNaN(v) && v >= 1 && v <= MAX_TRIES) setMaxTries(v);
  };

  const RulesModal = <KllawenRulesModal open={showRules} onClose={() => setShowRules(false)} totalRounds={totalRounds} maxTries={maxTries} />;

  /* ═══════════════════════════════ LOBBY ═══════════════════════════════ */
  if (phase === "LOBBY") {
    const unassigned = roster.filter(p => !p.team);
    return (
      <HostLobbyShell
        accent="amber" icon="🎩" title="داشبۆردی کڵاوێن"
        connected={connected} playerCount={roster.length}
        mode={mode} onModeChange={onModeChange}
        gameId={gameId} joinUrl={joinUrl} onNewGame={handleNewGame}
        headerActions={
          <HeaderButton
            onClick={() => setShowRules(true)} title="یاسای یاری و خاڵەکان"
            icon={<BookOpen size={16} strokeWidth={2.5} />} label="یاسا"
          />
        }
      >
        {/* ── Settings ──────────────────────────────────────────────────── */}
        <LobbyCard className="flex flex-col gap-5">
          <div>
            <SectionLabel>شێوازی یاریکردن</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <OptionCard
                accent="amber"
                selected={controlMode === "phones"} onClick={() => setControlMode("phones")}
                icon={<Smartphone size={18} strokeWidth={2.25} />} label="مۆبایلی کاپتن"
                hint="کاپتنەکان لە مۆبایلەوە دەشارنەوە و دەگەڕێن"
              />
              <OptionCard
                accent="amber"
                selected={controlMode === "screen"} onClick={() => setControlMode("screen")}
                icon={<Monitor size={18} strokeWidth={2.25} />} label="تەنها شاشە"
                hint="کاپتن لە مۆبایل دەیشارێتەوە، گەڕان لەسەر ئەم شاشەیە"
              />
            </div>
          </div>

          <Divider />

          <div>
            <SectionLabel>دابەشکردنی تیپەکان</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <OptionCard
                accent="amber"
                selected={teamMode === "choose"} onClick={() => setTeamMode("choose")}
                icon={<Hand size={18} strokeWidth={2.25} />} label="هەڵبژاردن"
                hint="هەر یاریزانێک تیپی خۆی هەڵدەبژێرێت"
              />
              <OptionCard
                accent="amber"
                selected={teamMode === "random"} onClick={() => setTeamMode("random")}
                icon={<Dices size={18} strokeWidth={2.25} />} label="هەڕەمەکی"
                hint="یاریزانان بە هەڕەمەکی دابەش دەکرێن"
              />
            </div>
          </div>

          <Divider />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-black text-stone-500">ژمارەی گەڕەکان</span>
            <NumberSegment
              accent="amber"
              presets={ROUND_PRESETS}
              value={totalRounds}
              onSelect={setTotalRounds}
              inputValue={roundsInput}
              onInput={handleRoundsInput}
              min={1} max={MAX_ROUNDS}
              label="ژمارەی گەڕەکان"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex flex-col gap-0.5">
              <span className="text-xs font-black text-stone-500">هەوڵەکانی دۆزینەوە</span>
              <span className="text-[11px] font-bold text-stone-400">چەند جار تیپی دۆزەرەوە دەتوانێت گوڵی هەڵە بکات لە هەر گەڕێکدا — پوچ لەسەر ئەنگوستیلە هەمیشە گەڕەکە کۆتایی پێدەهێنێت</span>
            </span>
            <NumberSegment
              accent="amber"
              presets={TRIES_PRESETS}
              value={maxTries}
              onSelect={setMaxTries}
              inputValue={triesInput}
              onInput={handleTriesInput}
              min={1} max={MAX_TRIES}
              label="هەوڵەکانی دۆزینەوە"
            />
          </div>
        </LobbyCard>

        {/* ── Teams ─────────────────────────────────────────────────────── */}
        <LobbyCard className="flex flex-col gap-3">
          <SectionLabel
            action={teamMode === "random" && roster.length > 1 && (
              <ChipButton accent="amber" onClick={shuffleTeams}>
                <Shuffle size={13} strokeWidth={2.5} /> دابەشکردنەوە
              </ChipButton>
            )}
          >
            تیپەکان
          </SectionLabel>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 -mt-1">
            {TEAMS.map(team => {
              const ui = TEAM_UI[team];
              const members = roster.filter(p => p.team === team);
              return (
                <div key={team} className="flex flex-col rounded-2xl bg-stone-50/70 ring-1 ring-stone-200/80 overflow-hidden">
                  <div className={`h-1 ${ui.bar}`} />
                  <div className="flex items-center justify-between px-3.5 pt-3 pb-2">
                    <span className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${ui.bar}`} />
                      <span className={`text-sm font-black ${ui.text}`}>{ui.label}</span>
                    </span>
                    <span className="grid place-items-center min-w-[1.5rem] h-6 px-1.5 rounded-full bg-white ring-1 ring-stone-200 text-xs font-black text-stone-600 tabular-nums">
                      {members.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5 px-2.5 pb-2.5 min-h-[7.5rem]">
                    <AnimatePresence>
                      {members.map(p => {
                        const isCaptain = captains[team] === p.playerId;
                        const votes = captainVoteCounts[p.playerId] ?? 0;
                        return (
                          <motion.div
                            key={p.playerId}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className={`flex items-center gap-2 bg-white rounded-xl ps-2.5 pe-1 py-1.5 ring-1 ${isCaptain ? "ring-amber-300 shadow-[0_2px_10px_-2px_rgba(245,158,11,0.35)]" : "ring-stone-200/80"}`}
                          >
                            <span className="text-lg leading-none">{p.emoji}</span>
                            <span className="text-sm font-bold text-stone-800 flex-1 truncate">{p.name}</span>
                            {votes > 0 && (
                              <span className="flex items-center gap-1 text-[10px] font-black text-amber-800 bg-amber-50 ring-1 ring-amber-200/70 rounded-full px-1.5 py-0.5 tabular-nums" title="دەنگی کاپتن">
                                <Vote size={11} strokeWidth={2.5} /> {votes}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => setCaptain(team, p.playerId)}
                              title="کردن بە کاپتن"
                              aria-pressed={isCaptain}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isCaptain ? "text-amber-500" : "text-stone-300 hover:text-amber-500 hover:bg-amber-50"}`}
                            >
                              <Crown size={15} strokeWidth={2.5} fill={isCaptain ? "currentColor" : "none"} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPlayerTeam(p.playerId, otherTeam(team))}
                              title="گواستنەوە بۆ تیپی تر"
                              className="p-1.5 rounded-lg text-stone-300 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                            >
                              <ArrowLeftRight size={15} strokeWidth={2.5} />
                            </button>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    {members.length === 0 && (
                      <div className="flex-1 flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-300 text-stone-400 py-4">
                        <Users size={18} strokeWidth={2} />
                        <span className="text-xs font-bold">کەس نییە</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {unassigned.length > 0 && (
            <div className="flex flex-col gap-2 rounded-2xl bg-stone-50 ring-1 ring-stone-200/70 p-3">
              <span className="text-[11px] font-bold text-stone-500">بێ تیپ — کرتە بکە بۆ دانانیان</span>
              <div className="flex flex-wrap gap-1.5">
                {unassigned.map(p => (
                  <div key={p.playerId} className="flex items-center gap-1 bg-white ring-1 ring-stone-200 rounded-full ps-3 pe-1 py-1">
                    <span className="text-xs font-bold text-stone-700 me-1">{p.emoji} {p.name}</span>
                    {TEAMS.map(team => (
                      <button
                        key={team}
                        type="button"
                        onClick={() => setPlayerTeam(p.playerId, team)}
                        title={TEAM_UI[team].label}
                        className="grid place-items-center w-6 h-6 rounded-full hover:bg-stone-100 cursor-pointer group"
                      >
                        <span className={`w-3 h-3 rounded-full ${TEAM_UI[team].bar} group-hover:scale-125 transition-transform`} />
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          <InfoNote
            accent="amber"
            items={[
              { icon: Vote, text: "یاریزانانی هەر تیپێک لە مۆبایلەوە دەنگ دەدەن بۆ کاپتن — زۆرترین دەنگ دەبێتە کاپتن (👑 بۆ هەڵبژاردنی ڕاستەوخۆ)" },
              { icon: Crown, text: "کاپتن لە مۆبایلەکەیەوە ئەنگوستیلە دەشارێتەوە، یاریزانانی تیپەکەی دەنگ دەدەن کە لەژێر کام کڵاو بێت" },
            ]}
          />
        </LobbyCard>

        <StartButton
          accent="amber"
          onClick={startGame}
          disabled={!canStart}
          label="دەستپێکردنی کڵاوێن"
          hint="هەر تیپێک لانیکەم یەک یاریزانی پێویستە، یان «تەنها شاشە» هەڵبژێرە"
        />
        {RulesModal}
      </HostLobbyShell>
    );
  }

  /* ═══════════════════════════ IN GAME / ENDED ═══════════════════════════ */
  const seekerTeam = otherTeam(hiderTeam);
  const onScreen = controlMode === "screen";
  const captainName = (team: Team) => {
    const c = roster.find(p => p.playerId === captains[team]);
    return c ? `${c.emoji} ${c.name}` : null;
  };
  const { claimPoints, missPoints } = seekStakes(lifted.length, wrongClaims);
  const resultText = result ? describeResult(result, hiderTeam) : null;
  const inToss = phase === "TOSS_INTRO" || phase === "TOSS_QUESTION" || phase === "TOSS_RESULT";
  const scoreProps = { scores, hiderTeam, inGame: phase !== "ENDED", roster, captains };

  return (
    <div dir="rtl" className="kl-screen bg-white flex flex-col items-center px-3 pt-3 pb-3 gap-2 overflow-y-auto overflow-x-hidden">
      {/* ── Header: scores on the sides, toolbar and round in the middle ──── */}
      <div className="w-full max-w-[1800px] flex flex-col md:flex-row items-center md:items-stretch justify-center gap-2 md:gap-3 flex-shrink-0">
        {!inToss && (
          <div className="hidden md:block flex-1 min-w-0">
            <TeamScoreCard team="a" variant="header" className="h-full" {...scoreProps} />
          </div>
        )}

        <div className="flex flex-col items-center justify-center gap-1.5 flex-shrink-0">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <ToolButton icon={RotateCcw} label="ڕیست" onClick={resetGame} hoverClass="hover:bg-red-50 hover:text-red-500" />
            {phase !== "ENDED" && (
              <ToolButton icon={Flag} label="کۆتایی" onClick={endGame} hoverClass="hover:bg-amber-50 hover:text-amber-500" />
            )}
            <ToolButton
              icon={musicOn ? Music2 : Music} label="میوزیك" active={musicOn}
              onClick={() => setMusicOn(v => !v)}
              activeClass="bg-amber-600 text-white"
            />
            <ToolButton
              icon={soundOn ? Volume2 : VolumeX} label="دەنگ" active={soundOn}
              onClick={() => setSoundOn(v => !v)}
              activeClass="bg-amber-500 text-white"
            />
            <ToolButton
              icon={onScreen ? Monitor : Smartphone} label={onScreen ? "تەنها شاشە" : "مۆبایلی کاپتن"} active={onScreen}
              onClick={() => setControlMode(onScreen ? "phones" : "screen")}
              activeClass="bg-amber-700 text-white"
            />
            <ToolButton icon={BookOpen} label="یاسا" onClick={() => setShowRules(true)} hoverClass="hover:bg-amber-50 hover:text-amber-700" />
          </div>
          {phase !== "ENDED" && !inToss && (
            <span className="text-sm font-black text-amber-700 bg-amber-50 rounded-full px-3 py-0.5">گەڕی {round} / {totalRounds}</span>
          )}
        </div>

        {!inToss && (
          <div className="hidden md:block flex-1 min-w-0">
            <TeamScoreCard team="b" variant="header" className="h-full" {...scoreProps} />
          </div>
        )}

        {/* Narrow screens: the regular two-up scoreboard under the toolbar. */}
        {!inToss && (
          <div className="md:hidden w-full flex justify-center">
            <TeamScoreboard {...scoreProps} />
          </div>
        )}
      </div>

      {/* ── Opening toss question ─────────────────────────────────────────── */}
      {phase === "TOSS_QUESTION" && toss && tossStartedAt != null && (
        <TossQuestionPanel toss={toss} roster={roster} startedAt={tossStartedAt} />
      )}
      {phase === "TOSS_RESULT" && toss && (
        <>
          <TossResultPanel toss={toss} roster={roster} hiderTeam={hiderTeam} />
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
            onClick={startFirstRound}
            className="bg-amber-700 hover:bg-amber-800 text-white font-black rounded-2xl px-8 py-3.5 text-lg shadow-lg cursor-pointer"
          >
            دەستپێکردنی گەڕی یەکەم 🎩
          </motion.button>
        </>
      )}

      {/* ── Board: status line, hats and actions, kept together under the header;
             the hats get the height the other two leave ──────────────────────── */}
      {phase !== "ENDED" && !inToss && (
        <HatBoard
          lifted={lifted}
          revealRing={phase === "ROUND_RESULT" ? result?.ringHat ?? null : null}
          wrongHat={
            phase === "ROUND_RESULT" && result?.outcome === "wrongClaim" ? result.pickedHat
            : phase === "SEEKING" && mistake?.kind === "wrongClaim" ? mistake.hat : null
          }
          selected={selectedHat}
          interactive={onScreen && phase === "SEEKING"}
          sweeping={phase === "HIDING"}
          onPick={pickHat}
          top={
            <div className="flex flex-col items-center gap-0.5 text-center min-h-[3rem] px-2">
              {phase === "SEEKING" && mistake && (
                <motion.p
                  key={`${mistake.hat}:${triesLeft}`}
                  initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="text-base sm:text-xl font-black text-red-500"
                >
                  {describeMistake(mistake, triesLeft)}
                </motion.p>
              )}

              {phase === "HIDING" && (
                <>
                  <p className="text-lg sm:text-2xl font-black text-gray-800">
                    {TEAM_UI[hiderTeam].dot} {TEAM_UI[hiderTeam].label} ئەنگوستیلە دەشارێتەوە...
                  </p>
                  <p className="text-base sm:text-xl font-bold text-gray-500">
                    {captainName(hiderTeam)
                      ? `👑 ${captainName(hiderTeam)} لە مۆبایلەکەیەوە دەیشارێتەوە · یاریزانانی تیپەکە دەنگ دەدەن 🗳️`
                      : "هیچ یاریزانێک لەم تیپەدا نییە — شاردنەوەی هەڕەمەکی بەکاربهێنە"}
                  </p>
                </>
              )}

              {phase === "SEEKING" && (
                <>
                  <p className="text-lg sm:text-2xl font-black text-gray-800">
                    🔍 {TEAM_UI[seekerTeam].label} دەگەڕێت
                    {!onScreen && captainName(seekerTeam) ? ` — 👑 ${captainName(seekerTeam)}` : ""}
                  </p>
                  <p className="text-base sm:text-xl font-black text-gray-500">
                    {lifted.length} کڵاو پوچ کران · دۆزینەوە: <span className="text-emerald-600">+{claimPoints}</span> ·
                    هەڵە: <span className="text-red-500">+{missPoints} بۆ {TEAM_UI[hiderTeam].label}</span>
                    {maxTries > 1 && <> · هەوڵی گوڵ: <span className="text-amber-600">{triesLeft} / {maxTries}</span></>}
                  </p>
                </>
              )}

              {phase === "ROUND_RESULT" && resultText && (
                <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-1">
                  <p className={`text-xl sm:text-3xl font-black ${resultText.good ? "text-emerald-600" : "text-red-500"}`}>{resultText.title}</p>
                  <p className="text-sm sm:text-lg font-bold text-gray-600">{resultText.detail}</p>
                </motion.div>
              )}
            </div>
          }
          bottom={
            // A fixed slot while seeking, so picking a hat never resizes the hats.
            <div className={`flex justify-center items-center ${phase === "SEEKING" && onScreen ? "min-h-[5.75rem]" : ""}`}>
              {phase === "HIDING" && (
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                  onClick={hideRandom}
                  className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-2xl px-6 py-2.5 cursor-pointer"
                >
                  <Dices className="w-[1.125rem] h-[1.125rem]" /> شاردنەوەی هەڕەمەکی
                </motion.button>
              )}

              {phase === "SEEKING" && onScreen && (selectedHat != null ? (
                <SeekActionBar
                  layout="row"
                  hat={selectedHat}
                  liftedCount={lifted.length}
                  hiderTeam={hiderTeam}
                  triesLeft={triesLeft}
                  wrongClaims={wrongClaims}
                  onAction={action => { seek(selectedHat, action); setSelectedHat(null); }}
                  onCancel={() => setSelectedHat(null)}
                />
              ) : (
                <p className="text-sm font-bold text-gray-400">کرتە لە کڵاوێک بکە</p>
              ))}

              {phase === "ROUND_RESULT" && (
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                  onClick={nextRound}
                  className="bg-amber-700 hover:bg-amber-800 text-white text-lg font-black rounded-2xl px-8 py-3 shadow-lg cursor-pointer"
                >
                  {gameOver ? "کۆتایی یاری 🏆" : "گەڕی داهاتوو"}
                </motion.button>
              )}
            </div>
          }
        />
      )}

      <TossIntro open={phase === "TOSS_INTRO"} sound={soundOn} />
      <RoundIntro open={phase === "ROUND_INTRO"} round={round} hiderTeam={hiderTeam} result={result} scores={scores} sound={soundOn} />
      <KllawenWinnerModal open={phase === "ENDED"} scores={scores} onNewGame={resetGame} />
      {RulesModal}
    </div>
  );
}
