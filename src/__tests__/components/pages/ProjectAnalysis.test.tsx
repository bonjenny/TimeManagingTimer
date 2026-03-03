import { render, screen, act, waitFor } from '../../../test-utils';
import userEvent from '@testing-library/user-event';
import ProjectAnalysis from '../../../components/pages/ProjectAnalysis';
import { useTimerStore, TimerLog } from '../../../store/useTimerStore';
import { useProjectStore } from '../../../store/useProjectStore';

const createLog = (overrides: Partial<TimerLog> = {}): TimerLog => ({
  id: crypto.randomUUID(),
  title: '설계',
  projectCode: 'PRJ001',
  category: '분석',
  startTime: new Date(2026, 2, 2, 9, 0).getTime(),
  endTime: new Date(2026, 2, 2, 12, 0).getTime(),
  status: 'COMPLETED',
  pausedDuration: 0,
  ...overrides,
});

describe('ProjectAnalysis', () => {
  beforeEach(() => {
    const store = useTimerStore.getState();
    store.logs.forEach((log) => store.deleteLog(log.id));
    store.deleted_logs.forEach((log) => store.permanentlyDeleteLog(log.id));

    const project_store = useProjectStore.getState();
    project_store.addProject({ code: 'PRJ001', name: 'LifeCycle 관리' });

    jest.clearAllMocks();
  });

  it('페이지 타이틀이 렌더링된다', () => {
    render(<ProjectAnalysis />);
    expect(screen.getByText('프로젝트 분석')).toBeInTheDocument();
  });

  it('기간 필터 토글 버튼이 렌더링된다', () => {
    render(<ProjectAnalysis />);
    expect(screen.getByRole('button', { name: '월간' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '분기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '직접 지정' })).toBeInTheDocument();
  });

  it('데이터가 없으면 빈 상태 메시지를 표시한다', () => {
    render(<ProjectAnalysis />);
    expect(screen.getByText('해당 기간에 기록된 업무가 없습니다.')).toBeInTheDocument();
  });

  describe('프로젝트별 시간 분해', () => {
    it('프로젝트 내 작업별 시간을 표시한다', () => {
      const now = new Date();
      const store = useTimerStore.getState();

      act(() => {
        store.addLog(createLog({
          title: '설계',
          startTime: new Date(now.getFullYear(), now.getMonth(), 2, 9, 0).getTime(),
          endTime: new Date(now.getFullYear(), now.getMonth(), 2, 12, 0).getTime(),
        }));
        store.addLog(createLog({
          title: '코드리뷰',
          category: '개발',
          startTime: new Date(now.getFullYear(), now.getMonth(), 2, 13, 0).getTime(),
          endTime: new Date(now.getFullYear(), now.getMonth(), 2, 15, 0).getTime(),
        }));
      });

      render(<ProjectAnalysis />);

      expect(screen.getByText('LifeCycle 관리')).toBeInTheDocument();
      expect(screen.getByText(/2개 카테고리/)).toBeInTheDocument();
      expect(screen.getByText(/2개 작업/)).toBeInTheDocument();
    });

    it('카테고리별 비율 퍼센트가 표시된다', () => {
      const now = new Date();
      const store = useTimerStore.getState();

      act(() => {
        store.addLog(createLog({
          title: '설계',
          category: '분석',
          startTime: new Date(now.getFullYear(), now.getMonth(), 2, 9, 0).getTime(),
          endTime: new Date(now.getFullYear(), now.getMonth(), 2, 12, 0).getTime(),
        }));
        store.addLog(createLog({
          title: '개발작업',
          category: '개발',
          startTime: new Date(now.getFullYear(), now.getMonth(), 2, 13, 0).getTime(),
          endTime: new Date(now.getFullYear(), now.getMonth(), 2, 16, 0).getTime(),
        }));
      });

      render(<ProjectAnalysis />);

      const pct_elements = screen.getAllByText('50.0%');
      expect(pct_elements.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('기간 네비게이션', () => {
    it('이전 달 버튼으로 월이 변경된다', async () => {
      const user = userEvent.setup();
      render(<ProjectAnalysis />);

      const now = new Date();
      const current_label = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
      expect(screen.getByText(current_label)).toBeInTheDocument();

      const prev_button = screen.getByRole('button', { name: /이전 달/i });
      await user.click(prev_button);

      expect(screen.queryByText(current_label)).not.toBeInTheDocument();
    });

    it('분기 모드로 전환할 수 있다', async () => {
      const user = userEvent.setup();
      render(<ProjectAnalysis />);

      await user.click(screen.getByRole('button', { name: '분기' }));

      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3) + 1;
      expect(screen.getByText(`${now.getFullYear()}년 ${quarter}분기`)).toBeInTheDocument();
    });

    it('직접 지정 모드에서 날짜 입력이 표시된다', async () => {
      const user = userEvent.setup();
      render(<ProjectAnalysis />);

      await user.click(screen.getByRole('button', { name: '직접 지정' }));

      await waitFor(() => {
        expect(screen.getByText('~')).toBeInTheDocument();
      });
    });
  });

  describe('세션 드릴다운', () => {
    it('카테고리 → 작업 → 세션 3단계 드릴다운이 동작한다', async () => {
      const now = new Date();
      const user = userEvent.setup();
      const store = useTimerStore.getState();

      act(() => {
        store.addLog(createLog({
          title: '리팩토링',
          category: '개발',
          startTime: new Date(now.getFullYear(), now.getMonth(), 2, 9, 0).getTime(),
          endTime: new Date(now.getFullYear(), now.getMonth(), 2, 12, 0).getTime(),
          note: '코드리뷰 피드백 반영',
        }));
      });

      render(<ProjectAnalysis />);

      // 1단계: 카테고리 행 클릭 (Chip 요소를 특정)
      const category_chips = screen.getAllByText('개발');
      const category_row_chip = category_chips.find(
        (el) => el.closest('.MuiChip-label') !== null
      ) || category_chips[0];
      await user.click(category_row_chip);

      await waitFor(() => {
        expect(screen.getByText('리팩토링')).toBeInTheDocument();
      });

      // 2단계: 작업명 클릭
      const task_row = screen.getByText('리팩토링');
      await user.click(task_row);

      await waitFor(() => {
        expect(screen.getByText('세션 상세 (1건)')).toBeInTheDocument();
        expect(screen.getByText('코드리뷰 피드백 반영')).toBeInTheDocument();
      });
    });
  });

  describe('카테고리별 비율', () => {
    it('카테고리별 비율 바가 렌더링된다', () => {
      const now = new Date();
      const store = useTimerStore.getState();

      act(() => {
        store.addLog(createLog({
          title: '설계',
          category: '분석',
          startTime: new Date(now.getFullYear(), now.getMonth(), 2, 9, 0).getTime(),
          endTime: new Date(now.getFullYear(), now.getMonth(), 2, 12, 0).getTime(),
        }));
        store.addLog(createLog({
          title: '개발',
          category: '개발',
          startTime: new Date(now.getFullYear(), now.getMonth(), 2, 13, 0).getTime(),
          endTime: new Date(now.getFullYear(), now.getMonth(), 2, 15, 0).getTime(),
        }));
      });

      render(<ProjectAnalysis />);

      expect(screen.getByText('카테고리별 비율')).toBeInTheDocument();
    });
  });

  describe('인터럽트 분석', () => {
    it('인터럽트 분석 섹션이 렌더링된다', () => {
      render(<ProjectAnalysis />);
      expect(screen.getByText('인터럽트 분석')).toBeInTheDocument();
    });

    it('키워드 입력 후 분석 결과가 표시된다', async () => {
      const now = new Date();
      const user = userEvent.setup();
      const store = useTimerStore.getState();

      act(() => {
        store.addLog(createLog({
          title: 'TP 대응 - 긴급',
          category: '기타',
          startTime: new Date(now.getFullYear(), now.getMonth(), 3, 14, 0).getTime(),
          endTime: new Date(now.getFullYear(), now.getMonth(), 3, 15, 30).getTime(),
        }));
        store.addLog(createLog({
          title: 'TP 대응 - 환경설정',
          category: '기타',
          startTime: new Date(now.getFullYear(), now.getMonth(), 4, 10, 0).getTime(),
          endTime: new Date(now.getFullYear(), now.getMonth(), 4, 11, 0).getTime(),
        }));
      });

      render(<ProjectAnalysis />);

      const keyword_input = screen.getByPlaceholderText('키워드 입력 (예: TP 대응)');
      await user.type(keyword_input, 'TP 대응');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getAllByText('2건').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/발생 이력/)).toBeInTheDocument();
      });
    });
  });

  describe('복사 및 CSV 다운로드', () => {
    it('복사 버튼이 데이터 없을 때 비활성화된다', () => {
      render(<ProjectAnalysis />);
      const copy_button = screen.getByRole('button', { name: /복사/i });
      expect(copy_button).toBeDisabled();
    });

    it('CSV 버튼이 데이터 없을 때 비활성화된다', () => {
      render(<ProjectAnalysis />);
      const csv_button = screen.getByRole('button', { name: /CSV/i });
      expect(csv_button).toBeDisabled();
    });
  });
});
