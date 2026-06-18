import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Link,
  Alert,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import {
  shouldShowMigrationNotice,
  markMigrationNoticeShown,
  LEGACY_APP_PATH,
} from '../../utils/migrationNotice';
import { downloadExportJson } from '../../utils/export_data';
import { AUTO_BACKUP_DATE_KEY } from '../../utils/autoBackup';
import { setItem } from '../../utils/storage';

const OLD_SITE_URL = `https://developer.ecount.com${LEGACY_APP_PATH}`;
const NEW_SITE_URL = 'https://bonjenny.github.io/';

interface MigrationNoticeDialogProps {
  onResolved: () => void;
}

const MigrationNoticeDialog = ({ onResolved }: MigrationNoticeDialogProps) => {
  const [open, setOpen] = useState(false);
  const [export_message, setExportMessage] = useState<string | null>(null);

  useEffect(() => {
    if (shouldShowMigrationNotice()) {
      setOpen(true);
      return;
    }

    onResolved();
  }, [onResolved]);

  const handleClose = () => {
    markMigrationNoticeShown();
    setOpen(false);
    onResolved();
  };

  const handleExport = () => {
    downloadExportJson('timekeeper-backup');
    const today = new Date().toISOString().slice(0, 10);
    setItem(AUTO_BACKUP_DATE_KEY, today);
    setExportMessage('IndexedDB 데이터를 JSON 파일로 저장했습니다. 새 사이트에서 가져오기 해 주세요.');
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>서버 이전 안내</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          10.10.10.250번 서버가 6/19(금) 이후 제거될 예정입니다.
        </Alert>
        <Typography variant="body2" sx={{ mb: 1.5, lineHeight: 1.7 }}>
          따라서 해당 서버에서 운영되던{' '}
          <Link href={OLD_SITE_URL} target="_blank" rel="noopener noreferrer">
            {OLD_SITE_URL}
          </Link>
          도 폐쇄될 예정입니다.
        </Typography>
        <Typography variant="body2" sx={{ mb: 1.5, lineHeight: 1.7 }}>
          아래 버튼으로 이 브라우저 IndexedDB에 저장된 데이터를 JSON으로 저장한 뒤,{' '}
          <Link href={NEW_SITE_URL} target="_blank" rel="noopener noreferrer">
            {NEW_SITE_URL}
          </Link>
          에서 <strong>설정 &gt; 데이터 관리 &gt; 데이터 가져오기</strong> 또는{' '}
          <strong>구 사이트에서 데이터 가져오기</strong>로 이전해 주세요.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
          모든 데이터는 게시판 제외, 서버에 저장되지 않으며 내 컴퓨터(브라우저 IndexedDB)에
          저장됩니다.
        </Typography>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExport}
          fullWidth
        >
          IndexedDB 데이터보내기 (JSON 다운로드)
        </Button>
        {export_message && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {export_message}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="contained" onClick={handleClose}>
          확인
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MigrationNoticeDialog;
