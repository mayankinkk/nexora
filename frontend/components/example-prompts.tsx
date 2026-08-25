import { Card } from '@/components/ui/card';

interface ExamplePromptsProps {
  onPromptSelect: (prompt: string) => void;
}

const EXAMPLE_PROMPTS = [
  {
    title: 'Summarize the key concepts from my lecture notes',
  },
  {
    title: 'What are the main topics covered in this syllabus?',
  },
  {
    title: 'Explain the formula on page 5',
  },
  {
    title: 'What topics should I focus on for the exam?',
  },
];

export function ExamplePrompts({ onPromptSelect }: ExamplePromptsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
      {EXAMPLE_PROMPTS.map((prompt, i) => (
        <Card
          key={i}
          className="p-3 cursor-pointer hover:bg-muted/50 transition-colors text-left"
          onClick={() => onPromptSelect(prompt.title)}
        >
          <p className="text-xs text-muted-foreground">{prompt.title}</p>
        </Card>
      ))}
    </div>
  );
}
