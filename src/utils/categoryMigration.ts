import { useCategoryStore } from '../store/useCategoryStore';
import { useTimerStore } from '../store/useTimerStore';
import { useTimeManagementStore } from '../store/useTimeManagementStore';

// ERP 카테고리명으로 바뀐 옛 이름. 카테고리 목록·타이머 로그·시간관리 행에서 새 이름으로 바꾼다.
// 이미 바뀐 데이터는 건드리지 않으므로(멱등) 매 실행마다 돌려도 된다.
export const RENAMED_CATEGORIES: Record<string, string> = {
  탐색업무: '팀장업무',
  '스테이지/7단/정상화': '스테이지/7번/정상화',
  견적일괄구매: '견적및구매',
  서버설치업: '서버실작업',
  투남: '튜닝',
};

const rename = (name: string | undefined) => (name && RENAMED_CATEGORIES[name]) || name;

export function migrateRenamedCategories(): void {
  const cat = useCategoryStore.getState();
  if (cat.categories.some((c) => RENAMED_CATEGORIES[c])) {
    // 새 이름이 이미 목록에 있으면 중복을 만들지 않는다
    const next: string[] = [];
    cat.categories.forEach((c) => {
      const n = rename(c)!;
      if (!next.includes(n)) next.push(n);
    });
    useCategoryStore.setState({ categories: next });
  }

  const timer = useTimerStore.getState();
  const touches = (l: { category?: string }) => !!(l.category && RENAMED_CATEGORIES[l.category]);
  if (timer.logs.some(touches) || timer.deleted_logs.some(touches) || (timer.activeTimer && touches(timer.activeTimer))) {
    useTimerStore.setState({
      logs: timer.logs.map((l) => (touches(l) ? { ...l, category: rename(l.category) } : l)),
      deleted_logs: timer.deleted_logs.map((l) => (touches(l) ? { ...l, category: rename(l.category) } : l)),
      activeTimer: timer.activeTimer && touches(timer.activeTimer)
        ? { ...timer.activeTimer, category: rename(timer.activeTimer.category) }
        : timer.activeTimer,
    });
  }

  const tm = useTimeManagementStore.getState();
  const cwm = tm.category_work_type_map;
  const cwm_touched = Object.keys(cwm).some((k) => RENAMED_CATEGORIES[k]);
  if (tm.rows.some((r) => RENAMED_CATEGORIES[r.category_name]) || cwm_touched) {
    useTimeManagementStore.setState({
      rows: tm.rows.map((r) => (RENAMED_CATEGORIES[r.category_name] ? { ...r, category_name: rename(r.category_name)! } : r)),
      category_work_type_map: cwm_touched
        ? Object.fromEntries(Object.entries(cwm).map(([k, v]) => [rename(k)!, v]))
        : cwm,
    });
  }
}
