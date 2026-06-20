'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Share2, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
}

interface QuizData {
  play_id: string;
  title: string;
  questions: Question[];
}

export default function PlayPage() {
  const { challengeId } = useParams();
  const router = useRouter();
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.post('/gameplay/start', { challenge_id: challengeId }).then((res) => {
      setQuiz(res.data);
      setLoading(false);
    });
  }, [challengeId]);

  const pick = useCallback((idx: number) => {
    if (selected !== null || !quiz) return;
    setSelected(idx);

    const q = quiz.questions[current];
    const ans = {
      question_id: q.id,
      selected_answer: idx,
      time_taken_seconds: 5,
      confidence: idx === q.correct_answer ? 'confident' : 'guess',
    };
    const nextAnswers = [...answers, ans];
    setAnswers(nextAnswers);

    setTimeout(() => {
      if (current < quiz.questions.length - 1) {
        setCurrent((c) => c + 1);
        setSelected(null);
      } else {
        submit(nextAnswers);
      }
    }, 1000);
  }, [selected, quiz, current, answers]);

  const submit = async (finalAnswers: any[]) => {
    if (!quiz) return;
    const res = await api.post(`/gameplay/${quiz.play_id}/submit`, finalAnswers);
    setResult(res.data);
    setShowResult(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (showResult && result) {
    return <ResultScreen result={result} onRestart={() => router.push('/')} />;
  }

  if (!quiz) return null;

  const q = quiz.questions[current];
  const progress = ((current + 1) / quiz.questions.length) * 100;
  const isCorrect = selected === q.correct_answer;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Progress */}
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/')} className="p-2 -ml-2 text-white/60">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-white/40 text-sm font-medium w-12 text-right">
            {current + 1}/{quiz.questions.length}
          </span>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 px-5 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold leading-snug">
              {q.question_text}
            </h2>

            <div className="space-y-3">
              {q.options.map((opt, idx) => {
                let state: 'default' | 'correct' | 'wrong' | 'faded' = 'default';
                if (selected !== null) {
                  if (idx === q.correct_answer) state = 'correct';
                  else if (idx === selected) state = 'wrong';
                  else state = 'faded';
                }

                return (
                  <motion.button
                    key={idx}
                    whileTap={selected === null ? { scale: 0.97 } : undefined}
                    onClick={() => pick(idx)}
                    disabled={selected !== null}
                    className={`w-full p-5 rounded-2xl text-left font-semibold text-lg transition-all ${
                      state === 'default'
                        ? 'bg-white/10 hover:bg-white/15 active:bg-white/20'
                        : state === 'correct'
                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                        : state === 'wrong'
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                        : 'bg-white/5 text-white/30'
                    }`}
                  >
                    <span className="inline-block w-8 text-white/40 font-bold">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    {opt}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom padding for safe area */}
      <div className="h-8" />
    </div>
  );
}

function ResultScreen({ result, onRestart }: { result: any; onRestart: () => void }) {
  const score = result.score;
  const total = result.total_questions;
  const pct = score / total;
  const isGood = pct >= 0.6;

  const labels = [
    { min: 0.9, label: 'EXPERT', emoji: '🔥' },
    { min: 0.7, label: 'PRO', emoji: '⚡' },
    { min: 0.5, label: 'AVERAGE', emoji: '👍' },
    { min: 0, label: 'BEGINNER', emoji: '🌱' },
  ];
  const badge = labels.find((l) => pct >= l.min)!;

  const share = () => {
    const url = `${window.location.origin}/challenge/${result.share_token}`;
    const text = `I scored ${score}/${total} on QuizCult! Top ${result.percentile?.toFixed(0)}%. Can you beat me?`;
    if (navigator.share) {
      navigator.share({ title: 'QuizCult', text, url });
    } else {
      const wa = encodeURIComponent(`${text} ${url}`);
      window.open(`https://wa.me/?text=${wa}`, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        {/* Badge */}
        <motion.div
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 10 }}
          className="mb-4"
        >
          <div className={`w-32 h-32 rounded-full flex flex-col items-center justify-center ${
            isGood ? 'bg-gradient-to-br from-green-400 to-emerald-600' : 'bg-gradient-to-br from-yellow-400 to-orange-500'
          }`}>
            <span className="text-4xl">{badge.emoji}</span>
            <span className="text-xs font-black mt-1 tracking-wider">{badge.label}</span>
          </div>
        </motion.div>

        {/* Score */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-5xl font-black mb-2"
        >
          {score}<span className="text-white/30">/{total}</span>
        </motion.h1>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-4 mb-6"
        >
          <div className="text-center">
            <div className="text-2xl font-bold">{result.percentile?.toFixed(0)}%</div>
            <div className="text-white/40 text-xs">percentile</div>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div className="text-center">
            <div className="text-2xl font-bold">#{result.rank_today}</div>
            <div className="text-white/40 text-xs">today</div>
          </div>
        </motion.div>

        {/* AI Summary */}
        {result.ai_summary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white/5 rounded-2xl p-4 mb-8 max-w-xs"
          >
            <p className="text-white/60 text-sm leading-relaxed">
              "{result.ai_summary}"
            </p>
          </motion.div>
        )}
      </div>

      {/* Actions */}
      <div className="p-5 space-y-3 pb-10">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={share}
          className="w-full bg-gradient-to-r from-green-400 to-emerald-500 text-black py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
        >
          <Share2 className="w-5 h-5" />
          CHALLENGE A FRIEND
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onRestart}
          className="w-full bg-white/10 text-white py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Play Another Challenge
        </motion.button>
      </div>
    </div>
  );
}
