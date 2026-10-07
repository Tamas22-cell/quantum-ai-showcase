import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Quantum AI Lab" },
      { name: "description", content: "Independent AI & Quantum Computing research portfolio by Tamás Németh, featuring live multi-agent finance and quantum optimization projects." },
      { name: "author", content: "Tamás Németh" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Quantum AI Lab — Tamás Németh" },
      { property: "og:description", content: "AI agents, quantitative finance, quantum computing, QAOA, QUBO, Qiskit and live research projects." },
      { property: "og:url", content: "https://quantum-ai-showcase.vercel.app/" },
      { property: "og:image", content: "https://quantum-ai-showcase.vercel.app/quantum-ai-lab-social.jpg" },
      { property: "og:image:secure_url", content: "https://quantum-ai-showcase.vercel.app/quantum-ai-lab-social.jpg" },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "600" },
      { property: "og:image:height", content: "314" },
      { property: "og:image:alt", content: "Quantum AI Lab research portfolio with three live AI and quantum projects" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Quantum AI Lab — Tamás Németh" },
      { name: "twitter:description", content: "Independent AI & Quantum Computing research portfolio with live deployed projects." },
      { name: "twitter:image", content: "https://quantum-ai-showcase.vercel.app/quantum-ai-lab-social.jpg" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Manrope:wght@400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/quantum-ai-lab.svg", type: "image/svg+xml" },
      { rel: "canonical", href: "https://quantum-ai-showcase.vercel.app/" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
