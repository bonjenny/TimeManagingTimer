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
  APP_URL,
  SERVER_SWITCH_DATE_LABEL,
} from '../../utils/migrationNotice';
import { downloadExportJson } from '../../utils/export_data';
import { AUTO_BACKUP_DATE_KEY } from '../../utils/autoBackup';
import { setItem } from '../../utils/storage';

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
    setExportMessage('데이터를 JSON 파일로 저장했습니다. 안전한 폴더에 보관해 주세요.');
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>내부 서버 전환 안내</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          10.10.10.250 서버는 {SERVER_SWITCH_DATE_LABEL} 이후 제거될 예정입니다.
        </Alert>
        <Typography variant="body2" sx={{ mb: 1.5, lineHeight: 1.7 }}>
          신규 서버(10.10.10.150)에 웹 환경 구성이 완료되었으며,
          <br />
          250 서버 사용 종료 후 <strong>developer.ecount.com</strong> 도메인을 150 서버로 연결해{' '}
          <Link href={APP_URL} target="_blank" rel="noopener noreferrer">
            {APP_URL}
          </Link>{' '}
          주소 그대로 사용 가능합니다.
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          만일을 대비해 <strong>{SERVER_SWITCH_DATE_LABEL} 퇴근 전</strong> 아래 버튼으로 JSON
          백업을 받아 두시기 바랍니다.
          <br />
          또는 <strong>설정 &gt; 데이터 관리 &gt; 데이터 수동보내기 (JSON)</strong>으로 백업 받아두실 수
          있습니다.
        </Alert>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExport}
          fullWidth
        >
          데이터 백업 (JSON 다운로드)
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
