'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { Flashcard } from '@/types/graphTypes';

interface FlashcardViewerProps {
  cards: Flashcard[];
}

export function FlashcardViewer({ cards }: FlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const categoryColors: Record<string, string> = {
    concept: 'bg-blue-100 text-blue-800',
    definition: 'bg-green-100 text-green-800',
    formula: 'bg-purple-100 text-purple-800',
    fact: 'bg-orange-100 text-orange-800',
  };

  if (cards.length === 0) return null;

  const card = cards[currentIndex];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Flashcard {currentIndex + 1} of {cards.length}
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Flip
          </Button>
          <Button variant="outline" size="sm" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        className="cursor-pointer perspective-1000"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <Card className="min-h-[200px] transition-all duration-300 hover:shadow-lg">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <Badge
              className={`mb-4 ${categoryColors[card.category] || 'bg-gray-100'}`}
            >
              {card.category}
            </Badge>
            <p className="text-lg font-medium mb-2">
              {isFlipped ? card.back : card.front}
            </p>
            {isFlipped && (
              <p className="text-xs text-muted-foreground mt-4">
                Page {card.sourcePage}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center gap-2">
        {cards.map((_, i) => (
          <button
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === currentIndex ? 'bg-primary' : 'bg-muted'
            }`}
            onClick={() => {
              setIsFlipped(false);
              setCurrentIndex(i);
            }}
          />
        ))}
      </div>
    </div>
  );
}
