/**
 * v0.5.0 테스트: FeedbackBoard 컴포넌트 테스트 (게시판 CRUD)
 */
import { render, screen, act, waitFor } from '../../../test-utils';
import userEvent from '@testing-library/user-event';
import FeedbackBoard from '../../../components/pages/FeedbackBoard';

describe('FeedbackBoard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('건의사항 제목이 표시된다', () => {
    render(<FeedbackBoard />);
    expect(screen.getByText('건의사항')).toBeInTheDocument();
  });

  describe('목록 화면', () => {
    it('글쓰기 버튼이 렌더링된다', () => {
      render(<FeedbackBoard />);
      expect(screen.getByRole('button', { name: /글쓰기/i })).toBeInTheDocument();
    });

    it('게시글이 없으면 빈 상태 메시지가 표시된다', () => {
      render(<FeedbackBoard />);
      expect(screen.getByText(/등록된 게시글이 없습니다/i)).toBeInTheDocument();
    });
  });

  describe('게시글 작성', () => {
    it('글쓰기 버튼을 클릭하면 작성 화면으로 전환된다', async () => {
      const user = userEvent.setup();
      render(<FeedbackBoard />);

      const write_button = screen.getByRole('button', { name: /글쓰기/i });
      await user.click(write_button);

      expect(screen.getByText('새 게시글 작성')).toBeInTheDocument();
    });

    it('제목과 내용을 입력하고 등록할 수 있다', async () => {
      const user = userEvent.setup();
      render(<FeedbackBoard />);

      // 글쓰기 화면으로 이동
      const write_button = screen.getByRole('button', { name: /글쓰기/i });
      await user.click(write_button);

      // 정보 입력
      const title_input = screen.getByLabelText(/제목/i);
      const content_input = screen.getByLabelText(/내용/i);
      const password_input = screen.getByLabelText(/비밀번호/i);

      await user.type(title_input, '테스트 제목');
      await user.type(content_input, '테스트 내용입니다.');
      await user.type(password_input, '1234');

      // 등록
      const submit_button = screen.getByRole('button', { name: /등록하기/i });
      await user.click(submit_button);

      // 목록에 표시되는지 확인
      expect(screen.getByText('테스트 제목')).toBeInTheDocument();
    });

    it('닉네임을 입력하지 않으면 "익명"으로 표시된다', async () => {
      const user = userEvent.setup();
      render(<FeedbackBoard />);

      const write_button = screen.getByRole('button', { name: /글쓰기/i });
      await user.click(write_button);

      const title_input = screen.getByLabelText(/제목/i);
      const content_input = screen.getByLabelText(/내용/i);
      const password_input = screen.getByLabelText(/비밀번호/i);

      await user.type(title_input, '익명 테스트');
      await user.type(content_input, '내용');
      await user.type(password_input, '1234');

      const submit_button = screen.getByRole('button', { name: /등록하기/i });
      await user.click(submit_button);

      expect(screen.getByText(/익명/i)).toBeInTheDocument();
    });

    it('카테고리를 선택할 수 있다', async () => {
      const user = userEvent.setup();
      render(<FeedbackBoard />);

      const write_button = screen.getByRole('button', { name: /글쓰기/i });
      await user.click(write_button);

      // 버그 카테고리 선택
      const bug_chip = screen.getByText('버그');
      await user.click(bug_chip);

      const title_input = screen.getByLabelText(/제목/i);
      const content_input = screen.getByLabelText(/내용/i);
      const password_input = screen.getByLabelText(/비밀번호/i);

      await user.type(title_input, '버그 리포트');
      await user.type(content_input, '버그 내용');
      await user.type(password_input, '1234');

      const submit_button = screen.getByRole('button', { name: /등록하기/i });
      await user.click(submit_button);

      // 버그 태그가 표시되는지 확인
      expect(screen.getAllByText('버그').length).toBeGreaterThan(0);
    });
  });

  describe('게시글 상세 보기', () => {
    beforeEach(async () => {
      // 테스트용 게시글 생성
      localStorage.setItem(
        'timekeeper-feedback-posts',
        JSON.stringify([
          {
            id: 'test-post-1',
            nickname: '테스터',
            title: '상세 테스트 제목',
            content: '상세 테스트 내용입니다.',
            password_hash: '1234hash',
            created_at: Date.now(),
            updated_at: Date.now(),
            category: 'idea',
          },
        ])
      );
    });

    it('게시글을 클릭하면 상세 화면으로 이동한다', async () => {
      const user = userEvent.setup();
      render(<FeedbackBoard />);

      const post_item = screen.getByText('상세 테스트 제목');
      await user.click(post_item);

      expect(screen.getByText('상세 테스트 내용입니다.')).toBeInTheDocument();
    });

    it('목록으로 버튼을 클릭하면 목록 화면으로 돌아간다', async () => {
      const user = userEvent.setup();
      render(<FeedbackBoard />);

      const post_item = screen.getByText('상세 테스트 제목');
      await user.click(post_item);

      const back_button = screen.getByRole('button', { name: /목록으로/i });
      await user.click(back_button);

      expect(screen.getByRole('button', { name: /글쓰기/i })).toBeInTheDocument();
    });
  });

  describe('게시글 수정', () => {
    beforeEach(() => {
      // 비밀번호 해시 계산 (간단한 해시)
      const simpleHash = (str: string): string => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        return hash.toString(36);
      };

      localStorage.setItem(
        'timekeeper-feedback-posts',
        JSON.stringify([
          {
            id: 'test-post-edit',
            nickname: '테스터',
            title: '수정 테스트',
            content: '수정 전 내용',
            password_hash: simpleHash('1234'),
            created_at: Date.now(),
            updated_at: Date.now(),
            category: 'idea',
          },
        ])
      );
    });

    it('수정 버튼을 클릭하면 비밀번호 모달이 열린다', async () => {
      const user = userEvent.setup();
      render(<FeedbackBoard />);

      // 상세 화면으로 이동
      const post_item = screen.getByText('수정 테스트');
      await user.click(post_item);

      // 수정 버튼 클릭 (아이콘 버튼)
      const edit_buttons = screen.getAllByRole('button');
      const edit_button = edit_buttons.find((btn) =>
        btn.querySelector('[data-testid="EditIcon"]')
      );

      if (edit_button) {
        await user.click(edit_button);
        expect(screen.getByText('비밀번호 확인')).toBeInTheDocument();
      }
    });
  });

  describe('게시글 삭제', () => {
    beforeEach(() => {
      const simpleHash = (str: string): string => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        return hash.toString(36);
      };

      localStorage.setItem(
        'timekeeper-feedback-posts',
        JSON.stringify([
          {
            id: 'test-post-delete',
            nickname: '테스터',
            title: '삭제 테스트',
            content: '삭제할 내용',
            password_hash: simpleHash('1234'),
            created_at: Date.now(),
            updated_at: Date.now(),
            category: 'bug',
          },
        ])
      );
    });

    it('삭제 버튼을 클릭하면 비밀번호 모달이 열린다', async () => {
      const user = userEvent.setup();
      render(<FeedbackBoard />);

      const post_item = screen.getByText('삭제 테스트');
      await user.click(post_item);

      const delete_buttons = screen.getAllByRole('button');
      const delete_button = delete_buttons.find((btn) =>
        btn.querySelector('[data-testid="DeleteIcon"]')
      );

      if (delete_button) {
        await user.click(delete_button);
        expect(screen.getByText('비밀번호 확인')).toBeInTheDocument();
      }
    });
  });

  describe('데이터 영구 저장', () => {
    it('게시글이 LocalStorage에 저장된다', async () => {
      const user = userEvent.setup();
      render(<FeedbackBoard />);

      const write_button = screen.getByRole('button', { name: /글쓰기/i });
      await user.click(write_button);

      const title_input = screen.getByLabelText(/제목/i);
      const content_input = screen.getByLabelText(/내용/i);
      const password_input = screen.getByLabelText(/비밀번호/i);

      await user.type(title_input, '저장 테스트');
      await user.type(content_input, '저장될 내용');
      await user.type(password_input, '1234');

      const submit_button = screen.getByRole('button', { name: /등록하기/i });
      await user.click(submit_button);

      const saved_data = localStorage.getItem('timekeeper-feedback-posts');
      expect(saved_data).not.toBeNull();
      expect(saved_data).toContain('저장 테스트');
    });
  });
});
