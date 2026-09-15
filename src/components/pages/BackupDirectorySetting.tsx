import React, { useEffect, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import {
  clearBackupDirectory,
  getBackupDirectory,
  isDirectoryPickerSupported,
  pickBackupDirectory,
  requestBackupDirectoryPermission,
} from '../../utils/backupDirectory';

/** 설정 > 데이터 관리: 자동 백업 파일을 저장할 폴더 선택 */
const BackupDirectorySetting: React.FC = () => {
  const [dir, setDir] = useState<{ name: string; permission: PermissionState } | null>(null);
  const [error, setError] = useState('');

  const refresh = () => getBackupDirectory().then(setDir).catch(() => setDir(null));
  useEffect(() => {
    refresh();
  }, []);

  if (!isDirectoryPickerSupported()) {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        이 브라우저는 저장 폴더 지정을 지원하지 않아 자동 백업이 다운로드 폴더로 저장됩니다. (크롬·웨일·엣지에서 지정 가능)
      </Typography>
    );
  }

  const run = (fn: () => Promise<unknown>) => async () => {
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(`폴더를 설정하지 못했습니다: ${(e as Error).message}`);
    }
    refresh();
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="body2">자동 백업 저장 폴더:</Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {dir ? `📁 ${dir.name}` : '브라우저 기본 다운로드 폴더'}
        </Typography>
        <Button size="small" variant="outlined" startIcon={<FolderOpenIcon />} onClick={run(pickBackupDirectory)}>
          {dir ? '폴더 변경' : '폴더 선택'}
        </Button>
        {dir && dir.permission !== 'granted' && (
          <Button size="small" variant="contained" onClick={run(requestBackupDirectoryPermission)}>
            권한 다시 허용
          </Button>
        )}
        {dir && (
          <Button size="small" onClick={run(clearBackupDirectory)}>
            기본값으로
          </Button>
        )}
      </Box>
      <Typography
        variant="caption"
        color={error ? 'error' : dir && dir.permission !== 'granted' ? 'warning.main' : 'text.secondary'}
        sx={{ display: 'block', mt: 0.5 }}
      >
        {error ||
          (dir && dir.permission !== 'granted'
            ? '브라우저를 다시 켜서 폴더 쓰기 권한이 꺼졌습니다. [권한 다시 허용]을 누르고 "방문할 때마다 허용"을 고르면 계속 유지됩니다. 권한이 없으면 다운로드 폴더로 저장됩니다.'
            : '폴더를 고르면 자동 백업 파일이 그 폴더에 바로 저장됩니다. 권한이 없을 때는 다운로드 폴더로 저장됩니다.')}
      </Typography>
    </Box>
  );
};

export default BackupDirectorySetting;
