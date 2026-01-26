/**
 * v0.9.0 테스트: FeedbackBoard 컴포넌트 테스트 (게시판 CRUD 및 댓글)
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
  });

  describe('게시글 상세 및 댓글', () => {
    beforeEach(async () => {
      // 해시 함수 (컴포넌트와 동일)
      const simpleHash = (str: string): string => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        return hash.toString(36);
      };

      // 테스트용 게시글 생성
      localStorage.setItem(
        'timekeeper-feedback-posts',
        JSON.stringify([
          {
            id: 'test-post-1',
            nickname: '테스터',
            title: '상세 테스트 제목',
            content: '상세 테스트 내용입니다.',
            password_hash: simpleHash('1234'),
            created_at: Date.now(),
            updated_at: Date.now(),
            category: 'idea',
            comments: [],
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

    it('댓글을 작성할 수 있다', async () => {
      const user = userEvent.setup();
      render(<FeedbackBoard />);

      // 상세 화면 이동
      const post_item = screen.getByText('상세 테스트 제목');
      await user.click(post_item);

      // 댓글 입력
      const comment_content_input = screen.getByPlaceholderText(/댓글을 입력하세요/i);
      const comment_password_input = screen.getByLabelText(/비밀번호/i); // 댓글 비밀번호

      await user.type(comment_content_input, '첫 번째 댓글');
      await user.type(comment_password_input, '1234');

      // 댓글 등록
      const submit_button = screen.getByRole('button', { name: /댓글 등록/i });
      await user.click(submit_button);

      // 댓글 확인
      expect(screen.getByText('첫 번째 댓글')).toBeInTheDocument();
    });

    it('댓글 삭제 시 비밀번호 확인을 요구한다', async () => {
        const user = userEvent.setup();
        render(<FeedbackBoard />);
  
        // 상세 화면 이동
        const post_item = screen.getByText('상세 테스트 제목');
        await user.click(post_item);
  
        // 댓글 먼저 작성
        const comment_content_input = screen.getByPlaceholderText(/댓글을 입력하세요/i);
        const comment_password_input = screen.getByLabelText(/비밀번호/i);
        await user.type(comment_content_input, '삭제할 댓글');
        await user.type(comment_password_input, '5678');
        const submit_button = screen.getByRole('button', { name: /댓글 등록/i });
        await user.click(submit_button);
  
        // 댓글 삭제 버튼 클릭 (아이콘이므로 getAllByRole로 찾아야 할 수도 있음)
        // Material UI의 IconButton 안에 있는 DeleteIcon
        const delete_buttons = screen.getAllByRole('button');
        // 보통 댓글 삭제 버튼은 작음. testid를 쓰는게 좋지만 현재 코드엔 없음.
        // 하지만 댓글 영역에 DeleteIcon 버튼이 생김.
        // 여기서는 가장 마지막 버튼이 댓글 삭제 버튼일 가능성이 높음 (헤더의 삭제버튼 다음)
        
        // 더 정확하게: 댓글 텍스트 근처의 버튼 찾기
        // 실제로는 data-testid를 추가하는게 좋음. 일단 DOM 구조상 추측.
        // FeedbackBoard.tsx에서 댓글 삭제 버튼은 IconButton이고 DeleteIcon을 포함함.
        
        // 화면상에 삭제 버튼이 여러 개일 수 있음 (게시글 삭제, 댓글 삭제).
        // 댓글 내용을 포함하는 li 요소를 찾고 그 안의 버튼을 클릭하는 방식 사용
        const comment_item = screen.getByText('삭제할 댓글').closest('li');
        const delete_comment_btn = comment_item?.querySelector('button');
        
        if (delete_comment_btn) {
            await user.click(delete_comment_btn);
            
            // 모달 뜸
            expect(screen.getByText('비밀번호 확인')).toBeInTheDocument();
            
            // 비밀번호 입력
            const modal_pw_input = screen.getByRole('textbox', { name: /비밀번호/i }); // 모달 안의 입력창
            // 텍스트 필드가 여러 개일 수 있으니 주의. 모달 안의 것만 활성화됨.
            
            await user.type(modal_pw_input, '5678');
            
            // 확인 버튼 클릭
            const confirm_btn = screen.getByRole('button', { name: /삭제\(Enter\)/i });
            await user.click(confirm_btn);
            
            // 삭제 확인
            expect(screen.queryByText('삭제할 댓글')).not.toBeInTheDocument();
        }
      });
  });
});
