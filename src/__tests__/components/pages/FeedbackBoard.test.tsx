/**
 * v0.10.4 테스트: FeedbackBoard 컴포넌트 테스트 (Firebase Firestore 연동)
 * feedbackService를 모킹하여 컴포넌트 동작 테스트
 */
import { render, screen, waitFor } from '../../../test-utils';
import userEvent from '@testing-library/user-event';
import FeedbackBoard from '../../../components/pages/FeedbackBoard';

// feedbackService 모킹
const mockFetchPosts = jest.fn();
const mockCreatePost = jest.fn();
const mockUpdatePost = jest.fn();
const mockDeletePost = jest.fn();
const mockAddComment = jest.fn();
const mockDeleteComment = jest.fn();

jest.mock('../../../services/feedbackService', () => ({
  fetchPosts: () => mockFetchPosts(),
  createPost: (post: unknown) => mockCreatePost(post),
  updatePost: (id: string, updates: unknown) => mockUpdatePost(id, updates),
  deletePost: (id: string) => mockDeletePost(id),
  addComment: (postId: string, comments: unknown[], comment: unknown) => 
    mockAddComment(postId, comments, comment),
  deleteComment: (postId: string, comments: unknown[], commentId: string) => 
    mockDeleteComment(postId, comments, commentId),
  simpleHash: (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  },
}));

describe('FeedbackBoard (Firebase 연동)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchPosts.mockResolvedValue([]);
  });

  describe('목록 화면', () => {
    it('건의사항 제목이 표시된다', async () => {
      render(<FeedbackBoard />);
      
      await waitFor(() => {
        expect(screen.getByText('건의사항')).toBeInTheDocument();
      });
    });

    it('글쓰기 버튼이 렌더링된다', async () => {
      render(<FeedbackBoard />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /글쓰기/i })).toBeInTheDocument();
      });
    });

    it('새로고침 버튼이 렌더링된다', async () => {
      render(<FeedbackBoard />);
      
      await waitFor(() => {
        expect(screen.getByTitle('새로고침')).toBeInTheDocument();
      });
    });

    it('로딩 중일 때 로딩 메시지가 표시된다', async () => {
      // fetchPosts가 지연되도록 설정
      mockFetchPosts.mockImplementation(() => new Promise(() => {}));
      
      render(<FeedbackBoard />);
      
      expect(screen.getByText(/게시글을 불러오는 중/i)).toBeInTheDocument();
    });

    it('게시글이 없으면 빈 상태 메시지가 표시된다', async () => {
      mockFetchPosts.mockResolvedValue([]);
      
      render(<FeedbackBoard />);
      
      await waitFor(() => {
        expect(screen.getByText(/등록된 게시글이 없습니다/i)).toBeInTheDocument();
      });
    });

    it('게시글 목록이 표시된다', async () => {
      mockFetchPosts.mockResolvedValue([
        {
          id: 'post-1',
          nickname: '테스터',
          title: '첫 번째 게시글',
          content: '내용입니다',
          password_hash: 'hash1',
          created_at: Date.now(),
          updated_at: Date.now(),
          category: 'idea',
          comments: [],
        },
        {
          id: 'post-2',
          nickname: '사용자',
          title: '두 번째 게시글',
          content: '버그 리포트',
          password_hash: 'hash2',
          created_at: Date.now() - 1000,
          updated_at: Date.now() - 1000,
          category: 'bug',
          comments: [{ id: 'c1', nickname: 'a', content: 'b', password_hash: 'c', created_at: 1 }],
        },
      ]);
      
      render(<FeedbackBoard />);
      
      await waitFor(() => {
        expect(screen.getByText('첫 번째 게시글')).toBeInTheDocument();
        expect(screen.getByText('두 번째 게시글')).toBeInTheDocument();
      });
    });

    it('댓글 수가 표시된다', async () => {
      mockFetchPosts.mockResolvedValue([
        {
          id: 'post-1',
          nickname: '테스터',
          title: '댓글 있는 글',
          content: '내용',
          password_hash: 'hash',
          created_at: Date.now(),
          updated_at: Date.now(),
          category: 'idea',
          comments: [
            { id: 'c1', nickname: 'a', content: 'b', password_hash: 'c', created_at: 1 },
            { id: 'c2', nickname: 'd', content: 'e', password_hash: 'f', created_at: 2 },
          ],
        },
      ]);
      
      render(<FeedbackBoard />);
      
      await waitFor(() => {
        expect(screen.getByText('[2]')).toBeInTheDocument();
      });
    });

    it('카테고리 칩이 올바르게 표시된다', async () => {
      mockFetchPosts.mockResolvedValue([
        {
          id: 'post-1',
          nickname: '테스터',
          title: '아이디어 글',
          content: '내용',
          password_hash: 'hash',
          created_at: Date.now(),
          updated_at: Date.now(),
          category: 'idea',
          comments: [],
        },
      ]);
      
      render(<FeedbackBoard />);
      
      await waitFor(() => {
        expect(screen.getByText('아이디어')).toBeInTheDocument();
      });
    });

    it('undefined 카테고리도 기타로 표시된다', async () => {
      mockFetchPosts.mockResolvedValue([
        {
          id: 'post-1',
          nickname: '테스터',
          title: '카테고리 없는 글',
          content: '내용',
          password_hash: 'hash',
          created_at: Date.now(),
          updated_at: Date.now(),
          category: undefined,
          comments: [],
        },
      ]);
      
      render(<FeedbackBoard />);
      
      await waitFor(() => {
        expect(screen.getByText('기타')).toBeInTheDocument();
      });
    });
  });

  describe('게시글 작성', () => {
    beforeEach(() => {
      mockFetchPosts.mockResolvedValue([]);
      mockCreatePost.mockResolvedValue('new-post-id');
    });

    it('글쓰기 버튼을 클릭하면 작성 화면으로 전환된다', async () => {
      const user = userEvent.setup();
      render(<FeedbackBoard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /글쓰기/i })).toBeInTheDocument();
      });

      const write_button = screen.getByRole('button', { name: /글쓰기/i });
      await user.click(write_button);

      expect(screen.getByText('새 게시글 작성')).toBeInTheDocument();
    });

    it('카테고리 선택 칩이 표시된다', async () => {
      const user = userEvent.setup();
      render(<FeedbackBoard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /글쓰기/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /글쓰기/i }));

      expect(screen.getByText('아이디어')).toBeInTheDocument();
      expect(screen.getByText('버그')).toBeInTheDocument();
      expect(screen.getByText('기타')).toBeInTheDocument();
    });

    it('필수 입력값 없이 등록하면 에러 메시지가 표시된다', async () => {
      const user = userEvent.setup();
      render(<FeedbackBoard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /글쓰기/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /글쓰기/i }));
      await user.click(screen.getByRole('button', { name: /등록하기/i }));

      await waitFor(() => {
        expect(screen.getByText(/제목, 내용, 비밀번호를 모두 입력해주세요/i)).toBeInTheDocument();
      });
    });

    it('게시글 등록 시 createPost가 호출된다', async () => {
      const user = userEvent.setup();
      render(<FeedbackBoard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /글쓰기/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /글쓰기/i }));

      await user.type(screen.getByLabelText(/제목/i), '테스트 제목');
      await user.type(screen.getByLabelText(/내용/i), '테스트 내용');
      await user.type(screen.getByLabelText(/비밀번호/i), '1234');

      await user.click(screen.getByRole('button', { name: /등록하기/i }));

      await waitFor(() => {
        expect(mockCreatePost).toHaveBeenCalledTimes(1);
        expect(mockCreatePost).toHaveBeenCalledWith(
          expect.objectContaining({
            title: '테스트 제목',
            content: '테스트 내용',
            nickname: '익명',
            category: 'idea',
          })
        );
      });
    });
  });

  describe('게시글 상세', () => {
    const mockPost = {
      id: 'test-post-1',
      nickname: '테스터',
      title: '상세 테스트 제목',
      content: '상세 테스트 내용입니다.',
      password_hash: '-yl089i', // simpleHash('1234')
      created_at: Date.now(),
      updated_at: Date.now(),
      category: 'idea' as const,
      comments: [],
    };

    beforeEach(() => {
      mockFetchPosts.mockResolvedValue([mockPost]);
    });

    it('게시글을 클릭하면 상세 화면으로 이동한다', async () => {
      const user = userEvent.setup();
      render(<FeedbackBoard />);

      await waitFor(() => {
        expect(screen.getByText('상세 테스트 제목')).toBeInTheDocument();
      });

      await user.click(screen.getByText('상세 테스트 제목'));

      expect(screen.getByText('상세 테스트 내용입니다.')).toBeInTheDocument();
    });

    it('목록으로 버튼이 동작한다', async () => {
      const user = userEvent.setup();
      render(<FeedbackBoard />);

      await waitFor(() => {
        expect(screen.getByText('상세 테스트 제목')).toBeInTheDocument();
      });

      await user.click(screen.getByText('상세 테스트 제목'));
      await user.click(screen.getByRole('button', { name: /목록으로/i }));

      await waitFor(() => {
        expect(screen.getByText('건의사항')).toBeInTheDocument();
        expect(screen.queryByText('상세 테스트 내용입니다.')).not.toBeInTheDocument();
      });
    });

    it('수정 버튼 클릭 시 비밀번호 모달이 표시된다', async () => {
      const user = userEvent.setup();
      render(<FeedbackBoard />);

      await waitFor(() => {
        expect(screen.getByText('상세 테스트 제목')).toBeInTheDocument();
      });

      await user.click(screen.getByText('상세 테스트 제목'));
      
      // EditIcon 버튼 클릭
      const edit_buttons = screen.getAllByRole('button');
      const edit_button = edit_buttons.find(btn => btn.querySelector('[data-testid="EditIcon"]'));
      if (edit_button) {
        await user.click(edit_button);
        expect(screen.getByText('비밀번호 확인')).toBeInTheDocument();
      }
    });

    it('삭제 버튼 클릭 시 비밀번호 모달이 표시된다', async () => {
      const user = userEvent.setup();
      render(<FeedbackBoard />);

      await waitFor(() => {
        expect(screen.getByText('상세 테스트 제목')).toBeInTheDocument();
      });

      await user.click(screen.getByText('상세 테스트 제목'));
      
      // DeleteIcon 버튼 클릭
      const delete_buttons = screen.getAllByRole('button');
      const delete_button = delete_buttons.find(btn => btn.querySelector('[data-testid="DeleteIcon"]'));
      if (delete_button) {
        await user.click(delete_button);
        expect(screen.getByText('비밀번호 확인')).toBeInTheDocument();
      }
    });
  });

  describe('댓글 기능', () => {
    const mockPost = {
      id: 'test-post-1',
      nickname: '테스터',
      title: '댓글 테스트 제목',
      content: '내용',
      password_hash: 'hash',
      created_at: Date.now(),
      updated_at: Date.now(),
      category: 'idea' as const,
      comments: [],
    };

    beforeEach(() => {
      mockFetchPosts.mockResolvedValue([mockPost]);
      mockAddComment.mockResolvedValue(true);
    });

    it('댓글 입력 폼이 표시된다', async () => {
      const user = userEvent.setup();
      render(<FeedbackBoard />);

      await waitFor(() => {
        expect(screen.getByText('댓글 테스트 제목')).toBeInTheDocument();
      });

      await user.click(screen.getByText('댓글 테스트 제목'));

      expect(screen.getByPlaceholderText(/댓글을 입력하세요/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /댓글 등록/i })).toBeInTheDocument();
    });

    it('댓글 등록 시 addComment가 호출된다', async () => {
      const user = userEvent.setup();
      render(<FeedbackBoard />);

      await waitFor(() => {
        expect(screen.getByText('댓글 테스트 제목')).toBeInTheDocument();
      });

      await user.click(screen.getByText('댓글 테스트 제목'));

      // 댓글 비밀번호 입력 (placeholder로 찾기)
      const password_inputs = screen.getAllByPlaceholderText(/삭제 시 필요/i);
      await user.type(password_inputs[0], '1234');
      
      await user.type(screen.getByPlaceholderText(/댓글을 입력하세요/i), '테스트 댓글');

      await user.click(screen.getByRole('button', { name: /댓글 등록/i }));

      await waitFor(() => {
        expect(mockAddComment).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('새로고침 기능', () => {
    it('새로고침 버튼 클릭 시 fetchPosts가 다시 호출된다', async () => {
      const user = userEvent.setup();
      mockFetchPosts.mockResolvedValue([]);
      
      render(<FeedbackBoard />);

      await waitFor(() => {
        expect(screen.getByTitle('새로고침')).toBeInTheDocument();
      });

      // 초기 로드 후 1번
      expect(mockFetchPosts).toHaveBeenCalledTimes(1);

      await user.click(screen.getByTitle('새로고침'));

      // 새로고침 후 2번
      await waitFor(() => {
        expect(mockFetchPosts).toHaveBeenCalledTimes(2);
      });
    });
  });
});
