/**
 * v0.2.0 테스트: NewTaskModal 컴포넌트 테스트 (F8 단축키 팝업)
 */
import { render, screen, act } from '../../../test-utils';
import userEvent from '@testing-library/user-event';
import NewTaskModal from '../../../components/modal/NewTaskModal';
import { useTimerStore } from '../../../store/useTimerStore';

describe('NewTaskModal', () => {
  beforeEach(() => {
    // 스토어 초기화
    const store = useTimerStore.getState();
    if (store.activeTimer) {
      store.completeTimer();
    }
    localStorage.clear();
  });

  it('open이 false이면 모달이 렌더링되지 않는다', () => {
    render(<NewTaskModal open={false} onClose={() => {}} />);
    expect(screen.queryByText('새 작업 시작')).not.toBeInTheDocument();
  });

  it('open이 true이면 모달이 렌더링된다', () => {
    render(<NewTaskModal open={true} onClose={() => {}} />);
    expect(screen.getByText('새 작업 시작')).toBeInTheDocument();
  });

  it('작업 제목 입력 후 Enter 키를 누르면 타이머가 시작된다', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(<NewTaskModal open={true} onClose={onClose} />);

    const input = screen.getByLabelText(/작업 제목/i);
    await user.type(input, 'F8 테스트 작업{enter}');

    const { activeTimer } = useTimerStore.getState();
    expect(activeTimer?.title).toBe('F8 테스트 작업');
    expect(onClose).toHaveBeenCalled();
  });

  it('취소 버튼을 클릭하면 모달이 닫힌다', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(<NewTaskModal open={true} onClose={onClose} />);

    const cancel_button = screen.getByRole('button', { name: /취소/i });
    await user.click(cancel_button);

    expect(onClose).toHaveBeenCalled();
  });

  it('제목이 비어있으면 시작 버튼이 비활성화된다', () => {
    render(<NewTaskModal open={true} onClose={() => {}} />);

    const start_button = screen.getByRole('button', { name: /타이머 시작/i });
    expect(start_button).toBeDisabled();
  });

  it('게시판 번호와 카테고리를 함께 입력할 수 있다', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(<NewTaskModal open={true} onClose={onClose} />);

    const title_input = screen.getByLabelText(/작업 제목/i);
    const board_input = screen.getByLabelText(/게시판 번호/i);

    await user.type(title_input, '테스트 작업');
    await user.type(board_input, '12345');
    await user.click(screen.getByRole('button', { name: /타이머 시작/i }));

    const { activeTimer } = useTimerStore.getState();
    expect(activeTimer?.boardNo).toBe('12345');
  });

  it('F8 라벨이 표시된다', () => {
    render(<NewTaskModal open={true} onClose={() => {}} />);
    expect(screen.getByText('F8')).toBeInTheDocument();
  });
});
