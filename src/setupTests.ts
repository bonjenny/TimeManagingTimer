import '@testing-library/jest-dom';

jest.mock('./lib/firebase', () => ({
  db: {},
  default: {},
}));

jest.mock('./utils/env', () => ({
  getAdminPassword: () => '0000',
}));

jest.mock('./services/feedbackService', () => ({
  fetchPosts: jest.fn().mockResolvedValue([]),
  createPost: jest.fn().mockResolvedValue(null),
  updatePost: jest.fn().mockResolvedValue(false),
  updatePostWithFieldDelete: jest.fn().mockResolvedValue(false),
  deletePost: jest.fn().mockResolvedValue(false),
  addComment: jest.fn().mockResolvedValue(false),
  deleteComment: jest.fn().mockResolvedValue(false),
  simpleHash: jest.fn((str: string) => String(str.length)),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

jest.mock('./utils/storage', () => ({
  initStorage: () => Promise.resolve(),
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
  removeItem: (key: string) => localStorage.removeItem(key),
  idbStorage: {
    getItem: (name: string) => localStorage.getItem(name),
    setItem: (name: string, value: string) => localStorage.setItem(name, value),
    removeItem: (name: string) => localStorage.removeItem(name),
  },
  getStorageUsage: () => ({ usageKB: '0.0', usageMB: '0.00' }),
  getAllItems: () => {
    const items: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) items[key] = localStorage.getItem(key) || '';
    }
    return items;
  },
  batchSetItems: (items: Record<string, string>) => {
    Object.entries(items).forEach(([key, value]) => localStorage.setItem(key, value));
    return Promise.resolve();
  },
  clearAll: () => { localStorage.clear(); return Promise.resolve(); },
}));

// Mock crypto.randomUUID
Object.defineProperty(window, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
  },
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

beforeEach(() => {
  localStorage.clear();
});
