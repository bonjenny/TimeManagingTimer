/**
 * v0.2.0 테스트: GanttChart 컴포넌트 테스트 (날짜 이동, Resize)
 */
import { render, screen, fireEvent, act } from '../../../test-utils';
import userEvent from '@testing-library/user-event';
import GanttChart from '../../../components/gantt/GanttChart';
import { useTimerStore } from '../../../store/useTimerStore';

describe('GanttChart', () => {
  beforeEach(() => {
    // 스토어 초기화
    const store = useTimerStore.getState();
    store.logs.forEach((log) => store.deleteLog(log.id));
    if (store.activeTimer) {
      store.completeTimer();
    }
    localStorage.clear();
  });

  it('일간 타임라인 제목이 표시된다', () => {
    render(<GanttChart />);
    expect(screen.getByText('일간 타임라인')).toBeInTheDocument();
  });

  describe('날짜 이동', () => {
    it('이전 날짜 버튼이 렌더링된다', () => {
      render(<GanttChart />);
      expect(screen.getByRole('button', { name: /이전 날짜/i })).toBeInTheDocument();
    });

    it('다음 날짜 버튼이 렌더링된다', () => {
      render(<GanttChart />);
      expect(screen.getByRole('button', { name: /다음 날짜/i })).toBeInTheDocument();
    });

    it('이전 날짜 버튼을 클릭하면 날짜가 하루 전으로 변경된다', async () => {
      const user = userEvent.setup();
      render(<GanttChart />);

      const today = new Date();
      const prev_button = screen.getByRole('button', { name: /이전 날짜/i });
      await user.click(prev_button);

      // 오늘이 아니므로 "오늘로 이동" 버튼이 표시되어야 함
      expect(screen.getByRole('button', { name: /오늘로 이동/i })).toBeInTheDocument();
    });

    it('오늘이 아닌 경우 "오늘로 이동" 버튼이 표시된다', async () => {
      const user = userEvent.setup();
      render(<GanttChart />);

      const prev_button = screen.getByRole('button', { name: /이전 날짜/i });
      await user.click(prev_button);

      expect(screen.getByRole('button', { name: /오늘로 이동/i })).toBeInTheDocument();
    });

    it('"오늘로 이동" 버튼을 클릭하면 오늘로 돌아온다', async () => {
      const user = userEvent.setup();
      render(<GanttChart />);

      // 이전 날짜로 이동
      const prev_button = screen.getByRole('button', { name: /이전 날짜/i });
      await user.click(prev_button);

      // 오늘로 이동
      const today_button = screen.getByRole('button', { name: /오늘로 이동/i });
      await user.click(today_button);

      // "오늘로 이동" 버튼이 사라져야 함
      expect(screen.queryByRole('button', { name: /오늘로 이동/i })).not.toBeInTheDocument();
    });
  });

  describe('작업 막대', () => {
    it('완료된 작업이 있으면 막대가 표시된다', () => {
      // 타이머 기록 추가
      const now = new Date();
      const start_time = new Date(now);
      start_time.setHours(9, 0, 0, 0);
      const end_time = new Date(now);
      end_time.setHours(10, 0, 0, 0);

      act(() => {
        useTimerStore.getState().addLog({
          id: 'test-log-1',
          title: '테스트 작업',
          startTime: start_time.getTime(),
          endTime: end_time.getTime(),
          status: 'COMPLETED',
          pausedDuration: 0,
        });
      });

      render(<GanttChart />);
      expect(screen.getByText('테스트 작업')).toBeInTheDocument();
    });

    it('진행 중인 타이머가 있으면 막대가 표시된다', () => {
      act(() => {
        useTimerStore.getState().startTimer('진행 중 작업');
      });

      render(<GanttChart />);
      expect(screen.getByText('진행 중 작업')).toBeInTheDocument();
    });
  });

  describe('시간축', () => {
    it('시간 라벨이 표시된다 (06:00, 08:00 등)', () => {
      render(<GanttChart />);
      expect(screen.getByText('06:00')).toBeInTheDocument();
      expect(screen.getByText('12:00')).toBeInTheDocument();
      expect(screen.getByText('18:00')).toBeInTheDocument();
    });
  });
});
