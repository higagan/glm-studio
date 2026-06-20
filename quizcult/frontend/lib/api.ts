import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 120 seconds for LLM generation
});

// Simple fetch helper for server components
export async function getChallenges() {
  const res = await fetch(`${API_BASE}/api/challenges/evergreen`, { cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 100)}`);
  }
  return res.json();
}

// Challenges
export const getTrendingChallenges = () => api.get('/challenges/trending');
export const getEvergreenChallenges = () => api.get('/challenges/evergreen');
export const getChallenge = (id: string) => api.get(`/challenges/${id}`);

// Gameplay
export const startPlay = (challengeId: string) =>
  api.post('/gameplay/start', { challenge_id: challengeId });

export const submitAnswers = (playId: string, answers: any[]) =>
  api.post(`/gameplay/${playId}/submit`, answers);

export const getChallengeLinkInfo = async (token: string) => {
  const res = await fetch(`${API_BASE}/api/gameplay/challenge/${token}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Challenge not found');
  return { data: await res.json() };
};

export const acceptChallenge = (token: string) =>
  api.post('/gameplay/challenge/accept', { share_token: token });

export const compareScores = (playId: string, responsePlayId: string) =>
  api.get(`/gameplay/compare/${playId}/${responsePlayId}`);

// Leaderboard
export const getLeaderboard = (period: string, category: string) =>
  api.get(`/leaderboard/${period}/${category}`);

// Users
export const registerUser = (data: any) => api.post('/users/register', data);
export const getUser = (userId: string) => api.get(`/users/me?user_id=${userId}`);
export const getStreak = (userId: string) => api.get(`/users/streak?user_id=${userId}`);

// Analytics
export const trackEvent = (event: any) => api.post('/analytics/track', event);
export const getAnalyticsStats = () => api.get('/analytics/stats');
export const getAnalyticsEvents = (params?: any) => api.get('/analytics/events', { params });

// Sharing
export const getShareCardUrl = (shareToken: string) =>
  `${API_BASE}/api/share/card/${shareToken}.png`;

export const getOgImageUrl = (challengeId: string) =>
  `${API_BASE}/api/share/og/${challengeId}.png`;
