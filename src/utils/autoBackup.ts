import { getAllItems, getItem, setItem } from './storage';

export const AUTO_BACKUP_DATE_KEY = '__auto_backup_date';
export const AUTO_BACKUP_ENABLED_KEY = '__auto_backup_enabled';

/**
 * 하루에 한 번 자동으로 백업 파일(JSON)을 다운로드하는 함수
 * @returns 백업 수행 여부 (수행되었으면 true)
 */
export const checkAndRunAutoBackup = (): boolean => {
  try {
    // 자동 백업 기능이 꺼져 있으면 실행하지 않음 (기본값: 켜짐)
    const isEnabled = getItem(AUTO_BACKUP_ENABLED_KEY);
    if (isEnabled === 'false') return false;

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const lastBackupDate = getItem(AUTO_BACKUP_DATE_KEY);

    // 오늘 이미 백업을 수행했다면 건너뜀
    if (lastBackupDate === today) {
      return false;
    }

    // 백업 데이터 수집 (SettingsPage의 exportData와 동일 로직)
    const all_items = getAllItems();
    // 데이터가 거의 없는 초기 상태(예: 5개 이하 키)라면 자동 백업 생략
    if (Object.keys(all_items).length < 5) return false;

    const export_data: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(all_items)) {
      try {
        export_data[key] = JSON.parse(value);
      } catch {
        export_data[key] = value;
      }
    }

    // JSON 파일 생성 및 다운로드 (자동)
    const blob = new Blob([JSON.stringify(export_data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `timekeeper-backup-auto-${today}.json`;
    
    // 문서에 추가하고 클릭 이벤트를 발생시켜 다운로드 실행
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // 성공적으로 다운로드를 시작했으면 오늘 날짜를 기록
    setItem(AUTO_BACKUP_DATE_KEY, today);
    return true;

  } catch (error) {
    console.error('[TimeKeeper] Auto backup failed:', error);
    return false;
  }
};
