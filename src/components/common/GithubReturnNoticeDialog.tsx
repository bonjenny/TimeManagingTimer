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
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  shouldShowGithubReturnNotice,
  markGithubReturnNoticeShown,
  APP_URL,
  GITHUB_PAGES_URL,
  SERVER_SWITCH_DATE_LABEL,
} from '../../utils/migrationNotice';
import { downloadExportJson } from '../../utils/export_data';
import { AUTO_BACKUP_DATE_KEY } from '../../utils/autoBackup';
import { setItem } from '../../utils/storage';

interface GithubReturnNoticeDialogProps {
  onResolved: () => void;
}

const GithubReturnNoticeDialog = ({ onResolved }: GithubReturnNoticeDialogProps) => {
  const [open, setOpen] = useState(false);
  const [export_message, setExportMessage] = useState<string | null>(null);

  useEffect(() => {
    if (shouldShowGithubReturnNotice()) {
      setOpen(true);
      return;
    }

    onResolved();
  }, [onResolved]);

  const handleClose = () => {
    markGithubReturnNoticeShown();
    setOpen(false);
    onResolved();
  };

  const handleExport = () => {
    downloadExportJson('timekeeper-backup');
    const today = new Date().toISOString().slice(0, 10);
    setItem(AUTO_BACKUP_DATE_KEY, today);
    setExportMessage('데이터를 JSON 파일로 저장했습니다. developer.ecount.com에서 가져오기 해 주세요.');
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>접속 주소 안내</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          이전 안내에 따라{' '}
          <Link href={GITHUB_PAGES_URL} target="_blank" rel="noopener noreferrer">
            bonjenny.github.io
          </Link>
          로 옮겨 사용 중이실 수 있습니다.
        </Alert>
        <Typography variant="body2" sx={{ mb: 1.5, lineHeight: 1.7 }}>
          내부 서버 전환 계획이 변경되어, 앞으로는 기존 주소인{' '}
          <Link href={APP_URL} target="_blank" rel="noopener noreferrer">
            {APP_URL}
          </Link>
          를 <strong>그대로 사용</strong>하시면 됩니다.
        </Typography>
        <Typography variant="body2" sx={{ mb: 1.5, lineHeight: 1.7 }}>
          bonjenny.github.io에만 저장된 데이터가 있다면, 아래 버튼으로 JSON 백업 후{' '}
          developer.ecount.com에서 <strong>설정 &gt; 데이터 관리 &gt; 데이터 가져오기</strong>를
          이용해 주세요.
        </Typography>
        <Alert severity="warning" sx={{ mb: 2 }}>
          {SERVER_SWITCH_DATE_LABEL} 퇴근 전까지 백업을 권장합니다.
        </Alert>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExport}
          fullWidth
          sx={{ mb: 1.5 }}
        >
          데이터 백업 (JSON 다운로드)
        </Button>
        <Button
          variant="contained"
          component="a"
          href={APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          startIcon={<OpenInNewIcon />}
          fullWidth
        >
          developer.ecount.com으로 이동
        </Button>
        {export_message && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {export_message}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" onClick={handleClose}>
          확인
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GithubReturnNoticeDialog;
