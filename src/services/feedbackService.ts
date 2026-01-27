import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// 타입 정의
export interface Comment {
  id: string;
  nickname: string;
  content: string;
  password_hash: string;
  created_at: number;
}

export interface FeedbackPost {
  id: string;
  nickname: string;
  title: string;
  content: string;
  password_hash: string;
  created_at: number;
  updated_at: number;
  category: 'idea' | 'bug' | 'etc';
  comments: Comment[];
}

// Firestore 컬렉션 참조
const COLLECTION_NAME = 'feedback_posts';
const postsRef = collection(db, COLLECTION_NAME);

// 간단한 해시 함수
export const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
};

// 모든 게시글 조회 (최신순)
export const fetchPosts = async (): Promise<FeedbackPost[]> => {
  try {
    const q = query(postsRef, orderBy('created_at', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as FeedbackPost[];
  } catch (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
};

// 게시글 생성
export const createPost = async (
  post: Omit<FeedbackPost, 'id'>
): Promise<string | null> => {
  try {
    const docRef = await addDoc(postsRef, {
      ...post,
      created_at: Timestamp.now().toMillis(),
      updated_at: Timestamp.now().toMillis(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating post:', error);
    return null;
  }
};

// 게시글 수정
export const updatePost = async (
  postId: string,
  updates: Partial<Omit<FeedbackPost, 'id' | 'password_hash' | 'created_at'>>
): Promise<boolean> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, postId);
    await updateDoc(docRef, {
      ...updates,
      updated_at: Timestamp.now().toMillis(),
    });
    return true;
  } catch (error) {
    console.error('Error updating post:', error);
    return false;
  }
};

// 게시글 삭제
export const deletePost = async (postId: string): Promise<boolean> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, postId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Error deleting post:', error);
    return false;
  }
};

// 댓글 추가
export const addComment = async (
  postId: string,
  currentComments: Comment[],
  newComment: Comment
): Promise<boolean> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, postId);
    await updateDoc(docRef, {
      comments: [...currentComments, newComment],
      updated_at: Timestamp.now().toMillis(),
    });
    return true;
  } catch (error) {
    console.error('Error adding comment:', error);
    return false;
  }
};

// 댓글 삭제
export const deleteComment = async (
  postId: string,
  currentComments: Comment[],
  commentId: string
): Promise<boolean> => {
  try {
    const docRef = doc(db, COLLECTION_NAME, postId);
    const updatedComments = currentComments.filter((c) => c.id !== commentId);
    await updateDoc(docRef, {
      comments: updatedComments,
      updated_at: Timestamp.now().toMillis(),
    });
    return true;
  } catch (error) {
    console.error('Error deleting comment:', error);
    return false;
  }
};
