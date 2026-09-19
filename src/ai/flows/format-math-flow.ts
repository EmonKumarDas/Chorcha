'use server';
/**
 * @fileOverview An AI flow to automatically format mathematical equations in text to LaTeX.
 *
 * - formatMath - A function that takes a string and returns a version with math formatted as LaTeX.
 * - FormatMathInput - The input type for the formatMath function.
 * - FormatMathOutput - The return type for the formatMath function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const FormatMathInputSchema = z.object({
  text: z.string().describe('The text containing math equations to be formatted.'),
});
export type FormatMathInput = z.infer<typeof FormatMathInputSchema>;

const FormatMathOutputSchema = z.object({
  formattedText: z.string().describe('The text with mathematical equations formatted as LaTeX.'),
});
export type FormatMathOutput = z.infer<typeof FormatMathOutputSchema>;

export async function formatMath(input: FormatMathInput): Promise<FormatMathOutput> {
  return formatMathFlow(input);
}

const prompt = ai.definePrompt({
  name: 'formatMathPrompt',
  input: { schema: FormatMathInputSchema },
  output: { schema: FormatMathOutputSchema },
  prompt: `You are an expert in cleaning up and formatting text containing mathematical equations. The user will provide text that may have been copied from a PDF or other source, resulting in duplicated equations and inconsistent formatting. Your task is to produce a clean, single, well-formatted version of the text using LaTeX for math and Markdown for structure.

**CRITICAL RULES:**
1.  **Deduplicate:** The most important task is to identify and remove duplicated content. If you see the same equation or expression written twice, often in slightly different formats (e.g., one with Unicode math symbols, one with plain text), you MUST output only a single, correct LaTeX version.
2.  **Clean Replacement:** Your output should be a complete and clean replacement of the original text. Do not add any content that wasn't there originally. Do not repeat parts of the original text.
3.  **Use LaTeX for Math ONLY:**
    *   For inline math, use single dollar signs: \`$\` ... \`$\`.
    *   For block-level math (equations on their own line), use double dollar signs: \`$$\` ... \`$$\`.
    *   Correctly convert expressions like \`x^2\`, \`sqrt(y)\`, \`f-1(x)\` into proper LaTeX: \`$x^2$\`, \`$\\sqrt{y}$\`, \`$f^{-1}(x)$\`.
4.  **Use Markdown for Structure:**
    *   Use Markdown for lists (e.g., \`1.\`, \`*\`), bold (\`**text**\`), etc.
    *   DO NOT use LaTeX commands for document structure or text formatting (like \`\\section\`, \`\\textbf\`, \`\\itemize\`).
5.  **Preserve Structure and Language:**
    *   Keep all non-mathematical text (like Bengali) exactly as it is.
    *   Preserve all original line breaks and paragraph spacing.
6.  **JSON Output:** The final output must be a single JSON object with one key, "formattedText", containing the cleaned and formatted text.

**Example of Deduplication:**
*   **BAD INPUT:** \`The area is A = pi * r^2 A = πr²\`
*   **GOOD OUTPUT:** \`The area is $A = \\pi r^2$\`

**Text to process:**
---
{{text}}
---
`,
});

const formatMathFlow = ai.defineFlow(
  {
    name: 'formatMathFlow',
    inputSchema: FormatMathInputSchema,
    outputSchema: FormatMathOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI failed to produce formatted output.');
    }
    return output;
  }
);
