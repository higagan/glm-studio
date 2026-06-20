'use client';

import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  if (streak === 0) return null;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-full"
    >
      <Zap className="w-4 h-4 text-orange-500" />
      <span className="text-sm font-bold text-orange-600">{streak}</span>
    </motion.div>
  );
}
