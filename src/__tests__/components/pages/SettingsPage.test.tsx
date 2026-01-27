/**
 * v0.6.0 테스트: SettingsPage 컴포넌트 테스트 (테마, 단축키, 초기화)
 */
import { render, screen, act, waitFor } from '../../../test-utils';
import userEvent from '@testing-library/user-event';
import SettingsPage from '../../../components/pages/SettingsPage';

describe('SettingsPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('설정 제목이 표시된다', () => {
    render(<SettingsPage />);
    expect(screen.getByText('설정')).toBeInTheDocument();
  });

  describe('테마 설정', () => {
    it('테마 커스터마이징 섹션이 표시된다', () => {
      render(<SettingsPage />);
      expect(screen.getByText('테마 커스터마이징')).toBeInTheDocument();
    });

    it('테마 프리셋 선택 드롭다운이 렌더링된다', () => {
      render(<SettingsPage />);
      expect(screen.getByLabelText(/테마 프리셋/i)).toBeInTheDocument();
    });

    it('커스텀 색상 입력 필드가 렌더링된다', () => {
      render(<SettingsPage />);
      expect(screen.getByLabelText(/커스텀 색상/i)).toBeInTheDocument();
    });

    it('설정 저장 버튼을 클릭하면 설정이 저장된다', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      const save_button = screen.getByRole('button', { name: /설정 저장/i });
      await user.click(save_button);

      const saved_data = localStorage.getItem('timekeeper-settings');
      expect(saved_data).not.toBeNull();
    });

    it('기본값 복원 버튼을 클릭하면 설정이 초기화된다', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      const reset_button = screen.getByRole('button', { name: /기본값 복원/i });
      await user.click(reset_button);

      // 스낵바 메시지 확인
      await waitFor(() => {
        expect(screen.getByText(/기본값으로 복원되었습니다/i)).toBeInTheDocument();
      });
    });
  });

  describe('업무 환경 설정', () => {
    it('업무 환경 섹션이 표시된다', () => {
      render(<SettingsPage />);
      expect(screen.getByText('업무 환경')).toBeInTheDocument();
    });

    it('점심시간 시작 입력 필드가 렌더링된다', () => {
      render(<SettingsPage />);
      expect(screen.getByLabelText(/점심시간 시작/i)).toBeInTheDocument();
    });

    it('점심시간 종료 입력 필드가 렌더링된다', () => {
      render(<SettingsPage />);
      expect(screen.getByLabelText(/점심시간 종료/i)).toBeInTheDocument();
    });

    it('자동 완성 스위치가 렌더링된다', () => {
      render(<SettingsPage />);
      expect(screen.getByLabelText(/작업명 자동 완성/i)).toBeInTheDocument();
    });
  });

  describe('단축키 목록', () => {
    it('단축키 섹션이 표시된다', () => {
      render(<SettingsPage />);
      expect(screen.getByText('단축키')).toBeInTheDocument();
    });

    it('F8 단축키가 표시된다', () => {
      render(<SettingsPage />);
      expect(screen.getByText(/F8/)).toBeInTheDocument();
    });

    it('Alt + N 단축키가 표시된다', () => {
      render(<SettingsPage />);
      expect(screen.getByText(/Alt \+ N/)).toBeInTheDocument();
    });

    it('Alt + S 단축키가 표시된다', () => {
      render(<SettingsPage />);
      expect(screen.getByText(/Alt \+ S/)).toBeInTheDocument();
    });

    it('Alt + 1 단축키가 표시된다', () => {
      render(<SettingsPage />);
      expect(screen.getByText(/Alt \+ 1/)).toBeInTheDocument();
    });

    it('Alt + 2 단축키가 표시된다', () => {
      render(<SettingsPage />);
      expect(screen.getByText(/Alt \+ 2/)).toBeInTheDocument();
    });
  });

  describe('데이터 관리', () => {
    it('데이터 관리 섹션이 표시된다', () => {
      render(<SettingsPage />);
      expect(screen.getByText('데이터 관리')).toBeInTheDocument();
    });

    it('데이터 내보내기 버튼이 렌더링된다', () => {
      render(<SettingsPage />);
      expect(screen.getByRole('button', { name: /데이터 내보내기/i })).toBeInTheDocument();
    });

    it('데이터 가져오기 버튼이 렌더링된다', () => {
      render(<SettingsPage />);
      expect(screen.getByText(/데이터 가져오기/i)).toBeInTheDocument();
    });
  });

  describe('데이터 초기화', () => {
    it('위험 영역 섹션이 표시된다', () => {
      render(<SettingsPage />);
      expect(screen.getByText('위험 영역')).toBeInTheDocument();
    });

    it('초기화 버튼이 렌더링된다', () => {
      render(<SettingsPage />);
      expect(screen.getByRole('button', { name: /모든 데이터 초기화/i })).toBeInTheDocument();
    });

    it('초기화 버튼을 클릭하면 확인 모달이 열린다', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      const reset_button = screen.getByRole('button', { name: /모든 데이터 초기화/i });
      await user.click(reset_button);

      expect(screen.getByText(/이 작업은 되돌릴 수 없습니다/i)).toBeInTheDocument();
    });

    it('확인 텍스트 없이는 초기화 버튼이 비활성화된다', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      const reset_button = screen.getByRole('button', { name: /모든 데이터 초기화/i });
      await user.click(reset_button);

      const confirm_button = screen.getByRole('button', { name: /초기화 실행/i });
      expect(confirm_button).toBeDisabled();
    });

    it('올바른 텍스트를 입력하면 초기화 버튼이 활성화된다', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      const reset_button = screen.getByRole('button', { name: /모든 데이터 초기화/i });
      await user.click(reset_button);

      const text_input = screen.getByPlaceholderText('초기화');
      await user.type(text_input, '초기화');

      const confirm_button = screen.getByRole('button', { name: /초기화 실행/i });
      expect(confirm_button).not.toBeDisabled();
    });

    it('취소 버튼을 클릭하면 모달이 닫힌다', async () => {
      const user = userEvent.setup();
      render(<SettingsPage />);

      const reset_button = screen.getByRole('button', { name: /모든 데이터 초기화/i });
      await user.click(reset_button);

      const cancel_button = screen.getByRole('button', { name: /취소/i });
      await user.click(cancel_button);

      await waitFor(() => {
        expect(screen.queryByText(/이 작업은 되돌릴 수 없습니다/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('설정 저장/로드', () => {
    it('저장된 설정이 로드된다', () => {
      localStorage.setItem(
        'timekeeper-settings',
        JSON.stringify({
          themePreset: '파랑',
          lunchStart: '11:30',
          lunchEnd: '12:30',
          autoCompleteEnabled: false,
        })
      );

      render(<SettingsPage />);

      const lunch_start_input = screen.getByLabelText(/점심시간 시작/i) as HTMLInputElement;
      expect(lunch_start_input.value).toBe('11:30');
    });
  });

  describe('진행상태 관리 (v0.10.4)', () => {
    it('진행상태 관리 섹션이 표시된다', () => {
      render(<SettingsPage />);
      expect(screen.getByText('진행상태 관리')).toBeInTheDocument();
    });

    it('기본 진행상태가 한글로만 표시된다 (영어 값 미포함)', () => {
      render(<SettingsPage />);
      
      // 한글만 표시되어야 함 (영어 값 없이)
      expect(screen.getByText('완료')).toBeInTheDocument();
      expect(screen.getByText('진행중')).toBeInTheDocument();
      expect(screen.getByText('대기')).toBeInTheDocument();
      
      // "완료 (completed)" 같은 형식이 없어야 함
      expect(screen.queryByText(/완료 \(completed\)/)).not.toBeInTheDocument();
      expect(screen.queryByText(/진행중 \(in_progress\)/)).not.toBeInTheDocument();
      expect(screen.queryByText(/대기 \(pending\)/)).not.toBeInTheDocument();
    });

    it('진행상태 Chip에 삭제 버튼이 있다', () => {
      render(<SettingsPage />);
      
      // MuiChip-deleteIcon이 존재해야 함
      const delete_icons = document.querySelectorAll('.MuiChip-deleteIcon');
      expect(delete_icons.length).toBeGreaterThan(0);
    });

    it('새 진행상태 입력 필드가 렌더링된다', () => {
      render(<SettingsPage />);
      expect(screen.getByPlaceholderText(/표시명/)).toBeInTheDocument();
    });

    it('추가 버튼이 렌더링된다', () => {
      render(<SettingsPage />);
      
      // 진행상태 관리 섹션에 추가 버튼이 있어야 함
      const add_buttons = screen.getAllByRole('button', { name: /추가/i });
      expect(add_buttons.length).toBeGreaterThan(0);
    });
  });
});
