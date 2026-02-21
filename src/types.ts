export interface Question {
  id: string;
  topic_id: string;
  name: string;
  platform: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  link: string;
  completed: number;
  completed_at: string | null;
}

export interface Topic {
  id: string;
  name: string;
  category: 'DSA' | 'LLD';
  video_link: string | null;
  video_watched: number;
  video_watched_at: string | null;
  notes_completed: number;
  notes_completed_at: string | null;
  revision_done: number;
  revision_done_at: string | null;
  order_index: number;
  questions: Question[];
}

export interface DashboardStats {
  totalTopics: number;
  totalQuestions: number;
  completedTopics: number;
  completedQuestions: number;
  overallProgress: number;
}
