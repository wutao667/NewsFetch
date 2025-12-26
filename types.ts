
export type TimeRange = '1d' | '3d' | '7d' | '30d';

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

export interface SearchState {
  query: string;
  timeRange: TimeRange;
  results: NewsItem[];
  isLoading: boolean;
  error: string | null;
  summary: string | null;
  isSummarizing: boolean;
}

export type View = 'home' | 'results' | 'debug';
