'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Zap, Play } from 'lucide-react';

interface Challenge {
  id: string;
  title: string;
  challenge_text: string;
  stat_line: string;
  play_count: number;
  icon: string;
  color: string;
}

const HARDCODED_CARDS: Challenge[] = [
  {
    id: 'ae6eb81c-7a00-457d-a8dd-6009490c8449',
    title: '🤖 AI Reality Check',
    challenge_text: 'Did You Actually Follow AI This Week?',
    stat_line: 'Only 14% score above 8/10',
    play_count: 2400,
    icon: '🤖',
    color: 'from-purple-600 to-pink-600',
  },
  {
    id: 'e6f81b2e-76b8-4e0a-94ec-ca29c2ad5658',
    title: '🏏 Match Memory Test',
    challenge_text: 'Can You Score 10/10?',
    stat_line: 'Average score: 6.2/10',
    play_count: 1800,
    icon: '🏏',
    color: 'from-orange-500 to-red-600',
  },
  {
    id: 'fb61e751-05b8-40f7-9012-17d8841f6728',
    title: '💻 Engineer Reality Check',
    challenge_text: 'Most Developers Fail Question 8',
    stat_line: 'Top scorers: Backend engineers',
    play_count: 3100,
    icon: '💻',
    color: 'from-blue-500 to-cyan-400',
  },
  {
    id: 'ed97cf0f-cab2-4da4-8059-426f316cef3b',
    title: '🎬 Pop Culture Challenge',
    challenge_text: "Think You're Up To Date?",
    stat_line: 'Movie buffs average 7.5/10',
    play_count: 1200,
    icon: '🎬',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    id: '1ff84871-d833-4d84-9bee-f3a5a0646e3f',
    title: '🚀 Startup Radar',
    challenge_text: "Did You Miss This Week's Biggest Stories?",
    stat_line: '2.1k played this today',
    play_count: 2100,
    icon: '🚀',
    color: 'from-amber-500 to-orange-500',
  },
];

export default function Home() {
  const router = useRouter();
  const [cards] = useState<Challenge[]>(HARDCODED_CARDS);
  const [pressedId, setPressedId] = useState<string | null>(null);

  const play = (id: string) => {
    setPressedId(id);
    router.push(`/play/${id}`);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="px-5 pt-14 pb-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">QuizCult</span>
        </div>

        <h1 className="text-4xl font-black leading-none mb-2">
          Prove<br />You Know It.
        </h1>
        <p className="text-white/50 text-sm">
          Challenge friends. Flex your knowledge.
        </p>
      </div>

      {/* 🔥 HOT RIGHT NOW */}
      <div className="px-5 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-orange-400 text-sm font-bold tracking-wider">🔥 HOT RIGHT NOW</span>
        </div>
      </div>

      {/* Challenge Cards */}
      <div className="flex-1 px-5 space-y-3 pb-28">
        {cards.map((card, i) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => play(card.id)}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.color} p-5 cursor-pointer`}
          >
            {/* Gloss effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{card.icon}</span>
                <span className="text-white/60 text-xs font-medium bg-black/20 px-2 py-1 rounded-full">
                  {(card.play_count / 1000).toFixed(1)}k plays
                </span>
              </div>

              <h2 className="text-lg font-bold mb-0.5">{card.title}</h2>
              <p className="text-white/80 text-sm mb-2">{card.challenge_text}</p>
              <p className="text-white/50 text-xs">{card.stat_line}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black via-black/90 to-transparent">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => play(cards[0].id)}
          className="w-full bg-white text-black py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-2xl shadow-white/10"
        >
          <Play className="w-5 h-5 fill-current" />
          PLAY NOW
        </motion.button>
      </div>
    </div>
  );
}
