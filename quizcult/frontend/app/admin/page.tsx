'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Share2, Target, Activity } from 'lucide-react';
import { api } from '@/lib/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const statsRes = await api.get('/analytics/stats');
      setStats(statsRes.data);

      const eventsRes = await api.get('/analytics/events?limit=50');
      setEvents(eventsRes.data.reverse());
    } catch (e) {
      console.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const StatCard = ({ label, value, icon: Icon, color }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-6 border border-gray-100"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">{label}</span>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="text-3xl font-bold text-gray-900">{value ?? 0}</div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <h1 className="text-xl font-bold">QuizCult Analytics</h1>
        <p className="text-sm text-gray-500">Real-time viral loop metrics</p>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Quizzes Played"
            value={stats?.quizzes_played}
            icon={Activity}
            color="text-brand-500"
          />
          <StatCard
            label="Challenges Created"
            value={stats?.challenges_created}
            icon={Share2}
            color="text-accent-purple"
          />
          <StatCard
            label="Challenges Completed"
            value={stats?.challenges_completed}
            icon={Target}
            color="text-accent-green"
          />
          <StatCard
            label="Acceptance Rate"
            value={`${stats?.challenge_acceptance_rate ?? 0}%`}
            icon={TrendingUp}
            color="text-accent-orange"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">Shares</div>
            <div className="text-2xl font-bold">{stats?.shares ?? 0}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">Shares / User</div>
            <div className="text-2xl font-bold">{stats?.shares_per_user ?? 0}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">Total Events</div>
            <div className="text-2xl font-bold">{stats?.total_events ?? 0}</div>
          </div>
        </div>

        {/* Recent Events */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold">Recent Events</h2>
          </div>
          <div className="divide-y divide-gray-50 max-h-96 overflow-auto">
            {events.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-400">No events yet. Start playing!</div>
            ) : (
              events.map((event: any, i: number) => (
                <div key={i} className="px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        event.event_type.includes('challenge')
                          ? 'bg-accent-purple'
                          : event.event_type.includes('share')
                          ? 'bg-accent-green'
                          : 'bg-brand-500'
                      }`}
                    />
                    <span className="text-sm font-medium">{event.event_type}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
