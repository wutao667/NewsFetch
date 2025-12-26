
export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

export interface SearchState {
  query: string;
  results: NewsItem[];
  isLoading: boolean;
  error: string | null;
  summary: string | null;
  isSummarizing: boolean;
}

export type View = 'home' | 'results';
