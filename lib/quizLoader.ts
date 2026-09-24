/* ─────────────────────────────────────────────────────────────────────────────
   Quiz question loading — topic-based JSON files under data/questions/.
   To add a new category: drop a new JSON file in data/questions/ following
   either RawQuizQuestion shape below, then register it in TOPIC_REGISTRY.
───────────────────────────────────────────────────────────────────────────── */

import sportQuestions from "@/data/questions/sport.json";
import historyQuestions from "@/data/questions/history.json";
import scienceQuestions from "@/data/questions/science.json";
import kurdishKnowledgeQuestions from "@/data/questions/kurdish-knowledge.json";

const DEFAULT_TIME_LIMIT = 15;

/** JSON files use either an index + timeLimit, or the answer text + difficulty. */
type RawQuizQuestion = {
  id: number;
  category?: string;
  question: string;
  options: string[];
} & (
  | { correctAnswer: number; timeLimit?: number }
  | { answer: string; difficulty?: string }
);

/** English category names in some files, shown to players in Kurdish. */
const CATEGORY_LABELS: Record<string, string> = {
  Geography: "جوگرافیا",
  History: "مێژوو",
  "Famous Person": "کەسایەتیی ناودار",
  Music: "مۆسیقا",
  Movie: "فیلم",
};

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

function normalizeQuestions(raw: RawQuizQuestion[], topicLabel: string): QuizQuestion[] {
  return raw.flatMap(q => {
    const correctAnswer = "correctAnswer" in q ? q.correctAnswer : q.options.indexOf(q.answer);
    if (correctAnswer < 0 || correctAnswer >= q.options.length) return [];
    return [{
      id: q.id,
      category: q.category ? CATEGORY_LABELS[q.category] ?? q.category : topicLabel,
      question: q.question,
      options: q.options,
      correctAnswer,
      timeLimit: ("timeLimit" in q ? q.timeLimit : undefined) ?? DEFAULT_TIME_LIMIT,
    }];
  });
}

function topic(key: string, label: string, raw: RawQuizQuestion[]): QuizTopic {
  return { key, label, questions: normalizeQuestions(raw, label) };
}

const TOPIC_REGISTRY: QuizTopic[] = [
  topic("sport", "وەرزش", sportQuestions as RawQuizQuestion[]),
  topic("history", "مێژوو", historyQuestions as RawQuizQuestion[]),
  topic("science", "زانست", scienceQuestions as RawQuizQuestion[]),
  topic("kurdish", "زانیاری کوردی", kurdishKnowledgeQuestions as RawQuizQuestion[]),
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
