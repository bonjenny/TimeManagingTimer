import { getItem, setItem } from './storage';

export const MIGRATION_NOTICE_DATE_KEY = '__migration_notice_date';

export const LEGACY_APP_PATH = '/EFA/time-managing.html';

const isLocalEnvironment = (): boolean => {
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
};

const isLegacyEcountApp = (): boolean => {
  if (window.location.hostname !== 'developer.ecount.com') return false;

  const pathname = window.location.pathname;
  return pathname === LEGACY_APP_PATH || pathname.endsWith(LEGACY_APP_PATH);
};

export const isMigrationNoticeTarget = (): boolean => {
  return isLocalEnvironment() || isLegacyEcountApp();
};

export const shouldShowMigrationNotice = (): boolean => {
  if (!isMigrationNoticeTarget()) return false;

  const today = new Date().toISOString().slice(0, 10);
  const last_shown_date = getItem(MIGRATION_NOTICE_DATE_KEY);
  return last_shown_date !== today;
};

export const markMigrationNoticeShown = (): void => {
  const today = new Date().toISOString().slice(0, 10);
  setItem(MIGRATION_NOTICE_DATE_KEY, today);
};
