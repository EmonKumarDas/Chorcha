'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';

interface MathRendererProps {
  content: string;
  inline?: boolean;
}

/**
 * Normalizes LaTeX delimiters so that KaTeX/remark-math can parse them.
 * Converts \( ... \) → $...$ and \[ ... \] → $$...$$
 * Also handles ( ... ) pattern when it contains LaTeX commands.
 */
function normalizeLatex(text: string): string {
  if (!text) return '';
  let result = text;
  // Convert \[ ... \] to $$ ... $$
  result = result.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => `$$${inner}$$`);
  // Convert \( ... \) to $ ... $
  result = result.replace(/\\\(([\s\S]*?)\\\)/g, (_, inner) => `$${inner}$`);
  return result;
}

const sharedComponents = {
  u: ({ children, ...props }: any) => (
    <span
      className="underline underline-offset-4 decoration-primary decoration-2 font-semibold text-foreground"
      {...props}
    >
      {children}
    </span>
  ),
  b: ({ children, ...props }: any) => (
    <strong className="font-bold text-foreground" {...props}>
      {children}
    </strong>
  ),
  strong: ({ children, ...props }: any) => (
    <strong className="font-bold text-foreground" {...props}>
      {children}
    </strong>
  ),
  i: ({ children, ...props }: any) => (
    <em className="italic" {...props}>
      {children}
    </em>
  ),
  em: ({ children, ...props }: any) => (
    <em className="italic" {...props}>
      {children}
    </em>
  ),
  mark: ({ children, ...props }: any) => (
    <mark className="bg-amber-300/30 text-amber-950 dark:text-amber-200 px-1 py-0.5 rounded font-medium" {...props}>
      {children}
    </mark>
  ),
  sub: ({ children, ...props }: any) => (
    <sub className="align-sub text-[0.75em]" {...props}>
      {children}
    </sub>
  ),
  sup: ({ children, ...props }: any) => (
    <sup className="align-super text-[0.75em]" {...props}>
      {children}
    </sup>
  ),
};

const MathRenderer: React.FC<MathRendererProps> = ({ content, inline = false }) => {
  const normalized = normalizeLatex(content);

  if (inline) {
    return (
      <ReactMarkdown
        components={{
          ...sharedComponents,
          p: ({ children }: any) => <>{children}</>,
          img: ({ src, alt }: any) => (
            <img
              src={src}
              alt={alt || 'ছবি'}
              className="inline-block max-w-full rounded-lg my-2"
              style={{ maxHeight: '400px' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ),
        }}
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
      >
        {normalized}
      </ReactMarkdown>
    );
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeRaw, rehypeKatex]}
      className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 leading-relaxed"
      components={{
        ...sharedComponents,
        img: ({ src, alt }: any) => (
          <img
            src={src}
            alt={alt || 'ছবি'}
            className="max-w-full rounded-xl my-3 mx-auto shadow-lg border border-white/10"
            style={{ maxHeight: '500px', display: 'block' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ),
      }}
    >
      {normalized}
    </ReactMarkdown>
  );
};

export default React.memo(MathRenderer);
