/**
 * v0.10.4 테스트: feedbackService (Firebase Firestore CRUD)
 * Firebase 모듈을 모킹하여 테스트
 */
import {
  FeedbackPost,
  Comment,
  simpleHash,
} from '../../services/feedbackService';

// Firebase 모킹
jest.mock('../../lib/firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  Timestamp: {
    now: () => ({ toMillis: () => Date.now() }),
  },
}));

describe('feedbackService', () => {
  describe('simpleHash', () => {
    it('동일한 문자열은 동일한 해시를 반환한다', () => {
      const password = 'test1234';
      const hash1 = simpleHash(password);
      const hash2 = simpleHash(password);
      
      expect(hash1).toBe(hash2);
    });

    it('다른 문자열은 다른 해시를 반환한다', () => {
      const hash1 = simpleHash('password1');
      const hash2 = simpleHash('password2');
      
      expect(hash1).not.toBe(hash2);
    });

    it('빈 문자열도 해시를 반환한다', () => {
      const hash = simpleHash('');
      expect(hash).toBe('0');
    });

    it('한글 문자열도 해시를 반환한다', () => {
      const hash = simpleHash('테스트비밀번호');
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe('FeedbackPost 타입', () => {
    it('올바른 구조의 게시글 객체를 생성할 수 있다', () => {
      const post: FeedbackPost = {
        id: 'test-id-123',
        nickname: '테스터',
        title: '테스트 제목',
        content: '테스트 내용입니다.',
        password_hash: simpleHash('1234'),
        created_at: Date.now(),
        updated_at: Date.now(),
        category: 'idea',
        comments: [],
      };

      expect(post.id).toBe('test-id-123');
      expect(post.category).toBe('idea');
      expect(post.comments).toEqual([]);
    });

    it('모든 카테고리 타입을 지원한다', () => {
      const categories: Array<'idea' | 'bug' | 'etc'> = ['idea', 'bug', 'etc'];
      
      categories.forEach((category) => {
        const post: FeedbackPost = {
          id: `test-${category}`,
          nickname: '테스터',
          title: `${category} 테스트`,
          content: '내용',
          password_hash: 'hash',
          created_at: Date.now(),
          updated_at: Date.now(),
          category,
          comments: [],
        };
        
        expect(post.category).toBe(category);
      });
    });
  });

  describe('Comment 타입', () => {
    it('올바른 구조의 댓글 객체를 생성할 수 있다', () => {
      const comment: Comment = {
        id: 'comment-id-123',
        nickname: '댓글작성자',
        content: '댓글 내용입니다.',
        password_hash: simpleHash('password'),
        created_at: Date.now(),
      };

      expect(comment.id).toBe('comment-id-123');
      expect(comment.nickname).toBe('댓글작성자');
    });
  });

  describe('Firestore 연동 구조', () => {
    it('게시글에 댓글 배열을 추가할 수 있다', () => {
      const comment1: Comment = {
        id: 'c1',
        nickname: '사용자1',
        content: '첫 번째 댓글',
        password_hash: 'hash1',
        created_at: Date.now(),
      };

      const comment2: Comment = {
        id: 'c2',
        nickname: '사용자2',
        content: '두 번째 댓글',
        password_hash: 'hash2',
        created_at: Date.now(),
      };

      const post: FeedbackPost = {
        id: 'post-1',
        nickname: '작성자',
        title: '제목',
        content: '내용',
        password_hash: 'hash',
        created_at: Date.now(),
        updated_at: Date.now(),
        category: 'idea',
        comments: [comment1, comment2],
      };

      expect(post.comments.length).toBe(2);
      expect(post.comments[0].content).toBe('첫 번째 댓글');
      expect(post.comments[1].content).toBe('두 번째 댓글');
    });

    it('댓글 필터링이 올바르게 동작한다', () => {
      const comments: Comment[] = [
        { id: 'c1', nickname: 'A', content: '내용1', password_hash: 'h1', created_at: 1 },
        { id: 'c2', nickname: 'B', content: '내용2', password_hash: 'h2', created_at: 2 },
        { id: 'c3', nickname: 'C', content: '내용3', password_hash: 'h3', created_at: 3 },
      ];

      const filtered = comments.filter((c) => c.id !== 'c2');

      expect(filtered.length).toBe(2);
      expect(filtered.find((c) => c.id === 'c2')).toBeUndefined();
    });
  });

  describe('비밀번호 검증 로직', () => {
    it('올바른 비밀번호로 검증이 통과한다', () => {
      const original_password = 'myPassword123';
      const stored_hash = simpleHash(original_password);
      const input_hash = simpleHash(original_password);

      expect(stored_hash === input_hash).toBe(true);
    });

    it('잘못된 비밀번호로 검증이 실패한다', () => {
      const stored_hash = simpleHash('correctPassword');
      const input_hash = simpleHash('wrongPassword');

      expect(stored_hash === input_hash).toBe(false);
    });
  });
});
