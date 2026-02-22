/**
 * Tests for useRecordChatter – validates chatter post management,
 * nested comments, mention users, and deletion.
 */
import { renderHook, act } from "@testing-library/react-native";
import { useRecordChatter, ChatterPost, ChatterComment } from "~/hooks/useRecordChatter";

const samplePosts: ChatterPost[] = [
  { id: "p1", userId: "u1", body: "Hello world", timestamp: "2025-01-01T10:00:00Z", comments: [] },
  { id: "p2", userId: "u2", body: "Welcome!", timestamp: "2025-01-02T10:00:00Z", comments: [] },
];

describe("useRecordChatter", () => {
  it("returns empty state initially", () => {
    const { result } = renderHook(() => useRecordChatter());

    expect(result.current.posts).toEqual([]);
    expect(result.current.mentionUsers).toEqual([]);
  });

  it("sets posts", () => {
    const { result } = renderHook(() => useRecordChatter());

    act(() => {
      result.current.setPosts(samplePosts);
    });

    expect(result.current.posts).toHaveLength(2);
    expect(result.current.posts[0].body).toBe("Hello world");
  });

  it("adds a post", () => {
    const { result } = renderHook(() => useRecordChatter());

    act(() => {
      result.current.addPost({ id: "p1", userId: "u1", body: "New post", timestamp: "2025-01-01T10:00:00Z", comments: [] });
    });

    expect(result.current.posts).toHaveLength(1);
    expect(result.current.posts[0].body).toBe("New post");
  });

  it("deletes a post by id", () => {
    const { result } = renderHook(() => useRecordChatter());

    act(() => {
      result.current.setPosts(samplePosts);
    });

    act(() => {
      result.current.deletePost("p1");
    });

    expect(result.current.posts).toHaveLength(1);
    expect(result.current.posts.find((p) => p.id === "p1")).toBeUndefined();
  });

  it("adds a nested comment to a post", () => {
    const { result } = renderHook(() => useRecordChatter());

    act(() => {
      result.current.setPosts(samplePosts);
    });

    const comment: ChatterComment = {
      id: "c1",
      postId: "p1",
      userId: "u2",
      body: "Nice post!",
      timestamp: "2025-01-01T11:00:00Z",
    };

    act(() => {
      result.current.addComment("p1", comment);
    });

    expect(result.current.posts[0].comments).toHaveLength(1);
    expect(result.current.posts[0].comments[0].body).toBe("Nice post!");
  });

  it("does not add comment to non-existent post", () => {
    const { result } = renderHook(() => useRecordChatter());

    act(() => {
      result.current.setPosts(samplePosts);
    });

    const comment: ChatterComment = {
      id: "c1",
      postId: "p99",
      userId: "u2",
      body: "Ghost comment",
      timestamp: "2025-01-01T11:00:00Z",
    };

    act(() => {
      result.current.addComment("p99", comment);
    });

    // Posts remain unchanged
    expect(result.current.posts[0].comments).toHaveLength(0);
    expect(result.current.posts[1].comments).toHaveLength(0);
  });

  it("sets mention users", () => {
    const { result } = renderHook(() => useRecordChatter());

    act(() => {
      result.current.setMentionUsers([
        { id: "u1", name: "Alice" },
        { id: "u2", name: "Bob", avatar: "https://example.com/bob.png" },
      ]);
    });

    expect(result.current.mentionUsers).toHaveLength(2);
    expect(result.current.mentionUsers[0].name).toBe("Alice");
  });
});
