/* ─────────────────────────────────────────────────────────────────────────────
   Quiz question loading — topic-based JSON files under data/questions/.
   To add a new category: drop a new JSON file in data/questions/ following the
   QuizQuestion shape below, then register it in TOPIC_REGISTRY.
───────────────────────────────────────────────────────────────────────────── */

import sportQuestions from "@/data/questions/sport.json";
import historyQuestions from "@/data/questions/history.json";
import scienceQuestions from "@/data/questions/science.json";

export interface QuizQuestion {
  id: number;
  category: string;
  question: string;
  options: string[];
  correctAnswer: number;
  timeLimit: number;
}

/** The shape broadcast to players — never includes correctAnswer. */
export interface PublicQuizQuestion {
  id: number;
  category: string;
  question: string;
  options: string[];
  timeLimit: number;
}

export interface QuizTopic {
  key: string;
  label: string;
  questions: QuizQuestion[];
}

const TOPIC_REGISTRY: QuizTopic[] = [
  { key: "sport", label: "وەرزش", questions: sportQuestions as QuizQuestion[] },
  { key: "history", label: "مێژوو", questions: historyQuestions as QuizQuestion[] },
  { key: "science", label: "زانست", questions: scienceQuestions as QuizQuestion[] },
];

export interface QuizTopicSummary {
  key: string;
  label: string;
  count: number;
}

/** Topics available for the host to pick from, loaded from data/questions/. */
export function listQuizTopics(): QuizTopicSummary[] {
  return TOPIC_REGISTRY.map(({ key, label, questions }) => ({ key, label, count: questions.length }));
}

export function getTopicLabel(topicKey: string): string {
  return TOPIC_REGISTRY.find(t => t.key === topicKey)?.label ?? topicKey;
}

/** Full question set (with correct answers) for the host, keyed by topic. */
export function loadQuizQuestions(topicKey: string): QuizQuestion[] {
  return TOPIC_REGISTRY.find(t => t.key === topicKey)?.questions ?? [];
}

/** Strips the correct answer before a question is broadcast to players. */
export function toPublicQuestion(q: QuizQuestion): PublicQuizQuestion {
  return { id: q.id, category: q.category, question: q.question, options: q.options, timeLimit: q.timeLimit };
}
