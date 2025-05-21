// src/ai/flows/smart-reordering.ts
'use server';
/**
 * @fileOverview AI tool that analyzes past sales data and suggests optimal reorder quantities for each motorcycle part.
 *
 * - suggestReorderQuantities - A function that handles the reorder quantity suggestion process.
 * - SuggestReorderQuantitiesInput - The input type for the suggestReorderQuantities function.
 * - SuggestReorderQuantitiesOutput - The return type for the suggestReorderQuantities function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestReorderQuantitiesInputSchema = z.object({
  salesData: z.string().describe('Past sales data for motorcycle parts, including product ID and quantity sold.'),
});
export type SuggestReorderQuantitiesInput = z.infer<typeof SuggestReorderQuantitiesInputSchema>;

const SuggestReorderQuantitiesOutputSchema = z.object({
  reorderSuggestions: z.array(
    z.object({
      productId: z.string().describe('The ID of the motorcycle part.'),
      suggestedQuantity: z.number().describe('The suggested reorder quantity for the part.'),
      reasoning: z.string().describe('Explanation of why the quantity is suggested.')
    })
  ).describe('An array of reorder suggestions for each motorcycle part.'),
});
export type SuggestReorderQuantitiesOutput = z.infer<typeof SuggestReorderQuantitiesOutputSchema>;

export async function suggestReorderQuantities(input: SuggestReorderQuantitiesInput): Promise<SuggestReorderQuantitiesOutput> {
  return suggestReorderQuantitiesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestReorderQuantitiesPrompt',
  input: {schema: SuggestReorderQuantitiesInputSchema},
  output: {schema: SuggestReorderQuantitiesOutputSchema},
  prompt: `You are an expert inventory manager specializing in optimizing stock levels for motorcycle parts.

You will analyze the past sales data to suggest reorder quantities for each part, minimizing stockouts and overstocking.

Sales Data: {{{salesData}}}

Based on this sales data, provide reorder suggestions for each motorcycle part, including the product ID, suggested quantity, and a brief explanation of your reasoning.

Ensure that the reorderSuggestions output array contains one object for each product in the salesData input.
`,
});

const suggestReorderQuantitiesFlow = ai.defineFlow(
  {
    name: 'suggestReorderQuantitiesFlow',
    inputSchema: SuggestReorderQuantitiesInputSchema,
    outputSchema: SuggestReorderQuantitiesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
