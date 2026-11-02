"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, Music2, Volume2, VolumeX, RotateCcw, Flag, Smartphone, Monitor, BookOpen, Shuffle, Crown, ArrowLeftRight, Dices } from "lucide-react";
import { getOrCreateHostGameId, createNewHostGameId } from "@/lib/id";
import { useKllawenHost } from "@/hooks/useKllawenHost";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useBroadcastHostMode } from "@/hooks/useHostMode";
import { QRPanel } from "@/components/QRPanel";
import { GameModeToggle, type HostMode } from "@/components/GameModeSelector";
import { IconToggle } from "@/components/IconToggle";
import { HatRow } from "@/components/kllawen/HatRow";
import { TeamScoreboard } from "@/components/kllawen/TeamScoreboard";
import { SeekActionBar } from "@/components/kllawen/SeekActionBar";
import { KllawenRulesModal } from "@/components/kllawen/KllawenRulesModal";
import { KllawenWinnerModal } from "@/components/kllawen/KllawenWinnerModal";
import { RoundIntro } from "@/components/kllawen/RoundIntro";
import { TEAM_UI, describeResult, seekStakes } from "@/components/kllawen/kllawenUi";
import { playCorrectSound, playIncorrectSound, playPopSound } from "@/lib/quizSound";
import { TARGET_SCORE_PRESETS, TEAMS, otherTeam, type Team } from "@/lib/kllawenChannel";

function OptionButton({
  selected,
  onClick,
  icon,
  label,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      aria-pressed={selected}
      className={`
        flex-1 flex flex-col items-center gap-1 rounded-2xl px-3 py-3 border-2 cursor-pointer transition-colors duration-150
        ${selected ? "bg-amber-700 border-amber-700 text-white shadow-lg" : "bg-white border-gray-200 text-gray-600 hover:border-amber-300 hover:bg-amber-50"}
      `}
    >
      <span className="flex items-center gap-1.5 text-sm font-black">{icon}{label}</span>
      <span className={`text-[10px] font-bold ${selected ? "opacity-80" : "text-gray-400"}`}>{hint}</span>
    </motion.button>
  );
}

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
    connected, roster, captains, canStart, gameOver,
    phase, controlMode, setControlMode, teamMode, setTeamMode, targetScore, setTargetScore,
    hiderTeam, scores, round, lifted, result,
    setPlayerTeam, setCaptain, shuffleTeams,
    startGame, hideRandom, seek, nextRound, endGame, resetGame,
  } = useKllawenHost(gameId);

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
  const [targetInput, setTargetInput] = useState(String(targetScore));
  useEffect(() => setTargetInput(String(targetScore)), [targetScore]);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    bgMusicRef.current = new Audio("/audio/bg-music.mp3");
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = 0.35;
    return () => { bgMusicRef.current?.pause(); };
  }, []);

  useEffect(() => {
    const m = bgMusicRef.current;
    if (!m) return;
    if (musicOn) m.play().catch(() => {});
    else m.pause();
  }, [musicOn]);

  // Sounds follow the state, so moves made from a captain's phone play here too.
  const prevLiftedRef = useRef(lifted.length);
  useEffect(() => {
    if (soundOn && lifted.length > prevLiftedRef.current) playPopSound();
    prevLiftedRef.current = lifted.length;
  }, [lifted.length, soundOn]);

  const prevPhaseRef = useRef(phase);
  useEffect(() => {
    if (soundOn && prevPhaseRef.current !== "ROUND_RESULT" && phase === "ROUND_RESULT" && result) {
      if (result.outcome === "miss" || result.outcome === "wrongClaim") playIncorrectSound();
      else playCorrectSound();
    }
    if (prevPhaseRef.current !== "ENDED" && phase === "ENDED") {
      const cheer = new Audio("/audio/win-cheer.wav");
      cheer.volume = 0.8;
      cheer.play().catch(() => {});
    }
    prevPhaseRef.current = phase;
    setSelectedHat(null);
  }, [phase, result, soundOn]);

  const handleTargetInput = (raw: string) => {
    setTargetInput(raw);
    const v = parseInt(raw, 10);
    if (!isNaN(v) && v >= 1 && v <= 99) setTargetScore(v);
  };

  const ConnectionBadge = (
    <div className="flex items-center gap-1.5 text-xs text-gray-400">
      <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-gray-300"}`} />
      {connected ? "پەیوەستە" : "چاوەڕوانی پەیوەستبوون..."}
    </div>
  );

  const RulesButton = (
    <motion.button
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.9 }}
      onClick={() => setShowRules(true)}
      title="یاسای یاری"
      className="flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-2xl w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 hover:bg-amber-50 text-gray-400 hover:text-amber-700 transition-colors duration-200 cursor-pointer"
    >
      <BookOpen size={22} strokeWidth={2.5} />
      <span className="text-[10px] font-bold">یاسا</span>
    </motion.button>
  );

  const RulesModal = <KllawenRulesModal open={showRules} onClose={() => setShowRules(false)} targetScore={targetScore} />;

  /* ═══════════════════════════════ LOBBY ═══════════════════════════════ */
  if (phase === "LOBBY") {
    const unassigned = roster.filter(p => !p.team);
    return (
      <div dir="rtl" className="h-dvh bg-white overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center gap-5 sm:gap-6 px-4 py-6 sm:py-8 w-full max-w-5xl 2xl:max-w-6xl mx-auto">
          <div className="flex flex-col items-center gap-1">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-800">داشبۆردی کڵاوێن 🎩</h1>
            {ConnectionBadge}
          </div>

          <div className="flex flex-col md:flex-row sm:landscape:flex-row items-center md:items-start sm:landscape:items-start justify-center gap-5 sm:gap-6 md:gap-8 lg:gap-12 w-full">
            {gameId && joinUrl && (
              <div className="flex-shrink-0 md:sticky md:top-8 sm:landscape:sticky sm:landscape:top-4">
                <QRPanel gameId={gameId} joinUrl={joinUrl} />
              </div>
            )}

            <div className="flex flex-col items-center gap-5 w-full max-w-md lg:max-w-lg 2xl:max-w-xl">
              <div className="flex flex-col gap-1.5 w-full">
                <span className="text-xs font-bold text-gray-400">شێوازی یاریکردن</span>
                <div className="flex gap-2">
                  <OptionButton
                    selected={controlMode === "phones"} onClick={() => setControlMode("phones")}
                    icon={<Smartphone size={16} />} label="مۆبایلی کاپتن"
                    hint="کاپتنەکان لە مۆبایلەوە دەشارنەوە و دەگەڕێن"
                  />
                  <OptionButton
                    selected={controlMode === "screen"} onClick={() => setControlMode("screen")}
                    icon={<Monitor size={16} />} label="تەنها شاشە"
                    hint="کاپتن لە مۆبایل دەیشارێتەوە، گەڕان لەسەر ئەم شاشەیە"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <span className="text-xs font-bold text-gray-400">دابەشکردنی تیپەکان</span>
                <div className="flex gap-2">
                  <OptionButton
                    selected={teamMode === "choose"} onClick={() => setTeamMode("choose")}
                    icon="🙋" label="هەڵبژاردن" hint="هەر یاریزانێک تیپی خۆی هەڵدەبژێرێت"
                  />
                  <OptionButton
                    selected={teamMode === "random"} onClick={() => setTeamMode("random")}
                    icon="🎲" label="هەڕەمەکی" hint="یاریزانان بە هەڕەمەکی دابەش دەکرێن"
                  />
                </div>
              </div>

              <div className="flex flex-col items-center gap-1.5">
                <span className="text-xs font-bold text-gray-400">خاڵی بردنەوە</span>
                <div className="flex flex-wrap justify-center gap-1.5" dir="ltr">
                  {TARGET_SCORE_PRESETS.map(n => (
                    <motion.button
                      key={n} whileTap={{ scale: 0.92 }}
                      onClick={() => setTargetScore(n)}
                      className={`
                        px-3 py-1.5 rounded-xl text-sm font-black cursor-pointer transition-all duration-200
                        ${targetScore === n ? "bg-amber-700 text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}
                      `}
                    >
                      {n}
                    </motion.button>
                  ))}
                  <input
                    type="number" min="1" max="99" value={targetInput}
                    onChange={e => handleTargetInput(e.target.value)}
                    className="w-14 text-center border-2 border-gray-200 rounded-xl text-sm font-bold py-1 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* ── Teams ─────────────────────────────────────────────────── */}
              <div className="w-full flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-sm font-bold text-gray-500">تیپەکان</span>
                  {teamMode === "random" && roster.length > 1 && (
                    <button
                      onClick={shuffleTeams}
                      className="flex items-center gap-1 text-xs font-black text-amber-700 hover:text-amber-800 cursor-pointer"
                    >
                      <Shuffle size={13} /> دابەشکردنەوە
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {TEAMS.map(team => {
                    const ui = TEAM_UI[team];
                    const members = roster.filter(p => p.team === team);
                    return (
                      <div key={team} className={`rounded-2xl border-2 ${ui.border} ${ui.soft} p-2 flex flex-col gap-1.5 min-h-[6rem]`}>
                        <span className={`text-sm font-black ${ui.text}`}>{ui.dot} {ui.label} <span className="opacity-60">({members.length})</span></span>
                        <AnimatePresence>
                          {members.map(p => {
                            const isCaptain = captains[team] === p.playerId;
                            return (
                              <motion.div
                                key={p.playerId}
                                layout
                                initial={{ opacity: 0, scale: 0.7 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.7 }}
                                className="flex items-center gap-1 bg-white rounded-xl ps-2 pe-1 py-1"
                              >
                                <span className="text-base leading-none">{p.emoji}</span>
                                <span className="text-xs font-bold text-gray-700 flex-1 truncate">{p.name}</span>
                                <button
                                  onClick={() => setCaptain(team, p.playerId)}
                                  title="کردن بە کاپتن"
                                  className={`p-1 rounded-lg cursor-pointer ${isCaptain ? "text-amber-500" : "text-gray-300 hover:text-amber-400"}`}
                                >
                                  <Crown size={13} strokeWidth={2.5} />
                                </button>
                                <button
                                  onClick={() => setPlayerTeam(p.playerId, otherTeam(team))}
                                  title="گواستنەوە بۆ تیپی تر"
                                  className="p-1 rounded-lg text-gray-300 hover:text-gray-600 cursor-pointer"
                                >
                                  <ArrowLeftRight size={13} strokeWidth={2.5} />
                                </button>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                        {members.length === 0 && (
                          <span className="text-[11px] text-gray-300 text-center py-2">کەس نییە</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {unassigned.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    <span className="w-full text-center text-[11px] font-bold text-gray-400">بێ تیپ — کرتە بکە بۆ دانانیان</span>
                    {unassigned.map(p => (
                      <div key={p.playerId} className="flex items-center gap-1 bg-gray-100 rounded-full ps-2.5 pe-1 py-1">
                        <span className="text-xs font-bold text-gray-700">{p.emoji} {p.name}</span>
                        {TEAMS.map(team => (
                          <button
                            key={team}
                            onClick={() => setPlayerTeam(p.playerId, team)}
                            className="text-sm leading-none px-1 cursor-pointer hover:scale-125 transition-transform"
                            title={TEAM_UI[team].label}
                          >
                            {TEAM_UI[team].dot}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                <span className="text-[10px] text-gray-400 text-center">
                  👑 کاپتن لە مۆبایلەکەیەوە ئەنگوستیلە دەشارێتەوە، یاریزانانی تیپەکەی دەنگ دەدەن کە لەژێر کام کڵاو بێت
                </span>
              </div>

              <button
                onClick={() => setShowRules(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
              >
                <BookOpen size={14} /> یاسای یاری و خاڵەکان
              </button>

              <GameModeToggle mode={mode} onChange={onModeChange} />

              <div className="flex flex-col items-center gap-1.5 w-full">
                <motion.button
                  whileHover={canStart ? { scale: 1.03 } : undefined}
                  whileTap={canStart ? { scale: 0.95 } : undefined}
                  onClick={startGame}
                  disabled={!canStart}
                  className={`
                    w-full sm:w-auto font-black rounded-2xl px-8 py-3.5 text-lg text-white shadow-[0_6px_24px_rgba(180,83,9,0.40)]
                    ${canStart ? "bg-amber-700 hover:bg-amber-800 cursor-pointer" : "bg-gray-200 cursor-not-allowed shadow-none"}
                  `}
                >
                  دەستپێکردنی کڵاوێن
                </motion.button>
                {!canStart && (
                  <span className="text-[11px] font-bold text-gray-400 text-center">
                    هەر تیپێک لانیکەم یەک یاریزانی پێویستە، یان «تەنها شاشە» هەڵبژێرە
                  </span>
                )}
              </div>

              <button onClick={handleNewGame} className="text-xs text-gray-300 hover:text-gray-500 underline cursor-pointer">
                دروستکردنی یاریی نوێ
              </button>
            </div>
          </div>
        </div>
        {RulesModal}
      </div>
    );
  }

  /* ═══════════════════════════ IN GAME / ENDED ═══════════════════════════ */
  const seekerTeam = otherTeam(hiderTeam);
  const onScreen = controlMode === "screen";
  const captainName = (team: Team) => {
    const c = roster.find(p => p.playerId === captains[team]);
    return c ? `${c.emoji} ${c.name}` : null;
  };
  const { claimPoints, missPoints } = seekStakes(lifted.length);
  const resultText = result ? describeResult(result, hiderTeam) : null;

  return (
    <div dir="rtl" className="h-dvh bg-white flex flex-col items-center px-3 pt-5 md:pt-6 pb-4 gap-3 sm:gap-4 overflow-y-auto">
      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full max-w-3xl">
        <motion.button
          whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.9 }}
          onClick={resetGame} title="ڕیست کردنەوە"
          className="flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-2xl w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors duration-200 cursor-pointer"
        >
          <RotateCcw size={22} strokeWidth={2.5} />
          <span className="text-[10px] font-bold">ڕیست</span>
        </motion.button>
        {phase !== "ENDED" && (
          <motion.button
            whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.9 }}
            onClick={endGame} title="کۆتایی یاری"
            className="flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-2xl w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 hover:bg-amber-50 text-gray-400 hover:text-amber-500 transition-colors duration-200 cursor-pointer"
          >
            <Flag size={22} strokeWidth={2.5} />
            <span className="text-[10px] font-bold">کۆتایی</span>
          </motion.button>
        )}
        <IconToggle
          size="lg"
          activeIcon={Music2} inactiveIcon={Music} label="میوزیك" active={musicOn}
          onClick={() => setMusicOn(v => !v)}
          activeClass="bg-amber-600 text-white shadow-[0_4px_14px_rgba(217,119,6,0.40)]"
        />
        <IconToggle
          size="lg"
          activeIcon={Volume2} inactiveIcon={VolumeX} label="دەنگ" active={soundOn}
          onClick={() => setSoundOn(v => !v)}
          activeClass="bg-amber-500 text-white shadow-[0_4px_14px_rgba(245,158,11,0.40)]"
        />
        <IconToggle
          size="lg"
          activeIcon={Monitor} inactiveIcon={Smartphone} label={onScreen ? "تەنها شاشە" : "مۆبایلی کاپتن"} active={onScreen}
          onClick={() => setControlMode(onScreen ? "phones" : "screen")}
          activeClass="bg-amber-700 text-white shadow-[0_4px_14px_rgba(180,83,9,0.40)]"
        />
        {RulesButton}
      </div>

      <TeamScoreboard
        scores={scores} targetScore={targetScore} hiderTeam={hiderTeam}
        inGame={phase !== "ENDED"} roster={roster} captains={captains}
      />

      {phase !== "ENDED" && (
        <span className="text-xs font-black text-amber-700 bg-amber-50 rounded-full px-3 py-1">گەڕی {round}</span>
      )}

      {/* ── Status line ───────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-1 text-center min-h-[3.5rem] px-2">
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

      {phase !== "ENDED" && (
        <HatRow
          lifted={lifted}
          revealRing={phase === "ROUND_RESULT" ? result?.ringHat ?? null : null}
          wrongHat={phase === "ROUND_RESULT" && result?.outcome === "wrongClaim" ? result.pickedHat : null}
          selected={selectedHat}
          interactive={onScreen && phase === "SEEKING"}
          sweeping={phase === "HIDING"}
          onPick={setSelectedHat}
        />
      )}

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      {phase === "HIDING" && (
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
          onClick={hideRandom}
          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-2xl px-6 py-2.5 cursor-pointer"
        >
          <Dices size={18} /> شاردنەوەی هەڕەمەکی
        </motion.button>
      )}

      {phase === "SEEKING" && onScreen && (selectedHat != null ? (
        <SeekActionBar
          hat={selectedHat}
          liftedCount={lifted.length}
          hiderTeam={hiderTeam}
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
          className="bg-amber-700 hover:bg-amber-800 text-white font-black rounded-2xl px-8 py-3 shadow-lg cursor-pointer"
        >
          {gameOver ? "کۆتایی یاری 🏆" : "گەڕی داهاتوو"}
        </motion.button>
      )}

      <RoundIntro open={phase === "ROUND_INTRO"} round={round} hiderTeam={hiderTeam} />
      <KllawenWinnerModal open={phase === "ENDED"} scores={scores} onNewGame={resetGame} />
      {RulesModal}
    </div>
  );
}
