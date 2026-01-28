/**
 * v0.13.1 테스트: PresetPanel 컴포넌트 테스트 (수동 추가, 타이머 시작)
 * - v0.13.1에서 즐겨찾기 기능 제거됨 (순서 조정 기능으로 대체)
 */
import { render, screen, waitFor } from '../../../test-utils';
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
    expect(screen.getByText(/프리셋이 없습니다/i)).toBeInTheDocument();
  });

  it('프리셋 추가 버튼이 렌더링된다', () => {
    render(<PresetPanel />);
    expect(screen.getByRole('button', { name: /프리셋 추가/i })).toBeInTheDocument();
  });

  describe('프리셋 추가', () => {
    it('추가 버튼을 클릭하면 메뉴가 열린다', async () => {
      const user = userEvent.setup();
      render(<PresetPanel />);

      const add_button = screen.getByRole('button', { name: /프리셋 추가/i });
      await user.click(add_button);

      expect(screen.getByText('새 프리셋 추가')).toBeInTheDocument();
    });

    it('프리셋을 추가하면 목록에 표시된다', async () => {
      const user = userEvent.setup();
      render(<PresetPanel />);

      // 추가 버튼 클릭하여 메뉴 열기
      const add_button = screen.getByRole('button', { name: /프리셋 추가/i });
      await user.click(add_button);

      // 새 프리셋 추가 메뉴 아이템 클릭
      const new_preset_menu = screen.getByText('새 프리셋 추가');
      await user.click(new_preset_menu);

      // 정보 입력
      const title_input = screen.getByLabelText(/업무명/i);
      await user.type(title_input, '테스트 프리셋');

      // 추가 버튼 클릭
      const submit_button = screen.getByRole('button', { name: /추가\(Enter\)/i });
      await user.click(submit_button);

      // 목록에 표시되는지 확인
      await waitFor(() => {
        expect(screen.getByText('테스트 프리셋')).toBeInTheDocument();
      });
    });
  });

  describe('색상 커스텀', () => {
    it('프리셋 추가 시 색상을 선택할 수 있다', async () => {
      const user = userEvent.setup();
      render(<PresetPanel />);

      const add_button = screen.getByRole('button', { name: /프리셋 추가/i });
      await user.click(add_button);

      const new_preset_menu = screen.getByText('새 프리셋 추가');
      await user.click(new_preset_menu);

      // 색상 선택 영역 확인
      expect(screen.getByText(/프리셋 색상/i)).toBeInTheDocument();
    });
  });

  describe('LocalStorage 저장', () => {
    it('프리셋이 LocalStorage에 저장된다', async () => {
      const user = userEvent.setup();
      render(<PresetPanel />);

      // 프리셋 추가
      const add_button = screen.getByRole('button', { name: /프리셋 추가/i });
      await user.click(add_button);

      const new_preset_menu = screen.getByText('새 프리셋 추가');
      await user.click(new_preset_menu);

      const title_input = screen.getByLabelText(/업무명/i);
      await user.type(title_input, '저장 테스트');

      const submit_button = screen.getByRole('button', { name: /추가\(Enter\)/i });
      await user.click(submit_button);

      // LocalStorage 확인
      await waitFor(() => {
        const saved_data = localStorage.getItem('timekeeper-manual-presets');
        expect(saved_data).not.toBeNull();
        expect(saved_data).toContain('저장 테스트');
      });
    });
  });

  describe('푸터 안내 문구', () => {
    it('올바른 안내 문구가 표시된다', () => {
      render(<PresetPanel />);
      expect(screen.getByText(/클릭하여 수정 • ▶ 타이머 시작/)).toBeInTheDocument();
    });
  });
});
