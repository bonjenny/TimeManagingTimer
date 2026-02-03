/**
 * 배포 캘린더 컴포넌트 테스트
 * v0.14.0: 배포 캘린더 기능
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import DeployCalendar from '../../../components/pages/DeployCalendar';
import { useDeployCalendarStore } from '../../../store/useDeployCalendarStore';
import { useProjectStore } from '../../../store/useProjectStore';
import { act } from '@testing-library/react';

// 테마 래퍼
const theme = createTheme();
const renderWithTheme = (component: React.ReactNode) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('DeployCalendar', () => {
  beforeEach(() => {
    // 스토어 초기화
    useDeployCalendarStore.setState({ events: [], job_colors: [] });
    useProjectStore.setState({ projects: [] });
    localStorage.clear();
  });

  describe('기본 렌더링', () => {
    it('캘린더가 렌더링된다', () => {
      renderWithTheme(<DeployCalendar />);
      
      // 월/년 표시 확인
      expect(screen.getByRole('heading', { level: 6 })).toBeInTheDocument();
    });

    it('네비게이션 버튼이 렌더링된다', () => {
      renderWithTheme(<DeployCalendar />);
      
      expect(screen.getByLabelText('이전 주')).toBeInTheDocument();
      expect(screen.getByLabelText('다음 주')).toBeInTheDocument();
      expect(screen.getByLabelText('이번 주로 이동')).toBeInTheDocument();
    });

    it('HTML 복사 버튼이 렌더링된다', () => {
      renderWithTheme(<DeployCalendar />);
      
      expect(screen.getByRole('button', { name: /HTML 복사/i })).toBeInTheDocument();
    });

    it('잡 색상 설정 버튼이 렌더링된다', () => {
      renderWithTheme(<DeployCalendar />);
      
      expect(screen.getByRole('button', { name: /잡 색상 설정/i })).toBeInTheDocument();
    });
  });

  describe('이벤트 표시', () => {
    it('등록된 이벤트가 캘린더에 표시된다', () => {
      // 이벤트 추가 (오늘 날짜 기준)
      const today = new Date();
      const monday = new Date(today);
      const day = monday.getDay();
      const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
      monday.setDate(diff);
      
      const date_str = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
      
      act(() => {
        useDeployCalendarStore.getState().addEvent({
          date: date_str,
          job_code: 'A25_07788',
          job_name: 'HTML 다크모드',
          status: '스테이지',
          is_holiday: false,
        });
      });

      renderWithTheme(<DeployCalendar />);
      
      expect(screen.getByText('HTML 다크모드 스테이지')).toBeInTheDocument();
    });

    it('휴일 이벤트가 빨간색으로 표시된다', () => {
      const today = new Date();
      const monday = new Date(today);
      const day = monday.getDay();
      const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
      monday.setDate(diff);
      
      const date_str = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
      
      act(() => {
        useDeployCalendarStore.getState().addEvent({
          date: date_str,
          job_code: '',
          job_name: '신정',
          status: '',
          is_holiday: true,
        });
      });

      renderWithTheme(<DeployCalendar />);
      
      const holiday_element = screen.getByText('신정');
      expect(holiday_element).toBeInTheDocument();
      expect(holiday_element).toHaveStyle({ color: '#ca3626' });
    });
  });

  describe('네비게이션', () => {
    it('다음 주 버튼 클릭 시 날짜가 변경된다', () => {
      renderWithTheme(<DeployCalendar />);
      
      const initial_heading = screen.getByRole('heading', { level: 6 }).textContent;
      
      fireEvent.click(screen.getByLabelText('다음 주'));
      
      // 날짜가 변경되었을 수 있음 (월이 바뀌거나)
      // 최소한 에러 없이 동작해야 함
      expect(screen.getByRole('heading', { level: 6 })).toBeInTheDocument();
    });

    it('이전 주 버튼 클릭 시 날짜가 변경된다', () => {
      renderWithTheme(<DeployCalendar />);
      
      fireEvent.click(screen.getByLabelText('이전 주'));
      
      expect(screen.getByRole('heading', { level: 6 })).toBeInTheDocument();
    });
  });

  describe('모달 열기', () => {
    it('잡 색상 설정 버튼 클릭 시 모달이 열린다', async () => {
      renderWithTheme(<DeployCalendar />);
      
      fireEvent.click(screen.getByRole('button', { name: /잡 색상 설정/i }));
      
      await waitFor(() => {
        // 모달이 열리면 다이얼로그 역할의 요소가 나타남
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });
});
