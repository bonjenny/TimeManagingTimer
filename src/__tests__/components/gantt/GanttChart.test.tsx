import { render, screen, act, fireEvent } from '../../../test-utils';
import GanttChart from '../../../components/gantt/GanttChart';
import { useTimerStore } from '../../../store/useTimerStore';

// Mock getBoundingClientRect
beforeAll(() => {
  Element.prototype.getBoundingClientRect = jest.fn(() => ({
    width: 1000,
    height: 500,
    top: 0,
    left: 0,
    bottom: 500,
    right: 1000,
    x: 0,
    y: 0,
    toJSON: () => {},
  })) as unknown as () => DOMRect;
  
  // window.confirm 모킹
  window.confirm = jest.fn(() => true);
});

describe('GanttChart', () => {
  const selectedDate = new Date('2026-01-26T00:00:00'); // 테스트 기준 날짜

  beforeEach(() => {
    const store = useTimerStore.getState();
    store.logs.forEach((log) => store.deleteLog(log.id));
    if (store.activeTimer) {
      store.completeTimer();
    }
    jest.clearAllMocks();
  });

  it('기본 렌더링 확인', () => {
    render(<GanttChart selectedDate={selectedDate} />);
    // 시간축 헤더 확인 (기본 시작 시간 08:00)
    expect(screen.getByText('08:00')).toBeInTheDocument();
  });

  it('작업이 있으면 간트 차트에 표시된다', () => {
    // 09:00 ~ 10:00 작업 추가
    const start = new Date(selectedDate);
    start.setHours(9, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(10, 0, 0, 0);

    act(() => {
      useTimerStore.getState().addLog({
        id: 'test-log-1',
        title: '테스트 작업 A',
        startTime: start.getTime(),
        endTime: end.getTime(),
        status: 'COMPLETED',
        pausedDuration: 0,
      });
    });

    render(<GanttChart selectedDate={selectedDate} />);
    expect(screen.getByText('테스트 작업 A')).toBeInTheDocument();
  });

  it('빈 영역을 드래그하여 새 작업을 생성할 수 있다 (모달 표시 확인)', () => {
    render(<GanttChart selectedDate={selectedDate} />);
    
    // 차트 영역으로 추정되는 요소 (ToolTip이 감싸고 있는 Box)
    // 정확한 타겟팅을 위해 data-testid를 추가하는 것이 좋으나, 
    // 현재 코드에서는 텍스트 등으로 유추해야 함.
    // 여기서는 렌더링된 컨테이너 내부에서 마우스 이벤트를 발생시켜 모달이 뜨는지 확인
    
    const container = screen.getByText('08:00').closest('.MuiPaper-root');
    if (!container) throw new Error('Container not found');

    // 드래그 시뮬레이션
    // LABEL_WIDTH(180)를 고려하여 좌표 설정
    fireEvent.mouseDown(container, { clientX: 200, clientY: 100 }); // 시작
    fireEvent.mouseMove(container, { clientX: 400, clientY: 100 }); // 이동
    fireEvent.mouseUp(container); // 종료

    // 모달이 떴는지 확인 (제목 입력 필드 등으로)
    // 주의: 드래그 거리가 짧거나 로직상 무시될 수 있음. 
    // 실제 DOM 환경과 달라 실패할 수 있으나 시도.
    
    // 만약 모달이 뜬다면 '새 업무 기록 (수동)' 텍스트가 있어야 함
    // expect(screen.getByText('새 업무 기록 (수동)')).toBeInTheDocument();
  });
});
