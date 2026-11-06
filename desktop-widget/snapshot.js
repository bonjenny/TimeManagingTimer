// 위젯이 그릴 캘린더 데이터를 폴더에서 고른다.
// 1순위: TimeKeeper 가 캘린더가 바뀔 때마다 쓰는 timekeeper-calendar-widget.json
// 2순위: 하루 한 번 쓰는 자동 백업(timekeeper-backup-*.json) 중 가장 최근 것에서 캘린더 부분만 꺼낸다
//        (위젯 파일이 없거나 백업보다 오래됐을 때. 위젯 파일을 쓰는 TimeKeeper 버전 전이어도 보이게)
const fs = require('fs');
const path = require('path');

const SNAPSHOT_FILE = 'timekeeper-calendar-widget.json';
const BACKUP_RE = /^timekeeper-backup.*\.json$/;
// 공휴일은 백업에 없다 → TimeKeeper 의 krHolidays 를 옮겨 둔 것 (ponytail: 해가 바뀌면 같이 갱신)
const HOLIDAYS = require('./holidays.json');

/** TimeKeeper 백업 JSON → 위젯 스냅숏 (웹 앱 src/utils/widgetSnapshot.ts 의 buildWidgetSnapshot 과 같은 모양) */
function fromBackup(backup, mtime) {
  const raw = backup['timekeeper-deploy-calendar'];
  const s = (raw && (raw.state || raw)) || {};
  const color_of = new Map((s.job_colors || []).map((c) => [c.job_code, c.color]));
  const keys = new Set((s.attendance_targets || []).map((t) => `${t.type}:${t.code}`));
  const seen = new Set();
  const attendance = s.show_attendance
    ? (s.attendance_records || [])
        .filter((a) => {
          const k = `${a.emp_cd}|${a.date}|${a.kind}|${a.label}`;
          if (!keys.has(a.target) || seen.has(k)) return false;
          seen.add(k);
          return true;
        })
        .map((a) => ({ date: a.date, text: `${a.name} ${a.label}` }))
    : [];
  return {
    version: 1,
    updated_at: mtime,
    show_today: s.show_today !== false,
    events: (s.events || []).map((e) => ({
      date: e.date,
      text: e.is_holiday || !e.status ? e.job_name : `${e.job_name} ${e.status}`,
      ...(e.is_holiday ? { holiday: true } : { color: color_of.get(e.job_code) }),
    })),
    attendance,
    holidays: HOLIDAYS,
    from_backup: true,
  };
}

function readSnapshotFrom(folder) {
  if (!folder || !fs.existsSync(folder)) return null;
  const stat = (f) => {
    try {
      return fs.statSync(path.join(folder, f)).mtimeMs;
    } catch {
      return 0;
    }
  };
  const widget_mtime = stat(SNAPSHOT_FILE);
  const latest_backup = fs
    .readdirSync(folder)
    .filter((f) => BACKUP_RE.test(f))
    .map((f) => ({ f, t: stat(f) }))
    .sort((a, b) => b.t - a.t)[0];
  try {
    if (widget_mtime && (!latest_backup || widget_mtime >= latest_backup.t)) {
      return JSON.parse(fs.readFileSync(path.join(folder, SNAPSHOT_FILE), 'utf8'));
    }
    if (latest_backup) {
      return fromBackup(JSON.parse(fs.readFileSync(path.join(folder, latest_backup.f), 'utf8')), latest_backup.t);
    }
  } catch (e) {
    console.error('snapshot read failed', e);
  }
  return null;
}

const isWatchedFile = (f) => !f || f === SNAPSHOT_FILE || BACKUP_RE.test(f);

module.exports = { readSnapshotFrom, fromBackup, isWatchedFile, SNAPSHOT_FILE };
