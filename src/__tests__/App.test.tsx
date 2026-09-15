/**
 * v0.6.0 테스트: App 컴포넌트 및 단축키 테스트
 */
import { render, screen, fireEvent, act } from '../test-utils';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { useTimerStore } from '../store/useTimerStore';

describe('App', () => {
  beforeEach(() => {
    // 스토어 초기화
    const store = useTimerStore.getState();
    store.logs.forEach((log) => store.deleteLog(log.id));
    if (store.activeTimer) {
      store.completeTimer();
    }
    localStorage.clear();
  });

  it('앱이 정상적으로 렌더링된다', () => {
    render(<App />);
    expect(screen.getByText('일간 타이머')).toBeInTheDocument();
  });

  describe('네비게이션', () => {
    it('일간 타이머 탭이 렌더링된다', () => {
      render(<App />);
      expect(screen.getByRole('tab', { name: /일간 타이머/i })).toBeInTheDocument();
    });

    it('주간 일정 탭이 렌더링된다', () => {
      render(<App />);
      expect(screen.getByRole('tab', { name: /주간 일정/i })).toBeInTheDocument();
    });

    it('배포 캘린더 탭이 렌더링된다', () => {
      render(<App />);
      expect(screen.getByRole('tab', { name: /배포 캘린더/i })).toBeInTheDocument();
    });

    it('설정 탭이 렌더링된다', () => {
      render(<App />);
      expect(screen.getByRole('tab', { name: /설정/i })).toBeInTheDocument();
    });

    it('탭을 클릭하면 페이지가 전환된다', async () => {
      const user = userEvent.setup();
      render(<App />);

      const weekly_tab = screen.getByRole('tab', { name: /주간 일정/i });
      await user.click(weekly_tab);

      expect(weekly_tab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('F8 단축키', () => {
    it('F8 키를 누르면 새 작업 추가 모달이 열린다', () => {
      render(<App />);

      fireEvent.keyDown(window, { key: 'F8' });

      expect(screen.getByText('새 작업 시작')).toBeInTheDocument();
    });

    it('모달에서 작업을 시작하면 타이머가 시작된다', async () => {
      const user = userEvent.setup();
      render(<App />);

      fireEvent.keyDown(window, { key: 'F8' });

      const input = screen.getByLabelText(/작업 제목/i);
      await user.type(input, 'F8 테스트 작업{enter}');

      const { activeTimer } = useTimerStore.getState();
      expect(activeTimer?.title).toBe('F8 테스트 작업');
    });
  });

  describe('Alt + S 단축키 (타이머 일시정지/재개)', () => {
    it('진행 중인 타이머가 있을 때 Alt+S를 누르면 일시정지된다', () => {
      act(() => {
        useTimerStore.getState().startTimer('테스트 작업');
      });

      render(<App />);

      fireEvent.keyDown(window, { key: 's', altKey: true });

      const { activeTimer } = useTimerStore.getState();
      expect(activeTimer?.status).toBe('PAUSED');
    });

    it('일시정지된 타이머가 있을 때 Alt+S를 누르면 재개된다', () => {
      act(() => {
        useTimerStore.getState().startTimer('테스트 작업');
        useTimerStore.getState().pauseTimer();
      });

      render(<App />);

      fireEvent.keyDown(window, { key: 's', altKey: true });

      const { activeTimer } = useTimerStore.getState();
      expect(activeTimer?.status).toBe('RUNNING');
    });
  });

  describe('Alt + 1/2 단축키 (페이지 이동)', () => {
    it('Alt+1을 누르면 일간 타이머 페이지로 이동한다', async () => {
      const user = userEvent.setup();
      render(<App />);

      // 먼저 다른 페이지로 이동
      const weekly_tab = screen.getByRole('tab', { name: /주간 일정/i });
      await user.click(weekly_tab);

      // Alt+1로 일간 페이지로 이동
      fireEvent.keyDown(window, { key: '1', altKey: true });

      // 일간 타이머 탭이 활성화되어 있어야 함
      const daily_tab = screen.getByRole('tab', { name: /일간 타이머/i });
      expect(daily_tab).toHaveAttribute('aria-selected', 'true');
    });

    it('Alt+2를 누르면 주간 일정 페이지로 이동한다', () => {
      render(<App />);

      fireEvent.keyDown(window, { key: '2', altKey: true });

      const weekly_tab = screen.getByRole('tab', { name: /주간 일정/i });
      expect(weekly_tab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('레이아웃', () => {
    it('일간 타이머 페이지에서 프리셋 패널이 렌더링된다', () => {
      render(<App />);
      expect(screen.getByText('작업 프리셋')).toBeInTheDocument();
    });

    it('일간 타이머 페이지에서 간트 차트가 렌더링된다', () => {
      render(<App />);
      expect(screen.getByPlaceholderText(/무엇을 하고 계신가요/i)).toBeInTheDocument();
      expect(screen.getByText('작업 프리셋')).toBeInTheDocument();
    });

    it('일간 타이머 페이지에서 타이머 입력창이 렌더링된다', () => {
      render(<App />);
      expect(screen.getByPlaceholderText(/무엇을 하고 계신가요/i)).toBeInTheDocument();
    });
  });

  describe('테마 로드', () => {
    it('저장된 테마가 앱 시작 시 적용된다', () => {
      localStorage.setItem(
        'timekeeper-settings',
        JSON.stringify({
          primaryColor: '#10b981',
          accentColor: '#059669',
        })
      );

      render(<App />);

      const primary_color = getComputedStyle(document.documentElement).getPropertyValue('--primary-color');
      expect(primary_color.trim()).toBe('#10b981');
    });
  });

  describe('반응형 레이아웃', () => {
    const original_match_media = window.matchMedia;

    // 실제 브라우저처럼: 좁은 화면이면 max-width 조건(MUI breakpoints.down, App의 900px 조건)이 참
    const mockViewport = (is_narrow: boolean) => {
      window.matchMedia = jest.fn().mockImplementation((query: string) => ({
        matches: query.includes('max-width') ? is_narrow : !is_narrow,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));
    };

    afterEach(() => {
      window.matchMedia = original_match_media;
    });

    it('데스크탑에서는 상단 탭과 왼쪽 작업 프리셋 패널이 표시된다', () => {
      mockViewport(false);
      render(<App />);

      expect(screen.getByRole('tab', { name: /일간 타이머/i })).toBeInTheDocument();
      expect(screen.getByText('작업 프리셋')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/무엇을 하고 계신가요/i)).toBeInTheDocument();
      expect(screen.queryByText('더보기')).not.toBeInTheDocument();
    });

    it('모바일에서는 하단 탭 바와 화면 제목, 빠른 시작이 표시된다', () => {
      mockViewport(true);
      render(<App />);

      expect(screen.queryByRole('tab', { name: /일간 타이머/i })).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: '일간 타이머' })).toBeInTheDocument();
      ['타이머', '주간', '시간관리', '캘린더', '더보기'].forEach((label) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
      expect(screen.getByText('빠른 시작')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('무엇을 하고 계신가요?')).toBeInTheDocument();
    });

    it('모바일 하단 탭으로 화면을 전환한다', async () => {
      mockViewport(true);
      const user = userEvent.setup();
      render(<App />);

      await user.click(screen.getByText('주간'));
      expect(screen.getByRole('heading', { name: '주간 일정' })).toBeInTheDocument();
    });
  });
});
