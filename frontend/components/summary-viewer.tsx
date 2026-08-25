'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface SummaryViewerProps {
  content: string;
}

export function SummaryViewer({ content }: SummaryViewerProps) {
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

  // Parse markdown-like content into sections
  const lines = content.split('\n');
  const sections: Array<{ title: string; content: string }> = [];
  let currentSection = { title: 'Summary', content: '' };

  for (const line of lines) {
    if (line.startsWith('##') || line.startsWith('**') || line.startsWith('#')) {
      if (currentSection.content.trim()) {
        sections.push(currentSection);
      }
      currentSection = {
        title: line.replace(/^#+\s*/, '').replace(/\*\*/g, ''),
        content: '',
      };
    } else {
      currentSection.content += line + '\n';
    }
  }
  if (currentSection.content.trim()) {
    sections.push(currentSection);
  }

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Document Summary</h3>
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            <Copy className={`h-4 w-4 ${copied ? 'text-green-500' : ''}`} />
          </Button>
        </div>
        {sections.length > 0 ? (
          <div className="space-y-3">
            {sections.map((section, i) => (
              <div key={i}>
                <h4 className="text-sm font-semibold mb-1">{section.title}</h4>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {section.content.trim()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
            {content}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
