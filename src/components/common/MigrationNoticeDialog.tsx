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
import {
  shouldShowMigrationNotice,
  markMigrationNoticeShown,
  LEGACY_APP_PATH,
} from '../../utils/migrationNotice';

const OLD_SITE_URL = `https://developer.ecount.com${LEGACY_APP_PATH}`;
const NEW_SITE_URL = 'https://bonjenny.github.io/';

interface MigrationNoticeDialogProps {
  onResolved: () => void;
}

const MigrationNoticeDialog = ({ onResolved }: MigrationNoticeDialogProps) => {
  const [open, setOpen] = useState(false);

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

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>서버 이전 안내</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          10.10.10.250번 서버가 제거될 예정입니다.
        </Alert>
        <Typography variant="body2" sx={{ mb: 1.5, lineHeight: 1.7 }}>
          따라서 해당 서버에서 운영되던{' '}
          <Link href={OLD_SITE_URL} target="_blank" rel="noopener noreferrer">
            {OLD_SITE_URL}
          </Link>
          도 폐쇄될 예정입니다.
        </Typography>
        <Typography variant="body2" sx={{ mb: 1.5, lineHeight: 1.7 }}>
          계속 사용 원하시면, <strong>설정 &gt; 데이터 관리 &gt; 데이터 수동 내보내기</strong> 후,{' '}
          <Link href={NEW_SITE_URL} target="_blank" rel="noopener noreferrer">
            {NEW_SITE_URL}
          </Link>
          에서 <strong>설정 &gt; 데이터 관리 &gt; 데이터 가져오기</strong>로 사용 부탁드립니다.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          모든 데이터는 게시판 제외, 서버에 저장되지 않으며 내 컴퓨터(브라우저 IndexedDB)에
          저장됩니다.
        </Typography>
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
