/**
 * v0.13.5 테스트: ActiveTimer 컴포넌트 테스트
 */
import { render, screen, act, within } from '../../../test-utils';
import userEvent from '@testing-library/user-event';
import ActiveTimer from '../../../components/timer/ActiveTimer';
import { useTimerStore } from '../../../store/useTimerStore';

describe('ActiveTimer', () => {
  beforeEach(() => {
    // 스토어 완전 초기화
    useTimerStore.setState({
      activeTimer: null,
      logs: [],
      deleted_logs: [],
      excludedTitles: [],
      titleColorIndexMap: {},
      nextColorIndex: 0,
    });
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

    // 일시정지 아이콘(PauseIcon)이 있는 버튼 찾기
    const pause_icon = screen.getByTestId('PauseIcon');
    const pause_button = pause_icon.closest('button') as HTMLButtonElement;
    await user.click(pause_button);

    // pauseAndMoveToLogs가 호출되어 activeTimer는 null, logs에 PAUSED 상태로 이동
    const { activeTimer, logs } = useTimerStore.getState();
    expect(activeTimer).toBeNull();
    expect(logs[0]?.status).toBe('PAUSED');
  });

  it('일시정지 상태에서 재개 버튼을 클릭하면 타이머가 재개된다', async () => {
    const user = userEvent.setup();
    act(() => {
      useTimerStore.getState().startTimer('테스트 작업');
      useTimerStore.getState().pauseTimer();
    });

    render(<ActiveTimer />);

    // 재생 아이콘(PlayArrowIcon)이 있는 버튼 찾기
    const play_icon = screen.getByTestId('PlayArrowIcon');
    const resume_button = play_icon.closest('button') as HTMLButtonElement;
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

  it('경과 시간이 표시된다', () => {
    act(() => {
      useTimerStore.getState().startTimer('테스트 작업');
    });

    render(<ActiveTimer />);

    // 타이머 시간 표시 영역에 00:00이 포함되어 있는지 확인
    const time_elements = screen.getAllByText(/00:00/);
    expect(time_elements.length).toBeGreaterThan(0);
  });
});
