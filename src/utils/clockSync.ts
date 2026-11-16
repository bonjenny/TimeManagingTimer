import { parseErpSession, ErpSession } from './erpTimelog';
import { fetchMyClockInOut } from './erpAttendance';
import { useDeployCalendarStore } from '../store/useDeployCalendarStore';

// 내 출퇴근(최근 3달)을 ERP 에서 받아 저장소에 넣는다. 바탕화면 위젯의 야근 포도알판 · 기념 카드가 쓴다 (위젯 스냅숏의 clock).
// ERP 세션을 쓰는 곳(캘린더 근태 · 주간 진행 현황표 · 시간관리 등록 · 앱 시작 때 남아 있는 세션)에서 부르되,
// 같은 세션이면 한 번만 받는다 (요청 3개). 주기적으로 다시 부르지 않는다. 실패하면 다음에 세션을 쓸 때 한 번 더

/** 세션 입력칸들이 같이 쓰는 sessionStorage 키 (탭을 닫으면 사라진다) */
export const ERP_SESSION_KEY = 'erp-session-input';

let fetched_sid = '';

export function syncMyClock(session: ErpSession, force = false): void {
  if (!force && fetched_sid === session.sid) return;
  fetched_sid = session.sid;
  const now = new Date();
  void Promise.all(
    [0, 1, 2].map((back) => {
      const m = new Date(now.getFullYear(), now.getMonth() - back, 1);
      return fetchMyClockInOut(session, `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-01`);
    })
  )
    .then((months) => useDeployCalendarStore.getState().mergeClockRecords(months.flat()))
    .catch(() => {
      if (fetched_sid === session.sid) fetched_sid = '';
    });
}

/** 이 탭에 남아 있는 ERP 세션이 있으면 받아 둔다 (앱을 켤 때 한 번) */
export function syncMyClockFromStorage(): void {
  const session = parseErpSession(sessionStorage.getItem(ERP_SESSION_KEY) || '');
  if (session) syncMyClock(session);
}
