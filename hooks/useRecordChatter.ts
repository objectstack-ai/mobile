import { useCallback, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface ChatterComment {
  id: string;
  postId: string;
  userId: string;
  body: string;
  timestamp: string;
}

export interface ChatterPost {
  id: string;
  userId: string;
  body: string;
  timestamp: string;
  comments: ChatterComment[];
}

export interface MentionUser {
  id: string;
  name: string;
  avatar?: string;
}

export interface RecordChatterProps {
  posts?: ChatterPost[];
  mentionUsers?: MentionUser[];
}

export interface UseRecordChatterResult {
  /** All discussion posts */
  posts: ChatterPost[];
  /** Available mention users */
  mentionUsers: MentionUser[];
  /** Set all posts */
  setPosts: (posts: ChatterPost[]) => void;
  /** Add a new post */
  addPost: (post: ChatterPost) => void;
  /** Delete a post by id */
  deletePost: (postId: string) => void;
  /** Add a nested comment to a post */
  addComment: (postId: string, comment: ChatterComment) => void;
  /** Set available mention users */
  setMentionUsers: (users: MentionUser[]) => void;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

/**
 * Hook for managing in-context discussion (chatter) on SDUI record
 * pages — posts, nested comments, and mention users.
 *
 * Implements Phase 23 SDUI Record Page Protocol.
 *
 * ```ts
 * const { posts, addPost, addComment, setMentionUsers } = useRecordChatter();
 * addPost({ id: "p1", userId: "u1", body: "Hello!", timestamp: "2025-01-01", comments: [] });
 * addComment("p1", { id: "c1", postId: "p1", userId: "u2", body: "Reply", timestamp: "2025-01-02" });
 * ```
 */
export function useRecordChatter(
  _props?: RecordChatterProps,
): UseRecordChatterResult {
  const [posts, setPostsState] = useState<ChatterPost[]>([]);
  const [mentionUsers, setMentionUsersState] = useState<MentionUser[]>([]);

  const setPosts = useCallback((items: ChatterPost[]) => {
    setPostsState(items);
  }, []);

  const addPost = useCallback((post: ChatterPost) => {
    setPostsState((prev) => [...prev, post]);
  }, []);

  const deletePost = useCallback((postId: string) => {
    setPostsState((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  const addComment = useCallback((postId: string, comment: ChatterComment) => {
    setPostsState((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        return { ...p, comments: [...p.comments, comment] };
      }),
    );
  }, []);

  const setMentionUsers = useCallback((users: MentionUser[]) => {
    setMentionUsersState(users);
  }, []);

  return {
    posts,
    mentionUsers,
    setPosts,
    addPost,
    deletePost,
    addComment,
    setMentionUsers,
  };
}
