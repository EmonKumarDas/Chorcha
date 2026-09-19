'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

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

const MathRenderer: React.FC<MathRendererProps> = ({ content, inline = false }) => {
  const normalized = normalizeLatex(content);

  if (inline) {
    return (
      <ReactMarkdown
        components={{ 
          p: React.Fragment,
          img: ({ src, alt }) => (
            <img 
              src={src} 
              alt={alt || 'ছবি'} 
              className="inline-block max-w-full rounded-lg my-2"
              style={{ maxHeight: '400px' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ),
        }}
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {normalized}
      </ReactMarkdown>
    );
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      className="prose prose-sm dark:prose-invert max-w-none text-foreground/90"
      components={{
        img: ({ src, alt }) => (
          <img 
            src={src} 
            alt={alt || 'ছবি'} 
            className="max-w-full rounded-xl my-3 mx-auto shadow-lg border border-white/10"
            style={{ maxHeight: '500px', display: 'block' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ),
      }}
    >
      {normalized}
    </ReactMarkdown>
  );
};
export default React.memo(MathRenderer);
