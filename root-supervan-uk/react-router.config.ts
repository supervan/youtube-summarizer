import type { Config } from "@react-router/dev/config";
import { posts } from "./app/data/posts";

export default {
  // Config options...
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
  async prerender() {
    return [
      "/",
      "/about",
      "/contact",
      "/privacy",
      "/terms",
      "/speed",
      ...posts.map((post) => `/post/${post.slug}`),
    ];
  },
} satisfies Config;
