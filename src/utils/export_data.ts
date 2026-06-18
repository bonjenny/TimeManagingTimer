import { getAllItems } from './storage';

export function buildExportPayload(): Record<string, unknown> {
  const all_items = getAllItems();
  const export_data: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(all_items)) {
    try {
      export_data[key] = JSON.parse(value);
    } catch {
      export_data[key] = value;
    }
  }

  return export_data;
}

export function downloadExportJson(filename_prefix = 'timekeeper-backup'): void {
  const today = new Date().toISOString().slice(0, 10);
  const export_data = buildExportPayload();
  const blob = new Blob([JSON.stringify(export_data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename_prefix}-${today}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
