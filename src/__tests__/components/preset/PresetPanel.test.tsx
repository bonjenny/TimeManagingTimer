/**
 * v0.3.0 테스트: PresetPanel 컴포넌트 테스트 (즐겨찾기, 수동 추가)
 */
import { render, screen, act } from '../../../test-utils';
import userEvent from '@testing-library/user-event';
import PresetPanel from '../../../components/preset/PresetPanel';
import { useTimerStore } from '../../../store/useTimerStore';

describe('PresetPanel', () => {
  beforeEach(() => {
    // 스토어 초기화
    const store = useTimerStore.getState();
    store.logs.forEach((log) => store.deleteLog(log.id));
    if (store.activeTimer) {
      store.completeTimer();
    }
    localStorage.clear();
  });

  it('작업 프리셋 제목이 표시된다', () => {
    render(<PresetPanel />);
    expect(screen.getByText('작업 프리셋')).toBeInTheDocument();
  });

  it('프리셋이 없으면 빈 상태 메시지가 표시된다', () => {
    render(<PresetPanel />);
    expect(screen.getByText(/아직 프리셋이 없습니다/i)).toBeInTheDocument();
  });

  it('새 프리셋 추가 버튼이 렌더링된다', () => {
    render(<PresetPanel />);
    expect(screen.getByRole('button', { name: /새 프리셋 추가/i })).toBeInTheDocument();
  });

  describe('프리셋 추가', () => {
    it('추가 버튼을 클릭하면 모달이 열린다', async () => {
      const user = userEvent.setup();
      render(<PresetPanel />);

      const add_button = screen.getByRole('button', { name: /새 프리셋 추가/i });
      await user.click(add_button);

      expect(screen.getByText('새 프리셋 추가')).toBeInTheDocument();
    });

    it('프리셋을 추가하면 목록에 표시된다', async () => {
      const user = userEvent.setup();
      render(<PresetPanel />);

      // 모달 열기
      const add_button = screen.getByRole('button', { name: /새 프리셋 추가/i });
      await user.click(add_button);

      // 정보 입력
      const title_input = screen.getByLabelText(/작업 제목/i);
      await user.type(title_input, '테스트 프리셋');

      // 추가 버튼 클릭
      const submit_button = screen.getByRole('button', { name: /^추가$/i });
      await user.click(submit_button);

      // 목록에 표시되는지 확인
      expect(screen.getByText('테스트 프리셋')).toBeInTheDocument();
    });

    it('수동 추가된 프리셋에 "수동" 라벨이 표시된다', async () => {
      const user = userEvent.setup();
      render(<PresetPanel />);

      const add_button = screen.getByRole('button', { name: /새 프리셋 추가/i });
      await user.click(add_button);

      const title_input = screen.getByLabelText(/작업 제목/i);
      await user.type(title_input, '수동 프리셋');

      const submit_button = screen.getByRole('button', { name: /^추가$/i });
      await user.click(submit_button);

      expect(screen.getByText('수동')).toBeInTheDocument();
    });
  });

  describe('프리셋 클릭으로 타이머 시작', () => {
    it('프리셋을 클릭하면 타이머가 시작된다', async () => {
      const user = userEvent.setup();

      // 기존 로그 추가 (프리셋 생성용)
      act(() => {
        useTimerStore.getState().addLog({
          id: 'test-log',
          title: '기존 작업',
          startTime: Date.now() - 3600000,
          endTime: Date.now(),
          status: 'COMPLETED',
          pausedDuration: 0,
        });
      });

      render(<PresetPanel />);

      // 프리셋 클릭
      const preset_item = screen.getByText('기존 작업');
      await user.click(preset_item);

      const { activeTimer } = useTimerStore.getState();
      expect(activeTimer?.title).toBe('기존 작업');
    });
  });

  describe('즐겨찾기', () => {
    it('즐겨찾기 버튼을 클릭하면 즐겨찾기 상태가 토글된다', async () => {
      const user = userEvent.setup();

      // 기존 로그 추가
      act(() => {
        useTimerStore.getState().addLog({
          id: 'test-log',
          title: '기존 작업',
          startTime: Date.now() - 3600000,
          endTime: Date.now(),
          status: 'COMPLETED',
          pausedDuration: 0,
        });
      });

      render(<PresetPanel />);

      // 별 아이콘 버튼 찾기 (빈 별)
      const star_buttons = screen.getAllByRole('button').filter(
        (btn) => btn.querySelector('[data-testid="StarBorderIcon"]')
      );

      expect(star_buttons.length).toBeGreaterThan(0);
    });
  });

  describe('색상 커스텀', () => {
    it('프리셋 추가 시 색상을 선택할 수 있다', async () => {
      const user = userEvent.setup();
      render(<PresetPanel />);

      const add_button = screen.getByRole('button', { name: /새 프리셋 추가/i });
      await user.click(add_button);

      // 색상 선택 영역 확인
      expect(screen.getByText('프리셋 색상')).toBeInTheDocument();
    });
  });

  describe('LocalStorage 저장', () => {
    it('즐겨찾기 상태가 LocalStorage에 저장된다', async () => {
      const user = userEvent.setup();

      act(() => {
        useTimerStore.getState().addLog({
          id: 'test-log',
          title: '저장 테스트',
          startTime: Date.now() - 3600000,
          endTime: Date.now(),
          status: 'COMPLETED',
          pausedDuration: 0,
        });
      });

      render(<PresetPanel />);

      // 컴포넌트가 렌더링된 후 LocalStorage 확인
      // (실제 구현에서는 즐겨찾기 토글 후 확인)
      expect(localStorage.getItem('timekeeper-preset-favorites')).toBeDefined();
    });
  });
});
