
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bot, Send, Loader2, AlertTriangle } from 'lucide-react';
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { suggestReorderQuantities, SuggestReorderQuantitiesInput, SuggestReorderQuantitiesOutput } from '@/ai/flows/smart-reordering'; // Ensure this path is correct

const exampleSalesData = JSON.stringify([
  { "productId": "P001", "quantitySoldLast30Days": 25, "currentStock": 150, "leadTimeDays": 7, "targetStockDays": 30 },
  { "productId": "P002", "quantitySoldLast30Days": 10, "currentStock": 80, "leadTimeDays": 10, "targetStockDays": 45 },
  { "productId": "P004", "quantitySoldLast30Days": 5, "currentStock": 50, "leadTimeDays": 14, "targetStockDays": 60 }
], null, 2);


export default function ReorderingPage() {
  const [salesDataInput, setSalesDataInput] = useState(exampleSalesData);
  const [suggestions, setSuggestions] = useState<SuggestReorderQuantitiesOutput['reorderSuggestions'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    setSuggestions(null);

    if (!salesDataInput.trim()) {
      setError("Sales data input cannot be empty.");
      setIsLoading(false);
      toast({ variant: "destructive", title: "Input Error", description: "Sales data input cannot be empty." });
      return;
    }
    
    let parsedSalesData;
    try {
      // The AI prompt expects a string, but it's good practice to ensure it's valid JSON if that's the intended format for the user.
      // For this example, we'll pass the string directly as the AI function expects.
      // If it needed to be structured JSON: parsedSalesData = JSON.parse(salesDataInput);
      // And then ensure `SuggestReorderQuantitiesInput` matched that structure.
      // Since the AI flow expects `salesData: z.string()`, we pass it as a string.
    } catch (e) {
      setError("Invalid JSON format for sales data.");
      setIsLoading(false);
      toast({ variant: "destructive", title: "Input Error", description: "Sales data is not valid JSON." });
      return;
    }

    try {
      const input: SuggestReorderQuantitiesInput = { salesData: salesDataInput };
      const result = await suggestReorderQuantities(input);
      if (result && result.reorderSuggestions) {
        setSuggestions(result.reorderSuggestions);
        toast({ title: "Suggestions Generated", description: "Reorder suggestions have been successfully generated." });
      } else {
        setError("Received an empty or invalid response from the AI service.");
        toast({ variant: "destructive", title: "AI Error", description: "No suggestions returned." });
      }
    } catch (err) {
      console.error("Error fetching reorder suggestions:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to generate suggestions: ${errorMessage}`);
      toast({ variant: "destructive", title: "Error", description: `Failed to generate suggestions. ${errorMessage}` });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Smart Reordering Tool" description="Get AI-powered suggestions for reordering motorcycle parts based on sales data." />

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><Bot className="mr-2 h-6 w-6 text-primary" />Input Sales Data</CardTitle>
            <CardDescription>
              Provide past sales data. The AI will analyze this to suggest optimal reorder quantities.
              Enter data as a JSON string representing an array of sales records. Example:
              <pre className="mt-2 p-2 bg-muted text-xs rounded-md overflow-x-auto">
                {`[{"productId": "ID", "quantitySold": X}, ... ]`}
              </pre>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Enter sales data as a JSON string..."
              value={salesDataInput}
              onChange={(e) => setSalesDataInput(e.target.value)}
              rows={15}
              className="text-sm font-mono"
            />
          </CardContent>
          <CardFooter>
            <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Generate Suggestions
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Reorder Suggestions</CardTitle>
            <CardDescription>AI-generated suggestions will appear here.</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[300px]">
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Generating suggestions, please wait...</p>
              </div>
            )}
            {error && (
              <div className="flex flex-col items-center justify-center h-full text-destructive">
                <AlertTriangle className="h-12 w-12 mb-4" />
                <p className="font-semibold">Error Generating Suggestions</p>
                <p className="text-sm text-center">{error}</p>
              </div>
            )}
            {!isLoading && !error && suggestions && suggestions.length > 0 && (
              <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product ID</TableHead>
                    <TableHead className="text-right">Suggested Quantity</TableHead>
                    <TableHead>Reasoning</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suggestions.map((item, index) => (
                    <TableRow key={item.productId + index}>
                      <TableCell className="font-medium">{item.productId}</TableCell>
                      <TableCell className="text-right font-bold">{item.suggestedQuantity}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.reasoning}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
            {!isLoading && !error && suggestions && suggestions.length === 0 && (
              <p className="text-center text-muted-foreground py-10">No suggestions generated or data not applicable.</p>
            )}
             {!isLoading && !error && !suggestions && (
              <p className="text-center text-muted-foreground py-10">Enter sales data and click "Generate Suggestions" to see results.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

