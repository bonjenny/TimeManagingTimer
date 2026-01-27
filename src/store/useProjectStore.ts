import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

export interface Project {
  code: string;     // 프로젝트 코드 (예: "A25_01846")
  name: string;     // 프로젝트 명 (예: "5.6 프레임워크 FE")
}

interface ProjectState {
  projects: Project[];
  
  // --- Actions ---
  addProject: (project: Project) => void;
  updateProject: (code: string, updates: Partial<Project>) => void;
  deleteProject: (code: string) => void;
  
  // --- Selectors ---
  getProjectByCode: (code: string) => Project | undefined;
  getProjectName: (code: string) => string;  // 코드로 이름 조회, 없으면 코드 반환
  getRecentProjects: () => Project[];       // 최근 사용된 프로젝트
}

// ----------------------------------------------------------------------
// Store Implementation
// ----------------------------------------------------------------------

const STORAGE_KEY = 'timekeeper-projects';

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [] as Project[],
      
      addProject: (project) => {
        // 유효성 검사: code와 name이 모두 있어야 함
        if (!project?.code || !project?.name) {
          return;
        }
        
        const { projects } = get();
        // 중복 코드 체크
        const existing = projects.find(p => p.code === project.code);
        if (existing) {
          // 기존 프로젝트가 있으면 이름 업데이트
          set({
            projects: projects.map(p => 
              p.code === project.code ? { ...p, name: project.name } : p
            )
          });
        } else {
          // 새 프로젝트 추가 (최신 순으로 앞에 추가)
          set({ projects: [project, ...projects] });
        }
      },
      
      updateProject: (code, updates) => set((state) => ({
        projects: state.projects.map(p => 
          p.code === code ? { ...p, ...updates } : p
        )
      })),
      
      deleteProject: (code) => set((state) => ({
        projects: state.projects.filter(p => p.code !== code)
      })),
      
      getProjectByCode: (code) => {
        const { projects } = get();
        return projects.find(p => p.code === code);
      },
      
      getProjectName: (code) => {
        if (!code) return '';
        const { projects } = get();
        const project = projects.find(p => p.code === code);
        return project?.name || code;
      },
      
      getRecentProjects: () => {
        const { projects } = get();
        return projects.slice(0, 20); // 최근 20개
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // 저장된 데이터 로드 시 잘못된 항목 필터링
      onRehydrateStorage: () => (state) => {
        if (state) {
          // code와 name이 모두 유효한 항목만 유지
          state.projects = state.projects.filter(
            (p) => p && typeof p.code === 'string' && p.code && typeof p.name === 'string' && p.name
          );
        }
      },
    }
  )
);
