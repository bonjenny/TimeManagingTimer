/**
 * v0.13.5 테스트: TimerInput 컴포넌트 테스트
 */
import { render, screen } from '../../../test-utils';
import userEvent from '@testing-library/user-event';
import TimerInput from '../../../components/timer/TimerInput';
import { useTimerStore } from '../../../store/useTimerStore';

describe('TimerInput', () => {
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

  it('입력창이 렌더링된다', () => {
    render(<TimerInput />);
    expect(screen.getByPlaceholderText(/무엇을 하고 계신가요/)).toBeInTheDocument();
  });

  it('제목을 입력하고 시작 버튼을 클릭하면 타이머가 시작된다', async () => {
    const user = userEvent.setup();
    render(<TimerInput />);

    const input = screen.getByPlaceholderText(/무엇을 하고 계신가요/);
    await user.type(input, '새로운 작업');

    // PlayArrowIcon의 부모 버튼 찾기
    const play_icon = screen.getByTestId('PlayArrowIcon');
    const start_button = play_icon.closest('button') as HTMLButtonElement;
    await user.click(start_button);

    const { activeTimer } = useTimerStore.getState();
    expect(activeTimer?.title).toBe('새로운 작업');
  });

  it('제목이 비어있으면 시작 버튼이 비활성화된다', () => {
    render(<TimerInput />);

    // PlayArrowIcon의 부모 버튼 찾기
    const play_icon = screen.getByTestId('PlayArrowIcon');
    const start_button = play_icon.closest('button') as HTMLButtonElement;
    expect(start_button).toBeDisabled();
  });

  it('Enter 키를 누르면 타이머가 시작된다', async () => {
    const user = userEvent.setup();
    render(<TimerInput />);

    const input = screen.getByPlaceholderText(/무엇을 하고 계신가요/);
    await user.type(input, '새로운 작업{enter}');

    const { activeTimer } = useTimerStore.getState();
    expect(activeTimer?.title).toBe('새로운 작업');
  });

  it('프로젝트 코드를 입력할 수 있다', async () => {
    const user = userEvent.setup();
    render(<TimerInput />);

    const title_input = screen.getByPlaceholderText(/무엇을 하고 계신가요/);
    const code_input = screen.getByPlaceholderText(/프로젝트 코드/);

    await user.type(title_input, '새로운 작업');
    await user.type(code_input, 'PRJ001');
    
    // PlayArrowIcon의 부모 버튼 찾기
    const play_icon = screen.getByTestId('PlayArrowIcon');
    const start_button = play_icon.closest('button') as HTMLButtonElement;
    await user.click(start_button);

    const { activeTimer } = useTimerStore.getState();
    expect(activeTimer?.projectCode).toBe('PRJ001');
  });
});
