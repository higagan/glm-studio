'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Play, Trophy } from 'lucide-react';
import { api } from '@/lib/api';

export default function ChallengePage() {
  const { token } = useParams();
  const router = useRouter();
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/gameplay/challenge/${token}`).then((res) => {
      setInfo(res.data);
      setLoading(false);
    });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!info) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-5 text-center">
        <p className="text-white/50">Challenge not found.</p>
        <button
          onClick={() => router.push('/')}
          className="mt-4 px-6 py-3 bg-white/10 rounded-2xl font-semibold"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-5 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-6"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl flex items-center justify-center text-4xl">
            🏆
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-bold mb-2"
        >
          {info.challenge_title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-white/60 mb-6"
        >
          Someone scored{' '}
          <span className="text-white font-bold">
            {info.original_score}/{info.original_total}
          </span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 rounded-2xl p-4 mb-8 max-w-xs"
        >
          <div className="flex items-center gap-2 justify-center mb-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-sm">Rank #{info.original_rank} Today</span>
          </div>
          {info.original_summary && (
            <p className="text-white/50 italic text-sm">"{info.original_summary}"</p>
          )}
        </motion.div>
      </div>

      <div className="p-5 pb-10">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push(`/play/${info.challenge_id}?challenge=${token}`)}
          className="w-full bg-white text-black py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5" />
          ACCEPT CHALLENGE
        </motion.button>
      </div>
    </div>
  );
}
