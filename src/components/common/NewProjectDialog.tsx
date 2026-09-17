import React, { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import { useProjectStore } from '../../store/useProjectStore';

interface NewProjectDialogProps {
  /** 등록할 프로젝트 코드. 빈 문자열이면 창이 닫혀 있다. */
  code: string;
  onClose: () => void;
}

// 목록에 없는 프로젝트 코드를 넣었을 때 이름만 받아 프로젝트로 등록하는 창.
// 기록에는 이미 코드가 들어가 있으므로 「나중에」를 눌러도 기록은 그대로다.
const NewProjectDialog: React.FC<NewProjectDialogProps> = ({ code, onClose }) => {
  const { addProject } = useProjectStore();
  const [name, setName] = useState('');

  useEffect(() => {
    if (code) setName('');
  }, [code]);

  const save = () => {
    if (!name.trim()) return;
    addProject({ code, name: name.trim() });
    onClose();
  };

  return (
    <Dialog open={!!code} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>새 프로젝트 등록</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          프로젝트 코드 <b>{code}</b> 는 목록에 없습니다. 이름을 넣으면 프로젝트로 등록됩니다.
        </Typography>
        <TextField
          label="프로젝트 명"
          fullWidth
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) save();
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>나중에</Button>
        <Button variant="contained" disabled={!name.trim()} onClick={save}>
          등록
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewProjectDialog;
