"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { cn } from "@/lib/utils";

const components: Partial<Components> = {
  p({ children }) {
    return <p className="my-1.5 last:mb-0 first:mt-0 leading-relaxed">{children}</p>;
  },
  a({ href, children }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 decoration-primary/30 hover:decoration-primary transition-colors"
      >
        {children}
      </a>
    );
  },
  ul({ className, children, ...props }) {
    return (
      <ul className={cn("my-1.5 list-disc pl-5 space-y-0.5", className)} {...props}>
        {children}
      </ul>
    );
  },
  ol({ className, children, ...props }) {
    return (
      <ol className={cn("my-1.5 list-decimal pl-5 space-y-0.5", className)} {...props}>
        {children}
      </ol>
    );
  },
  li({ children }) {
    return <li className="leading-relaxed">{children}</li>;
  },
  h1({ children }) {
    return <h1 className="my-3 text-lg font-semibold first:mt-0">{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="my-2.5 text-base font-semibold first:mt-0">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="my-2 text-sm font-semibold first:mt-0">{children}</h3>;
  },
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    if (!match) {
      return (
        <code
          className="rounded bg-muted-foreground/15 px-1 py-0.5 font-mono text-[0.875em]"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code className={cn("font-mono text-[0.875em]", className)} {...props}>
        {children}
      </code>
    );
  },
  pre({ children }) {
    return (
      <pre className="my-2 overflow-x-auto rounded-lg bg-muted-foreground/10 p-3 font-mono text-sm leading-relaxed [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-[0.9em]">
        {children}
      </pre>
    );
  },
  blockquote({ children }) {
    return (
      <blockquote className="my-1.5 border-l-2 border-muted-foreground/30 pl-3 italic text-muted-foreground">
        {children}
      </blockquote>
    );
  },
  hr() {
    return <hr className="my-3 border-muted-foreground/20" />;
  },
  table({ children }) {
    return (
      <div className="my-2 overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">{children}</table>
      </div>
    );
  },
  thead({ children }) {
    return <thead className="border-b border-muted-foreground/20">{children}</thead>;
  },
  th({ children }) {
    return <th className="px-3 py-1.5 text-left font-semibold">{children}</th>;
  },
  td({ children }) {
    return <td className="px-3 py-1.5">{children}</td>;
  },
  tr({ children }) {
    return <tr className="even:bg-muted-foreground/5">{children}</tr>;
  },
  img({ src, alt }) {
    return (
      <img
        src={src}
        alt={alt || ""}
        className="my-2 max-w-full rounded-lg"
        loading="lazy"
      />
    );
  },
  strong({ children }) {
    return <strong className="font-semibold">{children}</strong>;
  },
  em({ children }) {
    return <em className="italic">{children}</em>;
  },
};

export function Markdown({ children }: { children: string }) {
  if (!children) return null;
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
}
