'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface SearchResultsProps {
  content: string;
}

export function SearchResults({ content }: SearchResultsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!content) return null;

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Search Results</h3>
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            <Copy className={`h-4 w-4 ${copied ? 'text-green-500' : ''}`} />
          </Button>
        </div>
        <div className="text-sm text-muted-foreground whitespace-pre-wrap">
          {content}
        </div>
      </CardContent>
    </Card>
  );
}
