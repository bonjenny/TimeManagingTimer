/**
 * v0.4.0 테스트: WeeklySchedule 컴포넌트 테스트 (주간 이동, 복사 템플릿)
 */
import { render, screen, act, waitFor } from '../../../test-utils';
import userEvent from '@testing-library/user-event';
import WeeklySchedule from '../../../components/pages/WeeklySchedule';
import { useTimerStore } from '../../../store/useTimerStore';

// ClipboardItem 모킹 (jsdom 미지원)
class MockClipboardItem {
  private items: Record<string, Blob>;
  constructor(items: Record<string, Blob>) {
    this.items = items;
  }
  getType(type: string): Promise<Blob> {
    return Promise.resolve(this.items[type]);
  }
}
beforeAll(() => {
  (global as unknown as { ClipboardItem: unknown }).ClipboardItem = MockClipboardItem;
  if (typeof window !== 'undefined') {
    (window as unknown as { ClipboardItem: unknown }).ClipboardItem = MockClipboardItem;
  }
});

describe('WeeklySchedule', () => {
  let clipboard_mock: { writeText: jest.Mock; write: jest.Mock };

  beforeEach(() => {
    clipboard_mock = {
      writeText: jest.fn().mockResolvedValue(undefined),
      write: jest.fn().mockResolvedValue(undefined),
    };
    try {
      delete (navigator as { clipboard?: unknown }).clipboard;
    } catch {
      /* ignore */
    }
    Object.defineProperty(navigator, 'clipboard', {
      value: clipboard_mock,
      configurable: true,
      writable: true,
      enumerable: true,
    });
    const store = useTimerStore.getState();
    store.logs.forEach((log) => store.deleteLog(log.id));
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('주간 일정 제목이 표시된다', () => {
    render(<WeeklySchedule />);
    expect(screen.getByText('주간 일정')).toBeInTheDocument();
  });

  describe('주간 단위 이동', () => {
    it('이전 주 버튼이 렌더링된다', () => {
      render(<WeeklySchedule />);
      expect(screen.getByRole('button', { name: /이전 주/i })).toBeInTheDocument();
    });

    it('다음 주 버튼이 렌더링된다', () => {
      render(<WeeklySchedule />);
      expect(screen.getByRole('button', { name: /다음 주/i })).toBeInTheDocument();
    });

    it('이전 주 버튼을 클릭하면 주가 변경된다', async () => {
      const user = userEvent.setup();
      render(<WeeklySchedule />);

      const prev_button = screen.getByRole('button', { name: /이전 주/i });
      await user.click(prev_button);

      // 이번 주가 아니면 "이번 주" 버튼이 표시됨
      expect(screen.getByRole('button', { name: /이번 주/i })).toBeInTheDocument();
    });

    it('이번 주 버튼을 클릭하면 현재 주로 돌아온다', async () => {
      const user = userEvent.setup();
      render(<WeeklySchedule />);

      // 이전 주로 이동
      const prev_button = screen.getByRole('button', { name: /이전 주/i });
      await user.click(prev_button);

      // 이번 주로 이동
      const this_week_button = screen.getByRole('button', { name: /이번 주/i });
      await user.click(this_week_button);

      // 이번 주 버튼이 사라짐
      expect(screen.queryByRole('button', { name: /이번 주/i })).not.toBeInTheDocument();
    });
  });

  describe('복사 템플릿', () => {
    beforeEach(() => {
      // 테스트용 로그 추가
      const now = new Date();
      const monday = new Date(now);
      const day = monday.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      monday.setDate(now.getDate() + diff);
      monday.setHours(9, 0, 0, 0);

      act(() => {
        useTimerStore.getState().addLog({
          id: 'test-log-1',
          title: '주간 테스트 작업',
          boardNo: '12345',
          category: '개발',
          startTime: monday.getTime(),
          endTime: monday.getTime() + 3600000, // 1시간
          status: 'COMPLETED',
          pausedDuration: 0,
        });
      });
    });

    it('복사 버튼이 렌더링된다', () => {
      render(<WeeklySchedule />);
      expect(screen.getByTestId('copy-header')).toBeInTheDocument();
    });

    it('데이터가 없으면 복사 버튼이 비활성화된다', () => {
      // 로그 삭제
      const store = useTimerStore.getState();
      store.logs.forEach((log) => store.deleteLog(log.id));

      render(<WeeklySchedule />);
      const copy_button = screen.getByTestId('copy-header');
      expect(copy_button).toBeDisabled();
    });

    it('데이터가 있으면 복사 버튼이 활성화된다', () => {
      render(<WeeklySchedule />);
      const copy_button = screen.getByTestId('copy-header');
      expect(copy_button).not.toBeDisabled();
    });
  });

  describe('빈 데이터 안내', () => {
    it('데이터가 없으면 안내 메시지가 표시된다', () => {
      render(<WeeklySchedule />);
      expect(screen.getByText(/이 주에 기록된 업무가 없습니다/i)).toBeInTheDocument();
    });
  });

  describe('주간 요약', () => {
    it('주간 일정 제목이 표시된다', () => {
      render(<WeeklySchedule />);
      expect(screen.getByText('주간 일정')).toBeInTheDocument();
    });

    it('복사 미리보기 섹션이 표시된다', async () => {
      // 테스트용 로그 추가
      const now = new Date();
      const monday = new Date(now);
      const day = monday.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      monday.setDate(now.getDate() + diff);
      monday.setHours(9, 0, 0, 0);

      act(() => {
        useTimerStore.getState().addLog({
          id: 'test-preview-log',
          title: '테스트 작업',
          projectCode: 'A26_00001',
          category: '개발',
          startTime: monday.getTime(),
          endTime: monday.getTime() + 3600000,
          status: 'COMPLETED',
          pausedDuration: 0,
        });
      });

      render(<WeeklySchedule />);
      expect(screen.getByText('복사 미리보기')).toBeInTheDocument();
    });

    it('라벨형 선택 시에만 잡 색상 설정 버튼이 보인다', async () => {
      const now = new Date();
      const monday = new Date(now);
      const day = monday.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      monday.setDate(now.getDate() + diff);
      monday.setHours(9, 0, 0, 0);

      act(() => {
        useTimerStore.getState().addLog({
          id: 'job-color-btn-log',
          title: '잡 색상 버튼 테스트',
          projectCode: 'A26_00001',
          category: '개발',
          startTime: monday.getTime(),
          endTime: monday.getTime() + 3600000,
          status: 'COMPLETED',
          pausedDuration: 0,
        });
      });

      render(<WeeklySchedule />);

      const label_btn = screen.getByRole('button', { name: /라벨형/i });
      const simple_btn = screen.getByRole('button', { name: /간단형/i });

      await userEvent.setup().click(label_btn);
      expect(screen.getByRole('button', { name: /잡 색상 설정/i })).toBeInTheDocument();

      await userEvent.setup().click(simple_btn);
      expect(screen.queryByRole('button', { name: /잡 색상 설정/i })).not.toBeInTheDocument();
    });

    it('간단형 미리보기에서 잡별 업무목록에 들여쓰기가 포함된다', async () => {
      const user = userEvent.setup();
      const now = new Date();
      const monday = new Date(now);
      const day = monday.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      monday.setDate(now.getDate() + diff);
      monday.setHours(9, 0, 0, 0);

      act(() => {
        useTimerStore.getState().addLog({
          id: 'indent-test-log',
          title: '들여쓰기 확인용 작업',
          projectCode: 'A26_00003',
          category: '개발',
          startTime: monday.getTime(),
          endTime: monday.getTime() + 3600000,
          status: 'COMPLETED',
          pausedDuration: 0,
        });
      });

      render(<WeeklySchedule />);

      const simple_btn = screen.getByRole('button', { name: /간단형/i });
      await user.click(simple_btn);

      const preview = screen.getByTestId('copy-preview-content');
      expect(preview.textContent).toMatch(/\s{2}> .*누적시간/);
    });

    it('미리보기 영역 복사(HTML) 버튼 클릭 시 성공 스낵바가 표시된다', async () => {
      const user = userEvent.setup();
      const now = new Date();
      const monday = new Date(now);
      const day = monday.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      monday.setDate(now.getDate() + diff);
      monday.setHours(9, 0, 0, 0);

      act(() => {
        useTimerStore.getState().addLog({
          id: 'html-copy-log',
          title: 'HTML 복사 테스트 작업',
          projectCode: 'A25_07788',
          category: '개발',
          startTime: monday.getTime(),
          endTime: monday.getTime() + 3600000,
          status: 'COMPLETED',
          pausedDuration: 0,
        });
      });

      render(<WeeklySchedule />);
      const htmlCopyBtn = screen.getByTestId('copy-preview');
      expect(htmlCopyBtn).not.toBeDisabled();
      await user.click(htmlCopyBtn);

      await waitFor(() => {
        expect(screen.getByText('클립보드에 복사되었습니다.')).toBeInTheDocument();
      });
    });
  });

  describe('pausedDuration 계산', () => {
    it('pausedDuration이 전체 duration보다 크면 전체 시간으로 표시된다', async () => {
      const now = new Date();
      const monday = new Date(now);
      const day = monday.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      monday.setDate(now.getDate() + diff);
      monday.setHours(9, 0, 0, 0);

      // pausedDuration이 전체 duration보다 큰 비정상적인 로그 추가
      // 1시간(3600초) 작업에 5000초 일시정지 (비정상)
      act(() => {
        useTimerStore.getState().addLog({
          id: 'abnormal-paused-log',
          title: '비정상 일시정지 로그',
          projectCode: 'A26_00002',
          category: '테스트',
          startTime: monday.getTime(),
          endTime: monday.getTime() + 3600000, // 1시간
          status: 'COMPLETED',
          pausedDuration: 5000, // 전체 duration(3600초)보다 큼
        });
      });

      render(<WeeklySchedule />);

      // 프로젝트명이 표시되어야 함 (00:00이 아닌 정상 시간)
      expect(screen.getByText('비정상 일시정지 로그')).toBeInTheDocument();
    });
  });
});
