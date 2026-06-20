'use client';

import { motion } from 'framer-motion';
import { Trophy, Target, Zap, Share2, RotateCcw, Users, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface ResultScreenProps {
  score: number;
  totalQuestions: number;
  rank: number | null;
  percentile: number | null;
  aiSummary: string | null;
  xpEarned: number;
  streak: number;
  onPlayAgain: () => void;
  onChallengeFriend: () => void;
  onShare: () => void;
  shareToken?: string;
}

export function ResultScreen({
  score,
  totalQuestions,
  rank,
  percentile,
  aiSummary,
  xpEarned,
  streak,
  onPlayAgain,
  onChallengeFriend,
  onShare,
  shareToken,
}: ResultScreenProps) {
  const isGoodScore = score / totalQuestions >= 0.7;
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (shareToken) {
      const url = `${window.location.origin}/challenge/${shareToken}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 p-4 space-y-6 max-w-lg mx-auto w-full">
        {/* Score Header */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4 pt-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${
              isGoodScore ? 'bg-green-100' : 'bg-yellow-100'
            }`}
          >
            <Trophy
              className={`w-12 h-12 ${isGoodScore ? 'text-green-500' : 'text-yellow-500'}`}
            />
          </motion.div>

          <div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-5xl font-bold text-gray-900"
            >
              {score}/{totalQuestions}
            </motion.div>
            <p className="text-gray-500 mt-1">
              {percentile ? `Top ${percentile.toFixed(0)}% today` : 'Your score'}
            </p>
          </div>

          {rank && (
            <div className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 px-3 py-1 rounded-full text-sm font-semibold">
              <Target className="w-4 h-4" />
              Rank #{rank} Today
            </div>
          )}
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl p-3 text-center space-y-1"
          >
            <div className="font-bold text-2xl text-brand-600">+{xpEarned}</div>
            <div className="text-xs text-gray-400">XP Earned</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-xl p-3 text-center space-y-1"
          >
            <div className="font-bold text-2xl text-gray-900">
              {((score / totalQuestions) * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-gray-400">Accuracy</div>
          </motion.div>
        </div>

        {/* AI Summary */}
        {aiSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-2xl p-4 border border-gray-100"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🤖</span>
              <span className="font-semibold text-gray-900">AI Roasting Session</span>
            </div>
            <p className="text-gray-600 text-sm italic">"{aiSummary}"</p>
          </motion.div>
        )}

        {/* Streak */}
        {streak > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="bg-orange-50 rounded-xl p-3 flex items-center gap-3"
          >
            <span className="text-2xl">🔥</span>
            <div>
              <div className="font-bold text-orange-700">{streak} Day Streak!</div>
              <div className="text-sm text-orange-600">Keep it going!</div>
            </div>
          </motion.div>
        )}

        {/* Challenge Link */}
        {shareToken && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="bg-brand-50 rounded-xl p-4 space-y-2"
          >
            <p className="text-sm font-medium text-brand-800">Challenge Link Ready!</p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/challenge/${shareToken}`}
                className="flex-1 text-xs bg-white border border-brand-200 rounded-lg px-3 py-2 text-gray-600"
              />
              <button
                onClick={handleCopyLink}
                className="bg-brand-500 text-white p-2 rounded-lg"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 space-y-3 bg-white border-t border-gray-100">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onChallengeFriend}
          className="w-full bg-brand-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
        >
          <Users className="w-5 h-5" />
          Challenge a Friend
        </motion.button>

        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onShare}
            className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Share Score
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onPlayAgain}
            className="bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Play Again
          </motion.button>
        </div>
      </div>
    </div>
  );
}
