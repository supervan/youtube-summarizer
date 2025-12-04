import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
    layout("components/Layout.tsx", [
        index("routes/home.tsx"),
        route("about", "routes/about.tsx"),
        route("contact", "routes/contact.tsx"),
        route("privacy", "routes/privacy.tsx"),
        route("terms", "routes/terms.tsx"),
        route("post/:slug", "routes/post.tsx"),
    ]),
] satisfies RouteConfig;
