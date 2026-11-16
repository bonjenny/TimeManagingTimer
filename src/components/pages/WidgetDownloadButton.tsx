import React, { useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import DownloadIcon from '@mui/icons-material/Download';

// 바탕화면 위젯(desktop-widget, Electron) 받기. exe 는 웹앱 빌드 때 dist 에 같이 복사된다 (scripts/copy-widget.cjs).
// 정보 파일(버전 · 크기)이 없으면 아직 올라온 위젯이 없는 것 (개발 서버 · 위젯을 빌드하지 않은 배포)
const WIDGET_EXE = './timekeeper-widget.exe';
const WIDGET_INFO = './timekeeper-widget.json';

interface WidgetInfo {
  version: string;
  size: number;
}

const WidgetDownloadButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<WidgetInfo | null | undefined>(undefined); // undefined: 확인 중, null: 없음

  useEffect(() => {
    if (!open || info !== undefined) return;
    fetch(WIDGET_INFO, { cache: 'no-cache' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: WidgetInfo | null) => setInfo(json?.version ? json : null))
      .catch(() => setInfo(null));
  }, [open, info]);

  return (
    <>
      <Button variant="outlined" startIcon={<DesktopWindowsIcon />} onClick={() => setOpen(true)} sx={{ whiteSpace: 'nowrap' }}>
        바탕화면 위젯
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>바탕화면 위젯</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            이 캘린더(일정 · 근태)를 바탕화면에 띄워 두는 Windows 프로그램이에요. 설치 없이 exe 하나로 돌아가요.
          </Typography>
          <Box component="ol" sx={{ m: 0, pl: 2.5, '& li': { fontSize: 14, mb: 0.75 } }}>
            <li>받은 파일을 계속 둘 폴더(예: C:\Tools)로 옮겨서 실행해요.</li>
            <li>처음에 「알 수 없는 게시자」 경고가 뜨면 「추가 정보 › 실행」을 눌러요.</li>
            <li>설정 › 데이터 관리에서 고른 「자동 백업 폴더」를 위젯에서도 똑같이 골라요. 위젯은 그 폴더를 보고 그려요.</li>          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            {info === undefined
              ? '파일 확인 중…'
              : info
                ? `버전 ${info.version} · ${Math.round(info.size / 1024 / 1024)}MB`
                : '아직 서버에 올라온 위젯 파일이 없어요.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>닫기</Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            disabled={!info}
            component="a"
            href={WIDGET_EXE}
            download={info ? `TimeKeeper-캘린더-위젯-${info.version}.exe` : undefined}
            onClick={() => setOpen(false)}
          >
            받기
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default WidgetDownloadButton;
