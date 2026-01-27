import React, { useState, useEffect, useCallback } from 'react';
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
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';

import {
  FeedbackPost,
  Comment,
  fetchPosts,
  createPost,
  updatePost,
  deletePost,
  addComment,
  deleteComment,
  simpleHash,
} from '../../services/feedbackService';

// 카테고리 라벨
const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  idea: { label: '아이디어', color: '#10b981' },
  bug: { label: '버그', color: '#ef4444' },
  etc: { label: '기타', color: '#6b7280' },
};

// 카테고리 안전 접근 헬퍼
const getCategoryInfo = (category: string | undefined) => {
  return CATEGORY_LABELS[category || 'etc'] || CATEGORY_LABELS.etc;
};

const FeedbackBoard: React.FC = () => {
  // 게시글 목록
  const [posts, setPosts] = useState<FeedbackPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
  const [password_modal_type, setPasswordModalType] = useState<'edit' | 'delete' | 'comment_delete'>('edit');
  const [password_input, setPasswordInput] = useState('');
  const [password_error, setPasswordError] = useState(false);
  const [target_comment_id, setTargetCommentId] = useState<string | null>(null);

  // 댓글 폼 상태
  const [comment_nickname, setCommentNickname] = useState('');
  const [comment_content, setCommentContent] = useState('');
  const [comment_password, setCommentPassword] = useState('');

  // 스낵바
  const [snackbar_open, setSnackbarOpen] = useState(false);
  const [snackbar_message, setSnackbarMessage] = useState('');
  const [snackbar_severity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  // 게시글 로드
  const loadPosts = useCallback(async () => {
    setLoading(true);
    const data = await fetchPosts();
    setPosts(data);
    setLoading(false);
  }, []);

  // 초기 로드
  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // 스낵바 표시 헬퍼
  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

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
  const handleSave = async () => {
    if (!form_title.trim() || !form_content.trim() || (!is_editing && !form_password.trim())) {
      showSnackbar('제목, 내용, 비밀번호를 모두 입력해주세요.', 'error');
      return;
    }

    setSaving(true);
    const now = Date.now();

    if (is_editing && selected_post) {
      // 수정
      const success = await updatePost(selected_post.id, {
        nickname: form_nickname || '익명',
        title: form_title,
        content: form_content,
        category: form_category,
      });

      if (success) {
        showSnackbar('게시글이 수정되었습니다.');
        await loadPosts();
      } else {
        showSnackbar('수정에 실패했습니다.', 'error');
      }
    } else {
      // 새 글 작성
      const new_post: Omit<FeedbackPost, 'id'> = {
        nickname: form_nickname || '익명',
        title: form_title,
        content: form_content,
        password_hash: simpleHash(form_password),
        created_at: now,
        updated_at: now,
        category: form_category,
        comments: [],
      };

      const id = await createPost(new_post);
      if (id) {
        showSnackbar('게시글이 등록되었습니다.');
        await loadPosts();
      } else {
        showSnackbar('등록에 실패했습니다.', 'error');
      }
    }

    setSaving(false);
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

  // 댓글 등록
  const handleCommentSubmit = async () => {
    if (!selected_post) return;
    if (!comment_content.trim() || !comment_password.trim()) {
      showSnackbar('내용과 비밀번호를 입력해주세요.', 'error');
      return;
    }

    setSaving(true);

    const new_comment: Comment = {
      id: crypto.randomUUID(),
      nickname: comment_nickname || '익명',
      content: comment_content,
      password_hash: simpleHash(comment_password),
      created_at: Date.now(),
    };

    const success = await addComment(
      selected_post.id,
      selected_post.comments || [],
      new_comment
    );

    if (success) {
      // 로컬 상태 업데이트
      const updated_post = {
        ...selected_post,
        comments: [...(selected_post.comments || []), new_comment],
      };
      setSelectedPost(updated_post);
      setPosts((prev) => prev.map((p) => (p.id === selected_post.id ? updated_post : p)));

      // 폼 초기화
      setCommentNickname('');
      setCommentContent('');
      setCommentPassword('');
      showSnackbar('댓글이 등록되었습니다.');
    } else {
      showSnackbar('댓글 등록에 실패했습니다.', 'error');
    }

    setSaving(false);
  };

  // 댓글 삭제 클릭
  const handleCommentDeleteClick = (comment_id: string) => {
    setTargetCommentId(comment_id);
    setPasswordModalType('comment_delete');
    setPasswordInput('');
    setPasswordError(false);
    setPasswordModalOpen(true);
  };

  // 비밀번호 확인
  const handlePasswordConfirm = async () => {
    if (!selected_post) return;

    const input_hash = simpleHash(password_input);

    // 댓글 삭제의 경우
    if (password_modal_type === 'comment_delete') {
      const target_comment = selected_post.comments?.find((c) => c.id === target_comment_id);
      if (!target_comment || target_comment.password_hash !== input_hash) {
        setPasswordError(true);
        return;
      }

      setSaving(true);
      const success = await deleteComment(
        selected_post.id,
        selected_post.comments,
        target_comment_id!
      );

      if (success) {
        const updated_post = {
          ...selected_post,
          comments: selected_post.comments.filter((c) => c.id !== target_comment_id),
        };
        setSelectedPost(updated_post);
        setPosts((prev) => prev.map((p) => (p.id === selected_post.id ? updated_post : p)));
        showSnackbar('댓글이 삭제되었습니다.');
      } else {
        showSnackbar('댓글 삭제에 실패했습니다.', 'error');
      }

      setSaving(false);
      setPasswordModalOpen(false);
      return;
    }

    // 게시글 수정/삭제의 경우
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
      setSaving(true);
      const success = await deletePost(selected_post.id);
      
      if (success) {
        showSnackbar('게시글이 삭제되었습니다.');
        await loadPosts();
      } else {
        showSnackbar('삭제에 실패했습니다.', 'error');
      }
      
      setSaving(false);
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
          bgcolor: 'var(--bg-tertiary)',
          borderColor: 'var(--border-color)',
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
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={loadPosts} disabled={loading} title="새로고침">
              <RefreshIcon />
            </IconButton>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleWriteClick}
              sx={{ bgcolor: 'var(--primary-color)', color: 'white', '&:hover': { bgcolor: 'var(--accent-color)' } }}
            >
              글쓰기
            </Button>
          </Box>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ borderColor: 'var(--border-color)' }}>
        {loading ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              게시글을 불러오는 중...
            </Typography>
          </Box>
        ) : posts.length === 0 ? (
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
            {posts.map((post, index) => (
              <React.Fragment key={post.id}>
                {index > 0 && <Divider />}
                <ListItem disablePadding>
                  <ListItemButton onClick={() => handlePostClick(post)} sx={{ py: 2 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Chip
                            label={getCategoryInfo(post.category).label}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.7rem',
                              bgcolor: getCategoryInfo(post.category).color,
                              color: '#fff',
                            }}
                          />
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {post.title}
                          </Typography>
                          {post.comments && post.comments.length > 0 && (
                            <Typography variant="caption" color="primary">
                              [{post.comments.length}]
                            </Typography>
                          )}
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

        <Paper variant="outlined" sx={{ p: 3, borderColor: 'var(--border-color)', mb: 3 }}>
          {/* 헤더 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Chip
                  label={getCategoryInfo(selected_post.category).label}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                    bgcolor: getCategoryInfo(selected_post.category).color,
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
              <IconButton size="small" onClick={handleEditClick} disabled={saving}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={handleDeleteClick} disabled={saving} sx={{ color: '#ef4444' }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* 본문 */}
          <Typography
            variant="body1"
            sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, minHeight: 100 }}
          >
            {selected_post.content}
          </Typography>
        </Paper>

        {/* 댓글 영역 */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            댓글 {selected_post.comments?.length || 0}
          </Typography>

          {/* 댓글 목록 */}
          <Paper variant="outlined" sx={{ borderColor: 'var(--border-color, #eaeaea)', mb: 3 }}>
            {!selected_post.comments || selected_post.comments.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                <Typography variant="body2">첫 번째 댓글을 남겨보세요.</Typography>
              </Box>
            ) : (
              <List disablePadding>
                {selected_post.comments.map((comment, index) => (
                  <React.Fragment key={comment.id}>
                    {index > 0 && <Divider />}
                    <ListItem alignItems="flex-start" sx={{ py: 2 }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {comment.nickname}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                {formatDate(comment.created_at)}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() => handleCommentDeleteClick(comment.id)}
                                disabled={saving}
                                sx={{ color: 'text.secondary', p: 0.5 }}
                              >
                                <DeleteIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Box>
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" color="text.primary" sx={{ whiteSpace: 'pre-wrap' }}>
                            {comment.content}
                          </Typography>
                        }
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>

          {/* 댓글 작성 폼 */}
          <Paper variant="outlined" sx={{ p: 2, borderColor: 'var(--border-color)', bgcolor: 'var(--bg-tertiary)' }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                size="small"
                label="닉네임"
                placeholder="익명"
                value={comment_nickname}
                onChange={(e) => setCommentNickname(e.target.value)}
                sx={{ width: 150 }}
              />
              <TextField
                size="small"
                type="password"
                label="비밀번호"
                placeholder="삭제 시 필요"
                value={comment_password}
                onChange={(e) => setCommentPassword(e.target.value)}
                sx={{ width: 150 }}
              />
            </Box>
            <TextField
              fullWidth
              multiline
              rows={2}
              placeholder="댓글을 입력하세요..."
              value={comment_content}
              onChange={(e) => setCommentContent(e.target.value)}
              sx={{ mb: 2, bgcolor: 'background.paper' }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                onClick={handleCommentSubmit}
                disabled={!comment_content.trim() || !comment_password.trim() || saving}
                sx={{ bgcolor: 'var(--primary-color)', color: 'white', '&:hover': { bgcolor: 'var(--accent-color)' } }}
              >
                {saving ? <CircularProgress size={20} color="inherit" /> : '댓글 등록'}
              </Button>
            </Box>
          </Paper>
        </Box>
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

      <Paper variant="outlined" sx={{ p: 3, borderColor: 'var(--border-color)' }}>
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
                  bgcolor: form_category === key ? color : 'var(--bg-hover)',
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
            <Button onClick={handleBack} color="inherit" disabled={saving}>
              취소
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              sx={{ bgcolor: 'var(--primary-color)', color: 'white', '&:hover': { bgcolor: 'var(--accent-color)' } }}
            >
              {saving ? <CircularProgress size={20} color="inherit" /> : (is_editing ? '수정하기' : '등록하기')}
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
      <Dialog 
        open={password_modal_open} 
        onClose={() => setPasswordModalOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && password_input.trim()) {
            e.preventDefault();
            handlePasswordConfirm();
          }
        }}
      >
        <DialogTitle>비밀번호 확인</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {password_modal_type === 'edit'
              ? '게시글을 수정하려면 비밀번호를 입력하세요.'
              : password_modal_type === 'delete'
              ? '게시글을 삭제하려면 비밀번호를 입력하세요.'
              : '댓글을 삭제하려면 비밀번호를 입력하세요.'}
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
          <Button onClick={() => setPasswordModalOpen(false)} color="inherit" disabled={saving}>
            취소
          </Button>
          <Button
            onClick={handlePasswordConfirm}
            variant="contained"
            color={password_modal_type === 'delete' || password_modal_type === 'comment_delete' ? 'error' : 'primary'}
            disabled={saving}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : 
              (password_modal_type === 'edit' ? '확인(Enter)' : '삭제(Enter)')}
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
        <Alert severity={snackbar_severity} onClose={() => setSnackbarOpen(false)}>
          {snackbar_message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FeedbackBoard;
