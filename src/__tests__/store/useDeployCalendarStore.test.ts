/**
 * 배포 캘린더 스토어 테스트
 * v0.14.0: 배포 캘린더 기능
 * v0.14.1: 테마 팔레트 기반 기본 색상
 */
import {
  useDeployCalendarStore,
  DEPLOY_CALENDAR_WEEKS_DEFAULT,
  DEPLOY_CALENDAR_WEEKS_MIN,
  DEPLOY_CALENDAR_WEEKS_MAX,
} from '../../store/useDeployCalendarStore';
import { useTimerStore } from '../../store/useTimerStore';
import { act } from '@testing-library/react';

describe('useDeployCalendarStore', () => {
  beforeEach(() => {
    useDeployCalendarStore.setState({ events: [], job_colors: [], weeks_to_show: DEPLOY_CALENDAR_WEEKS_DEFAULT });
    localStorage.clear();
  });

  describe('addEvent', () => {
    it('이벤트를 추가하면 events에 저장된다', () => {
      const { addEvent } = useDeployCalendarStore.getState();

      act(() => {
        addEvent({
          date: '2026-01-27',
          job_code: 'A25_07788',
          job_name: 'HTML 다크모드',
          status: '스테이지',
          is_holiday: false,
        });
      });

      const { events } = useDeployCalendarStore.getState();
      expect(events).toHaveLength(1);
      expect(events[0].job_name).toBe('HTML 다크모드');
      expect(events[0].status).toBe('스테이지');
    });

    it('이벤트 추가 시 ID가 자동 생성된다', () => {
      const { addEvent } = useDeployCalendarStore.getState();

      let returned_id: string;
      act(() => {
        returned_id = addEvent({
          date: '2026-01-27',
          job_code: 'A25_07788',
          job_name: 'HTML 다크모드',
          status: '스테이지',
          is_holiday: false,
        });
      });

      const { events } = useDeployCalendarStore.getState();
      expect(events[0].id).toBeDefined();
      expect(events[0].id).toBe(returned_id!);
    });

    it('새 잡 코드에 기본 색상이 자동 할당된다', () => {
      const { addEvent } = useDeployCalendarStore.getState();

      act(() => {
        addEvent({
          date: '2026-01-27',
          job_code: 'A25_07788',
          job_name: 'HTML 다크모드',
          status: '스테이지',
          is_holiday: false,
        });
      });

      const color = useDeployCalendarStore.getState().getJobColor('A25_07788');
      expect(color).toBeDefined();
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('다크모드여도 새 잡에 테마 팔레트 기반 기본 색상이 할당된다', () => {
      useTimerStore.setState({
        themeConfig: {
          ...useTimerStore.getState().themeConfig,
          isDark: true,
        },
      });

      const { addEvent } = useDeployCalendarStore.getState();

      act(() => {
        addEvent({
          date: '2026-01-27',
          job_code: 'A25_99999',
          job_name: '테스트 잡',
          status: '스테이지',
          is_holiday: false,
        });
      });

      const color = useDeployCalendarStore.getState().getJobColor('A25_99999');
      expect(color).toBeDefined();
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);

      useTimerStore.setState({
        themeConfig: {
          ...useTimerStore.getState().themeConfig,
          isDark: false,
        },
      });
    });
  });

  describe('updateEvent', () => {
    it('이벤트를 업데이트하면 해당 필드가 변경된다', () => {
      const { addEvent, updateEvent } = useDeployCalendarStore.getState();

      let event_id: string;
      act(() => {
        event_id = addEvent({
          date: '2026-01-27',
          job_code: 'A25_07788',
          job_name: 'HTML 다크모드',
          status: '스테이지',
          is_holiday: false,
        });
      });

      act(() => {
        updateEvent(event_id!, { status: '수시' });
      });

      const { events } = useDeployCalendarStore.getState();
      expect(events[0].status).toBe('수시');
      expect(events[0].job_name).toBe('HTML 다크모드'); // 다른 필드는 유지
    });
  });

  describe('deleteEvent', () => {
    it('이벤트를 삭제하면 events에서 제거된다', () => {
      const { addEvent, deleteEvent } = useDeployCalendarStore.getState();

      let event_id: string;
      act(() => {
        event_id = addEvent({
          date: '2026-01-27',
          job_code: 'A25_07788',
          job_name: 'HTML 다크모드',
          status: '스테이지',
          is_holiday: false,
        });
      });

      expect(useDeployCalendarStore.getState().events).toHaveLength(1);

      act(() => {
        deleteEvent(event_id!);
      });

      expect(useDeployCalendarStore.getState().events).toHaveLength(0);
    });
  });

  describe('setJobColor / getJobColor', () => {
    it('잡 색상을 설정하고 조회할 수 있다', () => {
      const { setJobColor, getJobColor } = useDeployCalendarStore.getState();

      act(() => {
        setJobColor('A25_07788', '#b3e5fc');
      });

      const color = useDeployCalendarStore.getState().getJobColor('A25_07788');
      expect(color).toBe('#b3e5fc');
    });

    it('기존 잡 색상을 업데이트할 수 있다', () => {
      const { setJobColor } = useDeployCalendarStore.getState();

      act(() => {
        setJobColor('A25_07788', '#b3e5fc');
      });

      act(() => {
        setJobColor('A25_07788', '#c8e6c9');
      });

      const color = useDeployCalendarStore.getState().getJobColor('A25_07788');
      expect(color).toBe('#c8e6c9');
    });
  });

  describe('getEventsByDate', () => {
    it('특정 날짜의 이벤트만 조회된다', () => {
      const { addEvent, getEventsByDate } = useDeployCalendarStore.getState();

      act(() => {
        addEvent({
          date: '2026-01-27',
          job_code: 'A25_07788',
          job_name: 'HTML 다크모드',
          status: '스테이지',
          is_holiday: false,
        });
        addEvent({
          date: '2026-01-28',
          job_code: 'A25_07788',
          job_name: 'HTML 다크모드',
          status: '수시',
          is_holiday: false,
        });
      });

      const events_27 = useDeployCalendarStore.getState().getEventsByDate('2026-01-27');
      expect(events_27).toHaveLength(1);
      expect(events_27[0].status).toBe('스테이지');

      const events_28 = useDeployCalendarStore.getState().getEventsByDate('2026-01-28');
      expect(events_28).toHaveLength(1);
      expect(events_28[0].status).toBe('수시');
    });
  });

  describe('getUniqueJobCodes', () => {
    it('등록된 모든 잡 코드를 중복 없이 반환한다', () => {
      const { addEvent, getUniqueJobCodes } = useDeployCalendarStore.getState();

      act(() => {
        addEvent({
          date: '2026-01-27',
          job_code: 'A25_07788',
          job_name: 'HTML 다크모드',
          status: '스테이지',
          is_holiday: false,
        });
        addEvent({
          date: '2026-01-28',
          job_code: 'A25_07788',
          job_name: 'HTML 다크모드',
          status: '수시',
          is_holiday: false,
        });
        addEvent({
          date: '2026-01-29',
          job_code: 'A26_00413',
          job_name: 'LifeCycle',
          status: '스테이지',
          is_holiday: false,
        });
      });

      const job_codes = useDeployCalendarStore.getState().getUniqueJobCodes();
      expect(job_codes).toHaveLength(2);
      expect(job_codes).toContain('A25_07788');
      expect(job_codes).toContain('A26_00413');
    });
  });

  describe('weeks_to_show', () => {
    it('기본값은 DEPLOY_CALENDAR_WEEKS_DEFAULT(2)이다', () => {
      const { weeks_to_show } = useDeployCalendarStore.getState();
      expect(weeks_to_show).toBe(DEPLOY_CALENDAR_WEEKS_DEFAULT);
    });

    it('setWeeksToShow로 표시 주 수를 변경할 수 있다', () => {
      const { setWeeksToShow } = useDeployCalendarStore.getState();

      act(() => setWeeksToShow(4));
      expect(useDeployCalendarStore.getState().weeks_to_show).toBe(4);

      act(() => setWeeksToShow(1));
      expect(useDeployCalendarStore.getState().weeks_to_show).toBe(1);
    });

    it('setWeeksToShow는 MIN~MAX 범위로 제한된다', () => {
      const { setWeeksToShow } = useDeployCalendarStore.getState();

      act(() => setWeeksToShow(0));
      expect(useDeployCalendarStore.getState().weeks_to_show).toBe(DEPLOY_CALENDAR_WEEKS_MIN);

      act(() => setWeeksToShow(99));
      expect(useDeployCalendarStore.getState().weeks_to_show).toBe(DEPLOY_CALENDAR_WEEKS_MAX);
    });
  });

  describe('휴일 이벤트', () => {
    it('휴일 이벤트를 추가할 수 있다', () => {
      const { addEvent } = useDeployCalendarStore.getState();

      act(() => {
        addEvent({
          date: '2026-01-01',
          job_code: '',
          job_name: '신정',
          status: '',
          is_holiday: true,
        });
      });

      const { events } = useDeployCalendarStore.getState();
      expect(events).toHaveLength(1);
      expect(events[0].is_holiday).toBe(true);
      expect(events[0].job_name).toBe('신정');
    });
  });
});
