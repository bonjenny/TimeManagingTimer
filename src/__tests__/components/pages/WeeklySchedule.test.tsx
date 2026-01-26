/**
 * v0.4.0 테스트: WeeklySchedule 컴포넌트 테스트 (주간 이동, 복사 템플릿)
 */
import { render, screen, act } from '../../../test-utils';
import userEvent from '@testing-library/user-event';
import WeeklySchedule from '../../../components/pages/WeeklySchedule';
import { useTimerStore } from '../../../store/useTimerStore';

// 클립보드 모킹
const mockClipboard = {
  writeText: jest.fn().mockResolvedValue(undefined),
};
Object.assign(navigator, { clipboard: mockClipboard });

describe('WeeklySchedule', () => {
  beforeEach(() => {
    // 스토어 초기화
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

    it('템플릿 복사 버튼이 렌더링된다', () => {
      render(<WeeklySchedule />);
      expect(screen.getByRole('button', { name: /템플릿 복사/i })).toBeInTheDocument();
    });

    it('데이터가 없으면 템플릿 복사 버튼이 비활성화된다', () => {
      // 로그 삭제
      const store = useTimerStore.getState();
      store.logs.forEach((log) => store.deleteLog(log.id));

      render(<WeeklySchedule />);
      const copy_button = screen.getByRole('button', { name: /템플릿 복사/i });
      expect(copy_button).toBeDisabled();
    });

    it('템플릿 복사 버튼을 클릭하면 메뉴가 열린다', async () => {
      const user = userEvent.setup();
      render(<WeeklySchedule />);

      const copy_button = screen.getByRole('button', { name: /템플릿 복사/i });
      await user.click(copy_button);

      expect(screen.getByText('상세형 템플릿')).toBeInTheDocument();
      expect(screen.getByText('요약형 템플릿')).toBeInTheDocument();
    });

    it('상세형 템플릿을 선택하면 클립보드에 복사된다', async () => {
      const user = userEvent.setup();
      render(<WeeklySchedule />);

      const copy_button = screen.getByRole('button', { name: /템플릿 복사/i });
      await user.click(copy_button);

      const detailed_option = screen.getByText('상세형 템플릿');
      await user.click(detailed_option);

      expect(mockClipboard.writeText).toHaveBeenCalled();
    });

    it('요약형 템플릿을 선택하면 클립보드에 복사된다', async () => {
      const user = userEvent.setup();
      render(<WeeklySchedule />);

      const copy_button = screen.getByRole('button', { name: /템플릿 복사/i });
      await user.click(copy_button);

      const summary_option = screen.getByText('요약형 템플릿');
      await user.click(summary_option);

      expect(mockClipboard.writeText).toHaveBeenCalled();
    });
  });

  describe('카테고리별 시각화', () => {
    it('카테고리별 업무 시간 섹션이 표시된다', () => {
      render(<WeeklySchedule />);
      expect(screen.getByText('카테고리별 업무 시간')).toBeInTheDocument();
    });

    it('데이터가 없으면 안내 메시지가 표시된다', () => {
      render(<WeeklySchedule />);
      expect(screen.getByText(/이 주에 기록된 업무가 없습니다/i)).toBeInTheDocument();
    });
  });

  describe('CSV 다운로드', () => {
    it('CSV 다운로드 버튼이 렌더링된다', () => {
      render(<WeeklySchedule />);
      expect(screen.getByRole('button', { name: /CSV 다운로드/i })).toBeInTheDocument();
    });
  });

  describe('주간 요약', () => {
    it('주간 총 업무 시간이 표시된다', () => {
      render(<WeeklySchedule />);
      expect(screen.getByText('주간 총 업무 시간')).toBeInTheDocument();
    });
  });
});
