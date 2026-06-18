import { getItem, setItem } from './storage';

export const MIGRATION_NOTICE_DATE_KEY = '__migration_notice_date';
export const GITHUB_RETURN_NOTICE_DATE_KEY = '__github_return_notice_date';

export const LEGACY_APP_PATH = '/EFA/time-managing.html';
export const APP_URL = `https://developer.ecount.com${LEGACY_APP_PATH}`;
export const GITHUB_PAGES_URL = 'https://bonjenny.github.io/';
export const SERVER_SWITCH_DATE_LABEL = '6/19(금)';

const KST_TIMEZONE = 'Asia/Seoul';
const NOTICE_SWITCH_DATE = '2026-06-19';
const NOTICE_END_DATE = '2026-06-20';
const FORCE_SHOW_START_HOUR = 17;
const FORCE_SHOW_END_HOUR = 18;

const INTERNAL_SERVER_HOSTS = ['10.10.10.250', '10.10.10.150'];
const GITHUB_PAGES_HOST = 'bonjenny.github.io';

const getKstDateTime = (): { date: string; hour: number } => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: KST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const get_part = (type: string) => parts.find((part) => part.type === type)?.value ?? '';

  return {
    date: `${get_part('year')}-${get_part('month')}-${get_part('day')}`,
    hour: Number(get_part('hour')),
  };
};

const isForceShowWindow = (kst_date: string, kst_hour: number): boolean => {
  return kst_date === NOTICE_SWITCH_DATE
    && kst_hour >= FORCE_SHOW_START_HOUR
    && kst_hour < FORCE_SHOW_END_HOUR;
};

const shouldShowNoticeBySchedule = (notice_date_key: string): boolean => {
  const { date: kst_date, hour: kst_hour } = getKstDateTime();

  if (kst_date >= NOTICE_END_DATE) return false;

  // 6/19 17~18시: 이전 확인 여부와 무관하게 앱 실행마다 표시
  if (isForceShowWindow(kst_date, kst_hour)) return true;

  const last_shown_date = getItem(notice_date_key);
  return last_shown_date !== kst_date;
};

const markNoticeShown = (notice_date_key: string): void => {
  const { date: kst_date } = getKstDateTime();
  setItem(notice_date_key, kst_date);
};

export const isLocalEnvironment = (): boolean => {
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
};

export const isLegacyEcountApp = (): boolean => {
  if (window.location.hostname !== 'developer.ecount.com') return false;

  const pathname = window.location.pathname;
  return pathname === LEGACY_APP_PATH || pathname.endsWith(LEGACY_APP_PATH);
};

const isInternalServerApp = (): boolean => {
  if (!INTERNAL_SERVER_HOSTS.includes(window.location.hostname)) return false;

  const pathname = window.location.pathname;
  return pathname === LEGACY_APP_PATH || pathname.endsWith(LEGACY_APP_PATH);
};

export const isGithubPagesApp = (): boolean => {
  return window.location.hostname === GITHUB_PAGES_HOST;
};

export const isMigrationNoticeTarget = (): boolean => {
  return isLocalEnvironment() || isLegacyEcountApp() || isInternalServerApp();
};

export const isGithubReturnNoticeTarget = (): boolean => {
  return isGithubPagesApp();
};

export const shouldShowMigrationNotice = (): boolean => {
  if (!isMigrationNoticeTarget()) return false;
  return shouldShowNoticeBySchedule(MIGRATION_NOTICE_DATE_KEY);
};

export const markMigrationNoticeShown = (): void => {
  markNoticeShown(MIGRATION_NOTICE_DATE_KEY);
};

export const shouldShowGithubReturnNotice = (): boolean => {
  if (!isGithubReturnNoticeTarget()) return false;
  return shouldShowNoticeBySchedule(GITHUB_RETURN_NOTICE_DATE_KEY);
};

export const markGithubReturnNoticeShown = (): void => {
  markNoticeShown(GITHUB_RETURN_NOTICE_DATE_KEY);
};
