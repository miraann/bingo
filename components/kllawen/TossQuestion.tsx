"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import { CountdownRing } from "@/components/quiz/CountdownRing";
import { QuizAnswerButtons } from "@/components/quiz/QuizAnswerButtons";
import { IntroTimer } from "@/components/kllawen/RoundIntro";
import { TEAM_UI } from "@/components/kllawen/kllawenUi";
import { TEAMS, type KllawenRosterEntry, type KllawenTossPublic, type Team } from "@/lib/kllawenChannel";

function formatSeconds(ms: number) {
  return `${(ms / 1000).toFixed(1)} چرکە`;
}

/** Full-screen countdown before the toss question opens, on the TV and every phone. */
export function TossIntro({ open }: { open: boolean }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          dir="rtl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-white/95 backdrop-blur-sm flex items-center justify-center overflow-y-auto py-6"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="flex flex-col items-center gap-4 sm:gap-6 px-6 text-center"
          >
            <motion.span
              className="text-6xl sm:text-8xl"
              animate={{ y: ["0%", "-18%", "0%"], rotate: [-8, 8, -8] }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
            >
              ❓
            </motion.span>
            <div className="flex flex-col items-center gap-1">
              <p className="text-2xl sm:text-4xl font-black text-gray-800">پرسیاری دەستپێک</p>
              <p className="text-base sm:text-2xl font-black text-amber-700 max-w-xl">
                یەکەم کەس وەڵامی ڕاست بداتەوە، تیپەکەی یەکەمجار ئەنگوستیلە دەشارێتەوە 💍
              </p>
            </div>
            <IntroTimer barClass="bg-amber-600" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Who on each team has locked in an answer — but not what they picked. */
function AnsweredByTeam({ toss, roster }: { toss: KllawenTossPublic; roster: KllawenRosterEntry[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-4 w-full max-w-3xl">
      {TEAMS.map(team => {
        const ui = TEAM_UI[team];
        const members = roster.filter(p => p.team === team);
        const done = members.filter(p => toss.answeredIds.includes(p.playerId)).length;
        return (
          <div key={team} className={`rounded-2xl border-2 ${ui.border} ${ui.soft} p-2 sm:p-3 flex flex-col gap-1.5`}>
            <span className={`text-xs sm:text-base font-black ${ui.text}`}>
              {ui.dot} {ui.label} <span className="opacity-60 tabular-nums">({done}/{members.length})</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {members.map(p => {
                const answered = toss.answeredIds.includes(p.playerId);
                return (
                  <motion.span
                    key={p.playerId}
                    animate={answered ? { scale: [1, 1.25, 1] } : undefined}
                    className={`flex items-center gap-1 rounded-full bg-white ps-2 pe-1.5 py-0.5 text-xs sm:text-sm font-bold ${answered ? "text-gray-700" : "text-gray-300"}`}
                  >
                    <span className={answered ? "" : "grayscale opacity-50"}>{p.emoji}</span>
                    <span className="truncate max-w-[6rem]">{p.name}</span>
                    {answered && <Check size={14} strokeWidth={3} className="text-emerald-500" />}
                  </motion.span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** The open toss question. With `onAnswer` the options are tappable (a phone on a team). */
export function TossQuestionPanel({
  toss,
  roster,
  startedAt,
  myAnswer = null,
  onAnswer,
}: {
  toss: KllawenTossPublic;
  roster: KllawenRosterEntry[];
  /** When this device started the question, in its own clock. */
  startedAt: number;
  myAnswer?: number | null;
  onAnswer?: (answer: number) => void;
}) {
  const { question } = toss;
  return (
    <div className="flex flex-col items-center gap-3 sm:gap-5 w-full">
      <div className="flex items-center gap-3 sm:gap-5">
        <CountdownRing totalMs={question.timeLimit * 1000} startedAt={startedAt} size={64} strokeWidth={6} />
        <div className="flex flex-col items-start gap-1">
          <span className="text-[11px] sm:text-sm font-black text-amber-700 bg-amber-50 rounded-full px-3 py-0.5">
            ❓ پرسیاری دەستپێک · {question.category}
          </span>
          <span className="text-[11px] sm:text-sm font-bold text-gray-400">یەکەم وەڵامی ڕاست، یەکەمجار دەشارێتەوە</span>
        </div>
      </div>

      <p className="text-xl sm:text-4xl font-black text-gray-800 text-center max-w-3xl leading-relaxed">{question.question}</p>

      <QuizAnswerButtons
        options={question.options}
        selectedAnswer={myAnswer}
        correctAnswer={null}
        disabled={!onAnswer || myAnswer != null}
        onSelect={onAnswer}
      />

      {onAnswer && myAnswer != null && (
        <p className="text-sm font-bold text-gray-500">وەڵامەکەت نێردرا ✓ — چاوەڕێی ئەوانی تر بکە...</p>
      )}

      <AnsweredByTeam toss={toss} roster={roster} />
    </div>
  );
}

/** Everyone's answer, fastest first, and which team won the toss. */
export function TossResultPanel({
  toss,
  roster,
  hiderTeam,
  myId = null,
}: {
  toss: KllawenTossPublic;
  roster: KllawenRosterEntry[];
  /** The toss winners (or the random pick when nobody got it right). */
  hiderTeam: Team;
  myId?: string | null;
}) {
  const { question, correctAnswer, answers, winnerId } = toss;
  const winner = answers.find(a => a.playerId === winnerId) ?? null;
  const ui = TEAM_UI[hiderTeam];

  return (
    <div className="flex flex-col items-center gap-3 sm:gap-5 w-full max-w-3xl">
      <p className="text-base sm:text-2xl font-black text-gray-700 text-center">{question.question}</p>
      {correctAnswer != null && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-500 text-white font-black px-5 py-2.5 sm:px-8 sm:py-4 text-lg sm:text-3xl shadow-lg">
          <Check size={28} strokeWidth={3} /> {question.options[correctAnswer]}
        </div>
      )}

      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: [0.4, 1.12, 1], opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className={`flex flex-col items-center gap-1 rounded-3xl px-5 py-3 sm:px-10 sm:py-5 ${ui.solid} shadow-lg text-center`}
      >
        <span className="text-xl sm:text-4xl font-black">🎩 {ui.label} یەکەمجار دەشارێتەوە</span>
        <span className="text-xs sm:text-lg font-bold opacity-90">
          {winner
            ? `⚡ ${winner.emoji} ${winner.name} زووتر وەڵامی ڕاستی دایەوە — ${formatSeconds(winner.elapsedMs)}`
            : "کەس وەڵامی ڕاستی نەدایەوە — تیپەکە بە هەڕەمەکی هەڵبژێردرا 🎲"}
        </span>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 w-full">
        {TEAMS.map(team => {
          const teamUi = TEAM_UI[team];
          const teamAnswers = answers.filter(a => a.team === team);
          const right = teamAnswers.filter(a => a.answer === correctAnswer).length;
          const silent = roster.filter(p => p.team === team && !answers.some(a => a.playerId === p.playerId));
          return (
            <div
              key={team}
              className={`rounded-2xl border-2 ${teamUi.border} ${teamUi.soft} p-2 sm:p-3 flex flex-col gap-1.5 ${team === hiderTeam ? "ring-4 ring-amber-300" : ""}`}
            >
              <div className="flex items-center justify-between gap-2 px-1">
                <span className={`text-sm sm:text-lg font-black ${teamUi.text}`}>
                  {teamUi.dot} {teamUi.label}{team === hiderTeam ? " 🎩" : ""}
                </span>
                <span className="text-[11px] sm:text-sm font-black text-gray-500 tabular-nums">
                  ✓ {right}/{teamAnswers.length + silent.length}
                </span>
              </div>
              {teamAnswers.map(a => {
                const correct = a.answer === correctAnswer;
                const isWinner = a.playerId === winnerId;
                const rank = answers.indexOf(a) + 1;
                return (
                  <motion.div
                    key={a.playerId}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + rank * 0.08 }}
                    className={`
                      flex items-center gap-2 rounded-xl px-2.5 py-2 sm:px-3 border-2 bg-white
                      ${isWinner ? "border-amber-400 bg-amber-50" : "border-transparent"}
                      ${a.playerId === myId ? "ring-2 ring-amber-300" : ""}
                    `}
                  >
                    <span className="w-5 text-xs sm:text-sm font-black text-gray-400 tabular-nums" title="ڕیزبەندی">{rank}</span>
                    <span className="text-lg sm:text-2xl leading-none">{a.emoji}</span>
                    <span className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm sm:text-base font-black text-gray-800 truncate">
                        {a.name}{isWinner ? " ⚡" : ""}
                      </span>
                      <span className={`flex items-center gap-1 text-[11px] sm:text-sm font-bold min-w-0 ${correct ? "text-emerald-600" : "text-red-500"}`}>
                        {correct ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
                        <span className="truncate">{question.options[a.answer]}</span>
                      </span>
                    </span>
                    <span dir="ltr" className="text-xs sm:text-base font-black text-gray-600 tabular-nums whitespace-nowrap">
                      {(a.elapsedMs / 1000).toFixed(1)}s
                    </span>
                  </motion.div>
                );
              })}
              {silent.map(p => (
                <div key={p.playerId} className="flex items-center gap-2 rounded-xl px-2.5 py-2 sm:px-3 bg-white/60 text-gray-400">
                  <span className="w-5" />
                  <span className="text-lg sm:text-2xl leading-none grayscale opacity-60">{p.emoji}</span>
                  <span className="flex-1 text-sm sm:text-base font-bold truncate">{p.name}</span>
                  <span className="text-[11px] sm:text-sm font-bold whitespace-nowrap">وەڵامی نەدایەوە ⏱️</span>
                </div>
              ))}
              {teamAnswers.length + silent.length === 0 && (
                <span className="text-[11px] text-gray-300 text-center py-2">کەس نییە</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
