/**
 * v0.1.0 테스트: TimerInput 컴포넌트 테스트
 */
import { render, screen, fireEvent } from '../../../test-utils';
import userEvent from '@testing-library/user-event';
import TimerInput from '../../../components/timer/TimerInput';
import { useTimerStore } from '../../../store/useTimerStore';
import { act } from '@testing-library/react';

describe('TimerInput', () => {
  beforeEach(() => {
    // 스토어 초기화
    const store = useTimerStore.getState();
    if (store.activeTimer) {
      store.completeTimer();
    }
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

    const start_button = screen.getByRole('button', { name: /타이머 시작/i });
    await user.click(start_button);

    const { activeTimer } = useTimerStore.getState();
    expect(activeTimer?.title).toBe('새로운 작업');
  });

  it('제목이 비어있으면 시작 버튼이 비활성화된다', () => {
    render(<TimerInput />);

    const start_button = screen.getByRole('button', { name: /타이머 시작/i });
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

  it('게시판 번호를 입력할 수 있다', async () => {
    const user = userEvent.setup();
    render(<TimerInput />);

    const title_input = screen.getByPlaceholderText(/무엇을 하고 계신가요/);
    const board_input = screen.getByPlaceholderText(/게시판 번호/);

    await user.type(title_input, '새로운 작업');
    await user.type(board_input, '12345');
    await user.click(screen.getByRole('button', { name: /타이머 시작/i }));

    const { activeTimer } = useTimerStore.getState();
    expect(activeTimer?.boardNo).toBe('12345');
  });
});
