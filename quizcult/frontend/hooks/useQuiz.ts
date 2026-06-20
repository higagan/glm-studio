import { useState, useCallback } from 'react';
import { startPlay, submitAnswers } from '@/lib/api';

interface UseQuizReturn {
  isLoading: boolean;
  error: string | null;
  startQuiz: (challengeId: string) => Promise<any>;
  submitQuiz: (playId: string, answers: any[]) => Promise<any>;
}

export function useQuiz(): UseQuizReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startQuiz = useCallback(async (challengeId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await startPlay(challengeId);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start quiz');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitQuiz = useCallback(async (playId: string, answers: any[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await submitAnswers(playId, answers);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit answers');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, error, startQuiz, submitQuiz };
}
