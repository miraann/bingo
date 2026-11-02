"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useKllawenPlayer } from "@/hooks/useKllawenPlayer";
import { useWakeLock } from "@/hooks/useWakeLock";
import { EmojiPicker } from "@/components/EmojiPicker";
import { ConnectionBanner } from "@/components/ConnectionBanner";
import { WaitingAvatar } from "@/components/WaitingAvatar";
import { HatRow } from "@/components/kllawen/HatRow";
import { TeamScoreboard } from "@/components/kllawen/TeamScoreboard";
import { SeekActionBar } from "@/components/kllawen/SeekActionBar";
import { RoundIntro } from "@/components/kllawen/RoundIntro";
import { TEAM_UI, describeResult, hatNumber } from "@/components/kllawen/kllawenUi";
import { playCorrectSound, playIncorrectSound } from "@/lib/quizSound";
import { TEAMS, leadingTeam, type Team } from "@/lib/kllawenChannel";

function TeamPicker({ myTeam, onChoose }: { myTeam: Team | null; onChoose: (team: Team) => void }) {
  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-xs">
      <span className="text-xs font-bold text-gray-400">تیپەکەت هەڵبژێرە</span>
      <div className="grid grid-cols-2 gap-2 w-full">
        {TEAMS.map(team => (
          <motion.button
            key={team}
            whileTap={{ scale: 0.94 }}
            onClick={() => onChoose(team)}
            className={`
              rounded-2xl py-4 font-black text-base border-2 cursor-pointer transition-colors
              ${myTeam === team ? `${TEAM_UI[team].solid} border-transparent shadow-lg` : `bg-white ${TEAM_UI[team].border} ${TEAM_UI[team].text}`}
            `}
          >
            {TEAM_UI[team].dot} {TEAM_UI[team].label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export function KllawenPlayerScreen({ gameId }: { gameId: string }) {
  useWakeLock();

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🦁");
  const [selectedHat, setSelectedHat] = useState<number | null>(null);

  const {
    player, state, connected, reconnect,
    myTeam, isCaptain, role, myHiddenHat, seekerTeam,
    votes, myVote,
    join, chooseTeam, hideRing, voteHide, seekHat,
  } = useKllawenPlayer(gameId);

  const phase = state?.phase ?? "LOBBY";
  const myTurn = (role === "hidingCaptain" && phase === "HIDING") || (role === "seekingCaptain" && phase === "SEEKING");

  // Buzz when it becomes this captain's turn to act.
  const lastTurnRef = useRef("");
  useEffect(() => {
    const key = myTurn && state ? `${state.round}:${phase}` : "";
    if (key && key !== lastTurnRef.current && typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(80);
    lastTurnRef.current = key;
  }, [myTurn, state, phase]);

  useEffect(() => { setSelectedHat(null); }, [phase, state?.lifted.length]);

  const soundPlayedRef = useRef(-1);
  useEffect(() => {
    if (!state || phase !== "ROUND_RESULT" || !state.result || !myTeam || soundPlayedRef.current === state.round) return;
    soundPlayedRef.current = state.round;
    if (state.result.scoringTeam === myTeam) playCorrectSound();
    else if (state.result.scoringTeam) playIncorrectSound();
  }, [state, phase, myTeam]);

  return (
    <>
      {player && <ConnectionBanner connected={connected} onReconnect={reconnect} />}
      {renderContent()}
      {state && <RoundIntro open={phase === "ROUND_INTRO"} round={state.round} hiderTeam={state.hiderTeam} />}
    </>
  );

  function renderContent() {

  /* ── Registration ──────────────────────────────────────────────────────── */
  if (!player) {
    return (
      <div dir="rtl" className="h-dvh bg-white flex flex-col items-center justify-center gap-5 px-6 py-8 overflow-y-auto">
        <h1 className="text-xl font-black text-gray-800">بەشداریکردن لە کڵاوێن 🎩</h1>
        <div className="flex flex-col items-center gap-2 w-full max-w-xs">
          <label className="text-xs font-bold text-gray-400 self-start">ناو</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="ناوی خۆت بنووسە"
            maxLength={20}
            className="w-full text-center text-lg font-bold border-2 border-gray-200 rounded-2xl py-3 focus:border-amber-400 focus:outline-none"
          />
        </div>
        <div className="flex flex-col items-center gap-2">
          <label className="text-xs font-bold text-gray-400">ئیمۆجیت هەڵبژێرە</label>
          <EmojiPicker value={emoji} onChange={setEmoji} />
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          disabled={name.trim().length === 0}
          onClick={() => join(name, emoji)}
          className={`
            font-black rounded-2xl px-8 py-3.5 text-lg text-white
            ${name.trim().length === 0 ? "bg-gray-200 cursor-not-allowed" : "bg-amber-700 hover:bg-amber-800 cursor-pointer"}
          `}
        >
          بەشداریکردن
        </motion.button>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="h-dvh bg-white flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-amber-200 border-t-amber-700 animate-spin" />
      </div>
    );
  }

  const canChooseTeam = state.teamMode === "choose" && (phase === "LOBBY" || !myTeam);
  const TeamBadge = myTeam && (
    <span className={`text-sm font-black rounded-full px-3 py-1 ${TEAM_UI[myTeam].soft} ${TEAM_UI[myTeam].text}`}>
      {TEAM_UI[myTeam].dot} {TEAM_UI[myTeam].label}{isCaptain ? " · 👑 کاپتن" : ""}
    </span>
  );

  /* ── Lobby ─────────────────────────────────────────────────────────────── */
  if (phase === "LOBBY") {
    return (
      <div dir="rtl" className="h-dvh bg-white flex flex-col items-center justify-center gap-4 px-6 overflow-y-auto">
        <WaitingAvatar emoji={player.emoji} />
        <h1 className="text-lg font-black text-gray-800">سڵاو {player.name} 👋</h1>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-gray-300"}`} />
          {connected ? "پەیوەستیت" : "چاوەڕوانی پەیوەستبوون..."}
        </div>
        {canChooseTeam ? (
          <TeamPicker myTeam={myTeam} onChoose={chooseTeam} />
        ) : myTeam ? TeamBadge : (
          <p className="text-sm font-bold text-gray-400">چاوەڕێی دابەشکردنی تیپەکان بکە...</p>
        )}
        {isCaptain && (
          <p className="text-xs font-bold text-amber-700 text-center max-w-xs">
            {state.controlMode === "phones"
              ? "تۆ کاپتنی تیپەکەیت: لە مۆبایلەکەتەوە ئەنگوستیلە دەشاریتەوە و بۆی دەگەڕێیت"
              : "تۆ کاپتنی تیپەکەیت: لە مۆبایلەکەتەوە ئەنگوستیلە دەشاریتەوە"}
          </p>
        )}
        <p className="text-sm text-gray-400 text-center">چاوەڕێی دەستپێکردنی کڵاوێن بکە...</p>
      </div>
    );
  }

  /* ── Game ended ────────────────────────────────────────────────────────── */
  if (phase === "ENDED") {
    const winner = leadingTeam(state.scores);
    return (
      <div dir="rtl" className="h-dvh bg-white flex flex-col items-center justify-center gap-5 px-6 py-8 overflow-y-auto">
        <h1 className="text-xl font-black text-gray-800">کڵاوێن تەواو بوو 🎉</h1>
        {winner ? (
          <p className={`text-2xl font-black ${TEAM_UI[winner].text}`}>
            {winner === myTeam ? "تیپەکەت بردیەوە! 🏆" : `${TEAM_UI[winner].label} بردیەوە`}
          </p>
        ) : (
          <p className="text-2xl font-black text-gray-600">یەکسان بوون 🤝</p>
        )}
        <TeamScoreboard
          scores={state.scores} targetScore={state.targetScore} hiderTeam={state.hiderTeam}
          inGame={false} roster={state.roster} captains={state.captains} highlightTeam={myTeam} compact
        />
        <p className="text-sm text-gray-400">چاوەڕێی یاریی داهاتوو بکە</p>
      </div>
    );
  }

  /* ── Hiding / seeking / round result ──────────────────────────────────── */
  const hiderUi = TEAM_UI[state.hiderTeam];
  const seekerUi = seekerTeam ? TEAM_UI[seekerTeam] : hiderUi;
  const result = phase === "ROUND_RESULT" ? state.result : null;
  const resultText = result ? describeResult(result, state.hiderTeam) : null;

  const voting = phase === "HIDING" && (role === "hidingCaptain" || role === "hider");
  const votersByHat: Record<number, string[]> = {};
  if (voting) {
    for (const v of Object.values(votes)) (votersByHat[v.hat] ??= []).push(v.emoji);
  }
  const topVote = Object.entries(votersByHat).sort((a, b) => b[1].length - a[1].length)[0];

  let message: string;
  if (phase === "HIDING") {
    message =
      role === "hidingCaptain" ? "کڵاوێک هەڵبژێرە بۆ شاردنەوەی ئەنگوستیلە 💍 — دەنگی تیپەکەت لەسەر کڵاوەکان دیارە" :
      role === "hider" ? "دەنگ بدە: کاپتنەکەت لەژێر کام کڵاو بیشارێتەوە؟ 🗳️ (دەموچاوت ئاسایی ڕابگرە 😐)" :
      role === "seeker" || role === "seekingCaptain" ? `${hiderUi.label} دەیشارێتەوە... سەیری دەموچاویان بکە 👀` :
      `${hiderUi.label} دەیشارێتەوە...`;
  } else if (phase === "SEEKING") {
    message =
      role === "seekingCaptain" ? "کڵاوێک هەڵبژێرە: پوچ یان بڕین؟" :
      role === "seeker" ? "تیپەکەت دەگەڕێت — یارمەتی کاپتنەکەت بدە!" :
      role === "hider" || role === "hidingCaptain" ? `${seekerUi.label} دەگەڕێت — خۆت ڕابگرە 🤐` :
      `${seekerUi.label} دەگەڕێت...`;
  } else {
    message = "";
  }

  return (
    <div dir="rtl" className="min-h-dvh bg-white flex flex-col items-center gap-4 px-3 pt-5 pb-6">
      <div className="flex items-center justify-between w-full max-w-sm">
        <span className="font-bold text-gray-700 flex items-center gap-1.5">
          <span className="text-xl">{player.emoji}</span>{player.name}
        </span>
        <span className="text-xs font-black text-amber-700 bg-amber-50 rounded-full px-3 py-1">گەڕی {state.round}</span>
      </div>

      <TeamScoreboard
        scores={state.scores} targetScore={state.targetScore} hiderTeam={state.hiderTeam}
        inGame roster={state.roster} captains={state.captains} highlightTeam={myTeam} compact
      />

      {canChooseTeam ? <TeamPicker myTeam={myTeam} onChoose={chooseTeam} /> : TeamBadge}

      {message && (
        <p className={`text-base font-black text-center max-w-xs ${myTurn ? "text-amber-700" : "text-gray-600"}`}>{message}</p>
      )}

      {resultText && (
        <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-1 text-center">
          <p className={`text-xl font-black ${resultText.good ? "text-emerald-600" : "text-red-500"}`}>{resultText.title}</p>
          <p className="text-sm font-bold text-gray-600 max-w-xs">{resultText.detail}</p>
        </motion.div>
      )}

      <HatRow
        size="phone"
        lifted={state.lifted}
        revealRing={result?.ringHat ?? null}
        wrongHat={result?.outcome === "wrongClaim" ? result.pickedHat : null}
        markedHat={phase === "SEEKING" ? myHiddenHat : null}
        selected={role === "hider" && phase === "HIDING" ? myVote : selectedHat}
        interactive={myTurn || (role === "hider" && phase === "HIDING")}
        onPick={role === "hider" && phase === "HIDING" ? voteHide : setSelectedHat}
        voters={voting ? votersByHat : undefined}
      />

      {role === "hidingCaptain" && phase === "HIDING" && topVote && (
        <p className="text-sm font-bold text-amber-700">🗳️ زۆرترین دەنگ: کڵاوی {hatNumber(Number(topVote[0]))} ({topVote[1].length})</p>
      )}
      {role === "hider" && phase === "HIDING" && myVote != null && (
        <p className="text-sm font-bold text-gray-500">دەنگت دا بە کڵاوی {hatNumber(myVote)} — کاپتن بڕیار دەدات</p>
      )}

      {phase === "HIDING" && role === "hidingCaptain" && selectedHat != null && (
        <motion.button
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => hideRing(selectedHat)}
          className="bg-amber-700 hover:bg-amber-800 text-white font-black rounded-2xl px-8 py-3.5 text-lg shadow-lg cursor-pointer"
        >
          شاردنەوە لەژێر کڵاوی {hatNumber(selectedHat)} 💍
        </motion.button>
      )}

      {phase === "SEEKING" && role === "seekingCaptain" && selectedHat != null && (
        <SeekActionBar
          hat={selectedHat}
          liftedCount={state.lifted.length}
          hiderTeam={state.hiderTeam}
          onAction={action => { seekHat(selectedHat, action); setSelectedHat(null); }}
          onCancel={() => setSelectedHat(null)}
        />
      )}

      {phase === "SEEKING" && myHiddenHat != null && (
        <p className="text-xs font-bold text-gray-400">💍 تۆ لەژێر کڵاوی {hatNumber(myHiddenHat)} شاردتەوە</p>
      )}

      {state.controlMode === "screen" && phase === "SEEKING" && (
        <p className="text-xs font-bold text-gray-400 text-center">گەڕان لەسەر شاشەی سەرەکی دەکرێت 📺</p>
      )}
    </div>
  );
  }
}
