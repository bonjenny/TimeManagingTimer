/**
 * v0.13.1 테스트: SettingsPage 컴포넌트 테스트 (테마, 단축키, 카테고리/진행상태 관리)
 * - v0.13.1에서 카테고리/진행상태 드래그앤드롭 순서 조정 기능 추가
 */
import { render, screen, waitFor } from '../../../test-utils';
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

  describe('테마 및 컬러 팔레트', () => {
    it('테마 및 컬러 팔레트 섹션이 표시된다', () => {
      render(<SettingsPage />);
      expect(screen.getByText('테마 및 컬러 팔레트')).toBeInTheDocument();
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

    it('자동 완성 스위치가 렌더링된다', () => {
      render(<SettingsPage />);
      expect(screen.getByLabelText(/작업명 자동 완성/i)).toBeInTheDocument();
    });

    it('점심시간 제외 스위치가 렌더링된다', () => {
      render(<SettingsPage />);
      expect(screen.getByLabelText(/점심시간 소요 시간에서 제외/i)).toBeInTheDocument();
    });
  });

  describe('단축키 목록', () => {
    it('단축키 섹션 제목이 표시된다', () => {
      render(<SettingsPage />);
      expect(screen.getByText(/⌨️ 단축키/)).toBeInTheDocument();
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

    it('위험 영역 섹션이 표시된다', () => {
      render(<SettingsPage />);
      expect(screen.getByText('위험 영역')).toBeInTheDocument();
    });

    it('초기화 버튼이 렌더링된다', () => {
      render(<SettingsPage />);
      expect(screen.getByRole('button', { name: /모든 데이터 초기화/i })).toBeInTheDocument();
    });
  });

  describe('카테고리 관리 (v0.13.1)', () => {
    it('카테고리 관리 섹션이 표시된다', () => {
      render(<SettingsPage />);
      expect(screen.getByText('카테고리 관리')).toBeInTheDocument();
    });

    it('드래그앤드롭 안내 문구가 표시된다', () => {
      render(<SettingsPage />);
      // 카테고리와 진행상태 둘 다 안내 문구가 있음
      const help_texts = screen.getAllByText(/드래그하여 순서를 변경할 수 있습니다/i);
      expect(help_texts.length).toBeGreaterThanOrEqual(2);
    });

    it('기본 카테고리가 표시된다', () => {
      render(<SettingsPage />);
      
      expect(screen.getByText('분석')).toBeInTheDocument();
      expect(screen.getByText('개발')).toBeInTheDocument();
      expect(screen.getByText('회의')).toBeInTheDocument();
    });

    it('카테고리 Chip에 드래그 핸들 아이콘이 있다', () => {
      render(<SettingsPage />);
      
      // DragIndicatorIcon이 존재해야 함
      const drag_icons = document.querySelectorAll('[data-testid="DragIndicatorIcon"]');
      expect(drag_icons.length).toBeGreaterThan(0);
    });

    it('새 카테고리 입력 필드가 렌더링된다', () => {
      render(<SettingsPage />);
      expect(screen.getByPlaceholderText(/새 카테고리/)).toBeInTheDocument();
    });

    it('카테고리 추가 버튼이 렌더링된다', () => {
      render(<SettingsPage />);
      
      const add_buttons = screen.getAllByRole('button', { name: /추가/i });
      expect(add_buttons.length).toBeGreaterThan(0);
    });

    it('기본값으로 초기화 버튼이 렌더링된다', () => {
      render(<SettingsPage />);
      
      const reset_buttons = screen.getAllByRole('button', { name: /기본값으로 초기화/i });
      expect(reset_buttons.length).toBeGreaterThan(0);
    });
  });

  describe('진행상태 관리 (v0.13.1)', () => {
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

    it('진행상태 Chip에 드래그 핸들 아이콘이 있다', () => {
      render(<SettingsPage />);
      
      // DragIndicatorIcon이 존재해야 함 (카테고리와 진행상태 둘 다)
      const drag_icons = document.querySelectorAll('[data-testid="DragIndicatorIcon"]');
      // 카테고리 8개 + 진행상태 4개 = 12개 이상
      expect(drag_icons.length).toBeGreaterThanOrEqual(12);
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
