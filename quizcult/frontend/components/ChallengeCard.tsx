'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Play, Flame } from 'lucide-react';

interface ChallengeCardProps {
  id: string;
  title: string;
  category: string;
  playCount: number;
  difficulty: string;
  isHot: boolean;
  index?: number;
}

export function ChallengeCard({ id, title, playCount, difficulty, isHot, index = 0 }: ChallengeCardProps) {
  const difficultyColor = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-red-100 text-red-700',
  }[difficulty] || 'bg-gray-100 text-gray-700';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 hover:border-brand-200 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            {isHot && (
              <span className="flex items-center gap-1 bg-orange-100 text-orange-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                <Flame className="w-3 h-3" />
                HOT
              </span>
            )}
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${difficultyColor}`}>
              {difficulty}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 leading-tight">{title}</h3>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {playCount.toLocaleString()} plays
        </span>
        <Link
          href={`/play/${id}`}
          className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          <Play className="w-4 h-4" />
          Play Now
        </Link>
      </div>
    </motion.div>
  );
}
