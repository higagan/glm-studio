'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Flame, Trophy, Zap, TrendingUp, Plus, Sparkles } from 'lucide-react';
import { ChallengeCard } from '@/components/ChallengeCard';
import { StreakBadge } from '@/components/StreakBadge';
import { getChallenges, api } from '@/lib/api';

interface Challenge {
  id: string;
  title: string;
  slug: string;
  category: string;
  difficulty: string;
  play_count: number;
  question_count: number;
}

export default function HomeClient({
  initialChallenges,
  initialError,
}: {
  initialChallenges: Challenge[];
  initialError: string | null;
}) {
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>(initialChallenges);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [streak] = useState(0);
  const [level] = useState(1);

  // Create quiz modal state
  const [showCreate, setShowCreate] = useState(false);
  const [topic, setTopic] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function fetchChallenges() {
    setLoading(true);
    setError(null);
    try {
      const data = await getChallenges();
      setChallenges(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateQuiz(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;

    setCreating(true);
    setCreateError(null);

    try {
      const res = await api.post('/quiz/create', {
        topic: topic.trim(),
        category: 'general',
        difficulty: 'medium',
      });

      const quiz = res.data;
      setShowCreate(false);
      setTopic('');

      // Navigate to play the new quiz
      router.push(`/play/${quiz.id}`);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to create quiz';
      if (msg.includes('timeout') || err.code === 'ECONNABORTED') {
        setCreateError('Quiz generation is taking longer than expected. Try a simpler topic or try again.');
      } else {
        setCreateError(msg);
      }
    } finally {
      setCreating(false);
    }
  }

  function handleQuickPlay() {
    if (challenges.length > 0) {
      router.push(`/play/${challenges[0].id}`);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center"
            >
              <Zap className="w-5 h-5 text-white" />
            </motion.div>
            <span className="font-bold text-xl text-gray-900">QuizCult</span>
          </div>
          <div className="flex items-center gap-3">
            <StreakBadge streak={streak} />
            <div className="flex items-center gap-1 bg-brand-50 px-2 py-1 rounded-full">
              <Trophy className="w-4 h-4 text-brand-500" />
              <span className="text-sm font-semibold text-brand-600">Lv. {level}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className="text-2xl font-bold text-gray-900">Prove You Know It</h1>
          <p className="text-sm text-gray-500">Challenge your friends. Flex your knowledge.</p>
        </motion.div>

        {/* Create Quiz CTA */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCreate(true)}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-purple-200"
        >
          <Sparkles className="w-5 h-5" />
          Create Quiz from Any Topic
        </motion.button>

        {/* Create Modal */}
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4"
          >
            <h3 className="font-bold text-lg">Create Your Own Quiz</h3>
            <p className="text-sm text-gray-500">
              Type any topic, news, event, or person. AI will generate questions in 30 seconds.
            </p>

            <form onSubmit={handleCreateQuiz} className="space-y-3">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., RCB vs CSK last night, Kalki movie, Elon Musk..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-500 focus:outline-none"
                disabled={creating}
              />

              {createError && (
                <p className="text-sm text-red-600">{createError}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  disabled={creating}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !topic.trim()}
                  className="flex-1 bg-brand-500 text-white py-2 rounded-xl font-medium disabled:opacity-50"
                >
                  {creating ? 'Generating...' : 'Create Quiz'}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleQuickPlay}
            disabled={challenges.length === 0}
            className="bg-brand-500 text-white py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Flame className="w-4 h-4" />
            Quick Play
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={fetchChallenges}
            disabled={loading}
            className="bg-white border-2 border-gray-200 text-gray-700 py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            {loading ? 'Loading...' : 'Refresh'}
          </motion.button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            <p className="font-medium">{error}</p>
            <button onClick={fetchChallenges} className="mt-2 underline font-medium">Retry</button>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg text-gray-900">🔥 Challenges</h2>
            <span className="text-xs text-gray-400">{challenges.length} available</span>
          </div>

          <div className="space-y-3">
            {challenges.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No challenges yet. Check back soon!</p>
                <button onClick={fetchChallenges} className="mt-3 text-brand-500 font-medium">Retry</button>
              </div>
            ) : (
              challenges.map((c, i) => (
                <ChallengeCard
                  key={c.id}
                  id={c.id}
                  title={c.title}
                  category={c.category}
                  playCount={c.play_count}
                  difficulty={c.difficulty}
                  isHot={i < 2}
                  index={i}
                />
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900">🏆 Today's Top Players</h2>
            <span className="text-brand-500 text-sm font-medium">See All</span>
          </div>
          <div className="text-center py-4 text-gray-400 text-sm">No scores yet today. Be the first!</div>
        </div>
      </main>
    </div>
  );
}
