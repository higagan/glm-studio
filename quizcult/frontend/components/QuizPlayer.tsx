'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: number;
  is_fun: boolean;
  explanation?: string;
}

interface Props {
  title: string;
  questions: Question[];
  onComplete: (answers: any[]) => void;
  isSubmitting?: boolean;
}

export function QuizPlayer({ title, questions, onComplete, isSubmitting }: Props) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [answers, setAnswers] = useState<any[]>([]);
  const [startTime] = useState(Date.now);

  const q = questions[current];
  const progress = ((current + 1) / questions.length) * 100;

  const pick = (idx: number) => {
    if (showAnswer || isSubmitting) return;
    setSelected(idx);
    setShowAnswer(true);

    const timeTaken = Math.floor((Date.now() - startTime) / 1000) || 1;
    const ans = {
      questionId: q.id,
      selectedAnswer: idx,
      timeTakenSeconds: timeTaken,
      confidence: idx === q.correct_answer ? 'confident' : 'guess',
    };
    const all = [...answers, ans];
    setAnswers(all);

    setTimeout(() => {
      if (current < questions.length - 1) {
        setCurrent((c) => c + 1);
        setSelected(null);
        setShowAnswer(false);
      } else {
        onComplete(all);
      }
    }, 1400);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="sticky top-0 bg-white border-b border-gray-100 p-4 space-y-2 z-10">
        <div className="flex justify-between">
          <span className="font-semibold text-sm truncate max-w-[70%]">{title}</span>
          <span className="text-sm text-gray-400">{current + 1}/{questions.length}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <motion.div className="bg-brand-500 h-2 rounded-full" animate={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex-1 p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="max-w-lg mx-auto space-y-5"
          >
            {q.is_fun && (
              <span className="inline-block bg-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                🤪 Fun Mode
              </span>
            )}
            <h3 className="text-xl font-bold text-gray-900">{q.question_text}</h3>

            <div className="space-y-3">
              {q.options.map((opt, idx) => {
                const isSelected = selected === idx;
                const isCorrect = idx === q.correct_answer;
                const showCorrect = showAnswer && isCorrect;
                const showWrong = showAnswer && isSelected && !isCorrect;

                return (
                  <motion.button
                    key={idx}
                    whileTap={{ scale: showAnswer ? 1 : 0.97 }}
                    onClick={() => pick(idx)}
                    disabled={showAnswer || isSubmitting}
                    className={`w-full text-left p-4 rounded-xl border-2 font-medium transition-all ${
                      showCorrect ? 'border-green-500 bg-green-50' :
                      showWrong ? 'border-red-500 bg-red-50' :
                      isSelected ? 'border-brand-500 bg-brand-50' :
                      'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                        showCorrect ? 'bg-green-500 text-white' :
                        showWrong ? 'bg-red-500 text-white' :
                        isSelected ? 'bg-brand-500 text-white' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {showCorrect ? <Check className="w-4 h-4" /> :
                         showWrong ? <X className="w-4 h-4" /> :
                         String.fromCharCode(65 + idx)}
                      </span>
                      <span className="flex-1">{opt}</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {showAnswer && q.explanation && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-gray-500 italic"
              >
                {q.explanation}
              </motion.p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {isSubmitting && (
        <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-gray-600">Calculating score...</p>
          </div>
        </div>
      )}
    </div>
  );
}
