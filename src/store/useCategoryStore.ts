import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

interface CategoryState {
  categories: string[];
  
  // --- Actions ---
  addCategory: (category: string) => void;
  removeCategory: (category: string) => void;
  updateCategory: (oldCategory: string, newCategory: string) => void;
  reorderCategories: (categories: string[]) => void;
  resetToDefault: () => void;
}

// ----------------------------------------------------------------------
// Default Categories
// ----------------------------------------------------------------------

export const DEFAULT_CATEGORIES = [
  '분석',
  '개발',
  '개발자테스트',
  '테스트오류수정',
  '센터오류수정',
  '환경세팅',
  '회의',
  '기타'
];

// ----------------------------------------------------------------------
// Store Implementation
// ----------------------------------------------------------------------

const STORAGE_KEY = 'timekeeper-categories';

export const useCategoryStore = create<CategoryState>()(
  persist(
    (set, get) => ({
      categories: [...DEFAULT_CATEGORIES],
      
      addCategory: (category) => {
        const trimmed = category.trim();
        if (!trimmed) return;
        
        const { categories } = get();
        // 중복 체크 (대소문자 무시)
        if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
          return;
        }
        set({ categories: [...categories, trimmed] });
      },
      
      removeCategory: (category) => {
        const { categories } = get();
        set({ categories: categories.filter(c => c !== category) });
      },
      
      updateCategory: (oldCategory, newCategory) => {
        const trimmed = newCategory.trim();
        if (!trimmed) return;
        
        const { categories } = get();
        set({
          categories: categories.map(c => c === oldCategory ? trimmed : c)
        });
      },
      
      reorderCategories: (categories) => {
        set({ categories });
      },
      
      resetToDefault: () => {
        set({ categories: [...DEFAULT_CATEGORIES] });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    }
  )
);
