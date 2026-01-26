/**
 * v0.1.0 테스트: ActiveTimer 컴포넌트 테스트
 */
import { render, screen, act } from '../../../test-utils';
import userEvent from '@testing-library/user-event';
import ActiveTimer from '../../../components/timer/ActiveTimer';
import { useTimerStore } from '../../../store/useTimerStore';

describe('ActiveTimer', () => {
  beforeEach(() => {
    // 스토어 초기화
    const store = useTimerStore.getState();
    if (store.activeTimer) {
      store.completeTimer();
    }
    localStorage.clear();
  });

  it('활성 타이머가 없으면 null을 렌더링한다', () => {
    const { container } = render(<ActiveTimer />);
    expect(container.firstChild).toBeNull();
  });

  it('활성 타이머가 있으면 작업 제목이 표시된다', () => {
    act(() => {
      useTimerStore.getState().startTimer('테스트 작업');
    });

    render(<ActiveTimer />);
    expect(screen.getByText('테스트 작업')).toBeInTheDocument();
  });

  it('일시정지 버튼을 클릭하면 타이머가 일시정지된다', async () => {
    const user = userEvent.setup();
    act(() => {
      useTimerStore.getState().startTimer('테스트 작업');
    });

    render(<ActiveTimer />);

    const pause_button = screen.getByRole('button', { name: /일시정지/i });
    await user.click(pause_button);

    const { activeTimer } = useTimerStore.getState();
    expect(activeTimer?.status).toBe('PAUSED');
  });

  it('일시정지 상태에서 재개 버튼을 클릭하면 타이머가 재개된다', async () => {
    const user = userEvent.setup();
    act(() => {
      useTimerStore.getState().startTimer('테스트 작업');
      useTimerStore.getState().pauseTimer();
    });

    render(<ActiveTimer />);

    const resume_button = screen.getByRole('button', { name: /재개/i });
    await user.click(resume_button);

    const { activeTimer } = useTimerStore.getState();
    expect(activeTimer?.status).toBe('RUNNING');
  });

  it('완료 버튼을 클릭하면 타이머가 완료된다', async () => {
    const user = userEvent.setup();
    act(() => {
      useTimerStore.getState().startTimer('테스트 작업');
    });

    render(<ActiveTimer />);

    const complete_button = screen.getByRole('button', { name: /완료/i });
    await user.click(complete_button);

    const { activeTimer, logs } = useTimerStore.getState();
    expect(activeTimer).toBeNull();
    expect(logs.length).toBe(1);
    expect(logs[0].status).toBe('COMPLETED');
  });

  it('경과 시간이 HH:MM:SS 형식으로 표시된다', () => {
    act(() => {
      useTimerStore.getState().startTimer('테스트 작업');
    });

    render(<ActiveTimer />);

    // 초기 시간은 00:00:00
    expect(screen.getByText(/00:00/)).toBeInTheDocument();
  });
});
