const STORAGE_KEY = 'kcal-notes';

const defaultData = () => ({
  goals: { kcal: 0, prot: 0, carb: 0, fat: 0 },
  favs: [],
  entries: {},
  products: [],
});

export const store = {
  load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (_) {
      return {};
    }
  },

  save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  init() {
    const saved = this.load();
    const fallback = defaultData();
    const data = {
      goals: saved.goals || fallback.goals,
      favs: Array.isArray(saved.favs) ? saved.favs : fallback.favs,
      entries: saved.entries && typeof saved.entries === 'object' ? saved.entries : fallback.entries,
      products: Array.isArray(saved.products) ? saved.products : fallback.products,
    };

    this.save(data);
    return data;
  },
};
