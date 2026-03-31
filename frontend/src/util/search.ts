const RECENT_SEARCHES_KEY = 'recent_user_searches';
const MAX_RECENT_COUNT = 10;

export const searchUtil = {
  getRecentSearches: (): string[] => {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    return saved ? JSON.parse(saved) : [];
  },

  addRecentSearch: (keyword: string) => {
    if (!keyword.trim()) return;
    const current = searchUtil.getRecentSearches();
    const updated = [
      keyword,
      ...current.filter((item) => item !== keyword)
    ].slice(0, MAX_RECENT_COUNT);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  },

  removeRecentSearch: (keyword: string) => {
    const current = searchUtil.getRecentSearches();
    const updated = current.filter((item) => item !== keyword);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  },

  clearRecentSearches: () => {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  }
};
