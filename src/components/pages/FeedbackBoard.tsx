import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  IconButton,
  Divider,
  Alert,
  Snackbar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

// 게시글 타입
interface FeedbackPost {
  id: string;
  nickname: string;
  title: string;
  content: string;
  password_hash: string; // 비밀번호 해시 (간단한 해시)
  created_at: number;
  updated_at: number;
  category: 'idea' | 'bug' | 'etc';
}

// LocalStorage 키
const FEEDBACK_STORAGE_KEY = 'timekeeper-feedback-posts';

// 간단한 해시 함수 (실제 서비스에서는 bcrypt 등 사용)
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
};

// 카테고리 라벨
const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  idea: { label: '아이디어', color: '#10b981' },
  bug: { label: '버그', color: '#ef4444' },
  etc: { label: '기타', color: '#6b7280' },
};

const FeedbackBoard: React.FC = () => {
  // 게시글 목록
  const [posts, setPosts] = useState<FeedbackPost[]>(() => {
    try {
      const saved = localStorage.getItem(FEEDBACK_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 뷰 상태: 'list' | 'detail' | 'write'
  const [view, setView] = useState<'list' | 'detail' | 'write'>('list');
  const [selected_post, setSelectedPost] = useState<FeedbackPost | null>(null);

  // 글쓰기/수정 폼 상태
  const [form_nickname, setFormNickname] = useState('');
  const [form_title, setFormTitle] = useState('');
  const [form_content, setFormContent] = useState('');
  const [form_password, setFormPassword] = useState('');
  const [form_category, setFormCategory] = useState<'idea' | 'bug' | 'etc'>('idea');
  const [is_editing, setIsEditing] = useState(false);

  // 비밀번호 확인 모달
  const [password_modal_open, setPasswordModalOpen] = useState(false);
  const [password_modal_type, setPasswordModalType] = useState<'edit' | 'delete'>('edit');
  const [password_input, setPasswordInput] = useState('');
  const [password_error, setPasswordError] = useState(false);

  // 스낵바
  const [snackbar_open, setSnackbarOpen] = useState(false);
  const [snackbar_message, setSnackbarMessage] = useState('');

  // LocalStorage 저장
  useEffect(() => {
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(posts));
  }, [posts]);

  // 정렬된 게시글 (최신순)
  const sorted_posts = useMemo(() => {
    return [...posts].sort((a, b) => b.created_at - a.created_at);
  }, [posts]);

  // 글쓰기 폼 초기화
  const resetForm = () => {
    setFormNickname('');
    setFormTitle('');
    setFormContent('');
    setFormPassword('');
    setFormCategory('idea');
    setIsEditing(false);
  };

  // 글쓰기 버튼 클릭
  const handleWriteClick = () => {
    resetForm();
    setView('write');
  };

  // 게시글 클릭 (상세 보기)
  const handlePostClick = (post: FeedbackPost) => {
    setSelectedPost(post);
    setView('detail');
  };

  // 뒤로가기
  const handleBack = () => {
    setView('list');
    setSelectedPost(null);
    resetForm();
  };

  // 글 저장
  const handleSave = () => {
    if (!form_title.trim() || !form_content.trim() || !form_password.trim()) {
      setSnackbarMessage('제목, 내용, 비밀번호를 모두 입력해주세요.');
      setSnackbarOpen(true);
      return;
    }

    const now = Date.now();

    if (is_editing && selected_post) {
      // 수정
      setPosts((prev) =>
        prev.map((p) =>
          p.id === selected_post.id
            ? {
                ...p,
                nickname: form_nickname || '익명',
                title: form_title,
                content: form_content,
                category: form_category,
                updated_at: now,
              }
            : p
        )
      );
      setSnackbarMessage('게시글이 수정되었습니다.');
    } else {
      // 새 글 작성
      const new_post: FeedbackPost = {
        id: crypto.randomUUID(),
        nickname: form_nickname || '익명',
        title: form_title,
        content: form_content,
        password_hash: simpleHash(form_password),
        created_at: now,
        updated_at: now,
        category: form_category,
      };
      setPosts((prev) => [...prev, new_post]);
      setSnackbarMessage('게시글이 등록되었습니다.');
    }

    setSnackbarOpen(true);
    handleBack();
  };

  // 수정 버튼 클릭 (비밀번호 확인 모달)
  const handleEditClick = () => {
    setPasswordModalType('edit');
    setPasswordInput('');
    setPasswordError(false);
    setPasswordModalOpen(true);
  };

  // 삭제 버튼 클릭 (비밀번호 확인 모달)
  const handleDeleteClick = () => {
    setPasswordModalType('delete');
    setPasswordInput('');
    setPasswordError(false);
    setPasswordModalOpen(true);
  };

  // 비밀번호 확인
  const handlePasswordConfirm = () => {
    if (!selected_post) return;

    const input_hash = simpleHash(password_input);
    if (input_hash !== selected_post.password_hash) {
      setPasswordError(true);
      return;
    }

    setPasswordModalOpen(false);

    if (password_modal_type === 'edit') {
      // 수정 모드로 전환
      setFormNickname(selected_post.nickname);
      setFormTitle(selected_post.title);
      setFormContent(selected_post.content);
      setFormCategory(selected_post.category);
      setFormPassword('');
      setIsEditing(true);
      setView('write');
    } else {
      // 삭제
      setPosts((prev) => prev.filter((p) => p.id !== selected_post.id));
      setSnackbarMessage('게시글이 삭제되었습니다.');
      setSnackbarOpen(true);
      handleBack();
    }
  };

  // 날짜 포맷
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  };

  // 목록 뷰
  const renderListView = () => (
    <>
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          mb: 3,
          bgcolor: '#f8f9fa',
          borderColor: 'var(--border-color, #eaeaea)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
              건의사항
            </Typography>
            <Typography variant="body2" color="text.secondary">
              앱 개선 아이디어나 버그 리포트를 남겨주세요.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleWriteClick}
            sx={{ bgcolor: '#000', '&:hover': { bgcolor: '#333' } }}
          >
            글쓰기
          </Button>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ borderColor: 'var(--border-color, #eaeaea)' }}>
        {sorted_posts.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant="body1" sx={{ mb: 1 }}>
              등록된 게시글이 없습니다.
            </Typography>
            <Typography variant="body2">
              첫 번째 건의사항을 작성해보세요!
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {sorted_posts.map((post, index) => (
              <React.Fragment key={post.id}>
                {index > 0 && <Divider />}
                <ListItem disablePadding>
                  <ListItemButton onClick={() => handlePostClick(post)} sx={{ py: 2 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Chip
                            label={CATEGORY_LABELS[post.category].label}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.7rem',
                              bgcolor: CATEGORY_LABELS[post.category].color,
                              color: '#fff',
                            }}
                          />
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {post.title}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {post.nickname} · {formatDate(post.created_at)}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
    </>
  );

  // 상세 뷰
  const renderDetailView = () => {
    if (!selected_post) return null;

    return (
      <>
        <Box sx={{ mb: 2 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ color: 'text.secondary' }}>
            목록으로
          </Button>
        </Box>

        <Paper variant="outlined" sx={{ p: 3, borderColor: 'var(--border-color, #eaeaea)' }}>
          {/* 헤더 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Chip
                  label={CATEGORY_LABELS[selected_post.category].label}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                    bgcolor: CATEGORY_LABELS[selected_post.category].color,
                    color: '#fff',
                  }}
                />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                {selected_post.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {selected_post.nickname} · {formatDate(selected_post.created_at)}
                {selected_post.updated_at !== selected_post.created_at && ' (수정됨)'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton size="small" onClick={handleEditClick}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={handleDeleteClick} sx={{ color: '#ef4444' }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* 본문 */}
          <Typography
            variant="body1"
            sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, minHeight: 200 }}
          >
            {selected_post.content}
          </Typography>
        </Paper>
      </>
    );
  };

  // 글쓰기/수정 뷰
  const renderWriteView = () => (
    <>
      <Box sx={{ mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ color: 'text.secondary' }}>
          {is_editing ? '취소' : '목록으로'}
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ p: 3, borderColor: 'var(--border-color, #eaeaea)' }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
          {is_editing ? '게시글 수정' : '새 게시글 작성'}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* 카테고리 선택 */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {Object.entries(CATEGORY_LABELS).map(([key, { label, color }]) => (
              <Chip
                key={key}
                label={label}
                onClick={() => setFormCategory(key as 'idea' | 'bug' | 'etc')}
                sx={{
                  bgcolor: form_category === key ? color : '#f0f0f0',
                  color: form_category === key ? '#fff' : 'text.primary',
                  cursor: 'pointer',
                  '&:hover': { opacity: 0.8 },
                }}
              />
            ))}
          </Box>

          {/* 닉네임 */}
          <TextField
            label="닉네임 (선택)"
            placeholder="익명"
            value={form_nickname}
            onChange={(e) => setFormNickname(e.target.value)}
            fullWidth
          />

          {/* 제목 */}
          <TextField
            label="제목"
            placeholder="제목을 입력하세요"
            value={form_title}
            onChange={(e) => setFormTitle(e.target.value)}
            fullWidth
            required
          />

          {/* 내용 */}
          <TextField
            label="내용"
            placeholder="건의사항을 자세히 작성해주세요"
            value={form_content}
            onChange={(e) => setFormContent(e.target.value)}
            fullWidth
            multiline
            rows={8}
            required
          />

          {/* 비밀번호 */}
          {!is_editing && (
            <TextField
              label="비밀번호"
              type="password"
              placeholder="수정/삭제 시 필요합니다"
              value={form_password}
              onChange={(e) => setFormPassword(e.target.value)}
              fullWidth
              required
            />
          )}

          {is_editing && (
            <Alert severity="info">
              비밀번호는 변경되지 않습니다. 기존 비밀번호를 계속 사용하세요.
            </Alert>
          )}

          {/* 버튼 */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
            <Button onClick={handleBack} color="inherit">
              취소
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              sx={{ bgcolor: '#000', '&:hover': { bgcolor: '#333' } }}
            >
              {is_editing ? '수정하기' : '등록하기'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </>
  );

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      {view === 'list' && renderListView()}
      {view === 'detail' && renderDetailView()}
      {view === 'write' && renderWriteView()}

      {/* 비밀번호 확인 모달 */}
      <Dialog open={password_modal_open} onClose={() => setPasswordModalOpen(false)}>
        <DialogTitle>비밀번호 확인</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {password_modal_type === 'edit'
              ? '게시글을 수정하려면 비밀번호를 입력하세요.'
              : '게시글을 삭제하려면 비밀번호를 입력하세요.'}
          </Typography>
          <TextField
            type="password"
            label="비밀번호"
            value={password_input}
            onChange={(e) => {
              setPasswordInput(e.target.value);
              setPasswordError(false);
            }}
            fullWidth
            autoFocus
            error={password_error}
            helperText={password_error ? '비밀번호가 일치하지 않습니다.' : ''}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handlePasswordConfirm();
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordModalOpen(false)} color="inherit">
            취소
          </Button>
          <Button
            onClick={handlePasswordConfirm}
            variant="contained"
            color={password_modal_type === 'delete' ? 'error' : 'primary'}
          >
            {password_modal_type === 'edit' ? '수정' : '삭제'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar_open}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSnackbarOpen(false)}>
          {snackbar_message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FeedbackBoard;
