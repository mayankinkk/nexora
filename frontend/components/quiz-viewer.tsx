'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle } from 'lucide-react';
import { QuizQuestion } from '@/types/graphTypes';

interface QuizViewerProps {
  questions: QuizQuestion[];
}

export function QuizViewer({ questions }: QuizViewerProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleAnswer = (questionIndex: number, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionIndex]: answer }));
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
  };

  if (questions.length === 0) return null;

  const score = submitted
    ? questions.filter((q, i) => {
        const answer = answers[i];
        if (q.type === 'mcq') return answer === q.correctAnswer;
        if (q.type === 'true_false')
          return answer.toLowerCase() === q.correctAnswer.toLowerCase();
        return (
          answer.toLowerCase().trim() ===
          q.correctAnswer.toLowerCase().trim()
        );
      }).length
    : 0;

  const typeLabels: Record<string, string> = {
    mcq: 'Multiple Choice',
    true_false: 'True / False',
    short_answer: 'Short Answer',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Quiz ({questions.length} questions)
        </h3>
        {submitted && (
          <Badge variant={score >= questions.length * 0.7 ? 'default' : 'destructive'}>
            Score: {score}/{questions.length}
          </Badge>
        )}
      </div>

      {questions.map((q, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start gap-2 mb-3">
              <Badge variant="outline" className="flex-shrink-0">
                {typeLabels[q.type] || q.type}
              </Badge>
              <p className="text-sm font-medium">{q.question}</p>
            </div>

            {q.type === 'mcq' && q.options && (
              <RadioGroup
                value={answers[i] || ''}
                onValueChange={(v) => handleAnswer(i, v)}
                disabled={submitted}
                className="space-y-2"
              >
                {q.options.map((opt, j) => {
                  const isCorrect = submitted && opt === q.correctAnswer;
                  const isWrong = submitted && answers[i] === opt && opt !== q.correctAnswer;
                  return (
                    <div key={j} className="flex items-center gap-2">
                      <RadioGroupItem value={opt} id={`q${i}-opt${j}`} />
                      <Label
                        htmlFor={`q${i}-opt${j}`}
                        className={`text-sm ${
                          isCorrect
                            ? 'text-green-600 font-medium'
                            : isWrong
                              ? 'text-red-600'
                              : ''
                        }`}
                      >
                        {opt}
                        {isCorrect && (
                          <CheckCircle className="inline h-4 w-4 ml-1 text-green-600" />
                        )}
                        {isWrong && (
                          <XCircle className="inline h-4 w-4 ml-1 text-red-600" />
                        )}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            )}

            {q.type === 'true_false' && (
              <RadioGroup
                value={answers[i] || ''}
                onValueChange={(v) => handleAnswer(i, v)}
                disabled={submitted}
                className="flex gap-4"
              >
                {['True', 'False'].map((opt) => (
                  <div key={opt} className="flex items-center gap-2">
                    <RadioGroupItem value={opt} id={`q${i}-${opt}`} />
                    <Label htmlFor={`q${i}-${opt}`}>{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {q.type === 'short_answer' && (
              <input
                type="text"
                value={answers[i] || ''}
                onChange={(e) => handleAnswer(i, e.target.value)}
                disabled={submitted}
                placeholder="Type your answer..."
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            )}

            {submitted && (
              <div className="mt-3 p-3 bg-muted rounded-md">
                <p className="text-xs font-medium text-muted-foreground">
                  Correct Answer: <span className="text-foreground">{q.correctAnswer}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">{q.explanation}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Source: Page {q.sourcePage}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <div className="flex gap-2">
        {!submitted ? (
          <Button onClick={handleSubmit} disabled={Object.keys(answers).length < questions.length}>
            Submit Answers
          </Button>
        ) : (
          <Button onClick={handleRetry} variant="outline">
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
}
