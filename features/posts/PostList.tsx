"use client";

import { useT } from "@/lib/i18n/client";
import PostCard from "./PostCard";
import type { Post } from "./post";

/* Posts under a small heading; nothing at all when there are none, so an
   empty crew does not see an empty box. */
export default function PostList({ posts, title }: { posts: Post[] | null; title: string }) {
  const t = useT();
  if (posts === null) {
    return <p role="status" className="mx-4 mt-4 text-sm" style={{ color: "var(--crimson)" }}>{t("posts.unavailable")}</p>;
  }
  if (posts.length === 0) return null;
  return (
    <section className="px-4 pt-5" aria-label={title}>
      <h2 className="text-mono-label mb-2" style={{ color: "var(--ink-2)" }}>{title}</h2>
      <div className="space-y-3">
        {posts.map((post) => <PostCard key={post.id} post={post} />)}
      </div>
    </section>
  );
}
