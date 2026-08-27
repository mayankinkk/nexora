'use client';

import type React from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Paperclip,
  ArrowUp,
  Loader2,
  MessageSquare,
  FileText,
  HelpCircle,
  Layers,
  GitCompare,
  Search,
  Upload,
  BookOpen,
  GraduationCap,
} from 'lucide-react';
import { ChatMessage } from '@/components/chat-message';
import { FilePreview } from '@/components/file-preview';
import { FlashcardViewer } from '@/components/flashcard-viewer';
import { QuizViewer } from '@/components/quiz-viewer';
import { SummaryViewer } from '@/components/summary-viewer';
import { SearchResults } from '@/components/search-results';
import { ComparisonViewer } from '@/components/comparison-viewer';
import { extractTextFromPDF } from '@/lib/pdf-client';
// LangGraph client is accessed server-side via API routes
import {
  StudyTool,
  PDFDocument,
  QuizQuestion,
  Flashcard,
} from '@/types/graphTypes';

const TOOLS: { id: StudyTool; label: string; icon: React.ReactNode }[] = [
  { id: 'chat', label: 'Chat', icon: <MessageSquare className="h-4 w-4" /> },
  { id: 'summary', label: 'Summarize', icon: <FileText className="h-4 w-4" /> },
  { id: 'quiz', label: 'Quiz', icon: <HelpCircle className="h-4 w-4" /> },
  { id: 'flashcards', label: 'Flashcards', icon: <Layers className="h-4 w-4" /> },
  { id: 'compare', label: 'Compare', icon: <GitCompare className="h-4 w-4" /> },
  { id: 'search', label: 'Search', icon: <Search className="h-4 w-4" /> },
];

export default function Home() {
  const { toast } = useToast();
  const [activeTool, setActiveTool] = useState<StudyTool>('chat');
  const [messages, setMessages] = useState<
    Array<{
      role: 'user' | 'assistant';
      content: string;
      sources?: PDFDocument[];
    }>
  >([]);
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastRetrievedDocsRef = useRef<PDFDocument[]>([]);

  // Tool-specific state
  const [summary, setSummary] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [searchResults, setSearchResults] = useState('');
  const [comparison, setComparison] = useState('');

  useEffect(() => {
    const initThread = async () => {
      if (threadId) return;
      try {
        const res = await fetch('/api/thread', { method: 'POST' });
        if (!res.ok) throw new Error('Failed to create thread');
        const thread = await res.json();
        setThreadId(thread.thread_id);
      } catch (error) {
        console.error('Error creating thread:', error);
        toast({
          title: 'Error',
          description: 'Error creating thread. Please check your LangGraph server.',
          variant: 'destructive',
        });
      }
    };
    initThread();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, summary, quizQuestions, flashcards, searchResults, comparison]);

  const resetToolState = () => {
    setSummary('');
    setQuizQuestions([]);
    setFlashcards([]);
    setSearchResults('');
    setComparison('');
  };

  const handleToolChange = (tool: StudyTool) => {
    setActiveTool(tool);
    resetToolState();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !threadId || isLoading) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    resetToolState();

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    lastRetrievedDocsRef.current = [];

    try {
      if (activeTool === 'chat') {
        await handleChat(userMessage, abortController);
      } else if (activeTool === 'summary') {
        await handleSummary(abortController);
      } else if (activeTool === 'quiz') {
        await handleQuiz(abortController);
      } else if (activeTool === 'flashcards') {
        await handleFlashcards(abortController);
      } else if (activeTool === 'search') {
        await handleSearch(userMessage, abortController);
      } else if (activeTool === 'compare') {
        await handleCompare(userMessage, abortController);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleChat = async (message: string, controller: AbortController) => {
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: message },
      { role: 'assistant', content: '' },
    ]);

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, threadId }),
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunkStr = decoder.decode(value);
      const lines = chunkStr.split('\n').filter(Boolean);
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const sseString = line.slice('data: '.length);
        let sseEvent: any;
        try {
          sseEvent = JSON.parse(sseString);
        } catch {
          continue;
        }
        const { event, data } = sseEvent;
        if (event === 'messages/partial') {
          if (Array.isArray(data)) {
            const lastObj = data[data.length - 1];
            if (lastObj?.type === 'ai') {
              let partialContent = lastObj.content ?? '';
              if (typeof partialContent === 'string') {
                partialContent = partialContent.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/<think>[\s\S]*$/g, '').trim();
                if (partialContent && !partialContent.startsWith('{')) {
                  setMessages((prev) => {
                    const newArr = [...prev];
                    if (newArr.length > 0 && newArr[newArr.length - 1].role === 'assistant') {
                      newArr[newArr.length - 1].content = partialContent;
                      newArr[newArr.length - 1].sources = lastRetrievedDocsRef.current;
                    }
                    return newArr;
                  });
                }
              }
            }
          }
        } else if (event === 'updates' && data) {
          if (
            data &&
            typeof data === 'object' &&
            'retrieveDocuments' in data &&
            data.retrieveDocuments &&
            Array.isArray(data.retrieveDocuments.documents)
          ) {
            lastRetrievedDocsRef.current = data.retrieveDocuments.documents;
          } else {
            lastRetrievedDocsRef.current = [];
          }
        }
      }
    }
  };

  const handleSummary = async (controller: AbortController) => {
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: 'Generate summary' },
      { role: 'assistant', content: 'Generating summary...' },
    ]);

    const response = await fetch('/api/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId }),
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunkStr = decoder.decode(value);
      const lines = chunkStr.split('\n').filter(Boolean);
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const sseString = line.slice('data: '.length);
        let sseEvent: any;
        try {
          sseEvent = JSON.parse(sseString);
        } catch {
          continue;
        }
        const { event, data } = sseEvent;
        if (event === 'messages/partial' && Array.isArray(data)) {
          const lastObj = data[data.length - 1];
          if (lastObj?.type === 'ai') {
            const content = lastObj.content ?? '';
            if (typeof content === 'string') {
              setSummary(content);
            }
          }
        }
      }
    }
    setMessages((prev) => {
      const newArr = [...prev];
      if (newArr.length > 0 && newArr[newArr.length - 1].role === 'assistant') {
        newArr[newArr.length - 1].content = 'Summary generated! See below.';
      }
      return newArr;
    });
  };

  const handleQuiz = async (controller: AbortController) => {
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: 'Generate quiz' },
      { role: 'assistant', content: 'Generating quiz questions...' },
    ]);

    const response = await fetch('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId, numQuestions: 5 }),
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    const decoder = new TextDecoder();
    let fullContent = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunkStr = decoder.decode(value);
      const lines = chunkStr.split('\n').filter(Boolean);
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const sseString = line.slice('data: '.length);
        let sseEvent: any;
        try {
          sseEvent = JSON.parse(sseString);
        } catch {
          continue;
        }
        const { event, data } = sseEvent;
        if (event === 'messages/partial' && Array.isArray(data)) {
          const lastObj = data[data.length - 1];
          if (lastObj?.type === 'ai') {
            const content = lastObj.content ?? '';
            if (typeof content === 'string') {
              fullContent = content;
              try {
                const parsed = JSON.parse(content);
                if (Array.isArray(parsed)) {
                  setQuizQuestions(parsed);
                }
              } catch {
                // Not JSON yet, keep accumulating
              }
            }
          }
        }
      }
    }
    // Try parsing final content
    try {
      const parsed = JSON.parse(fullContent);
      if (Array.isArray(parsed)) {
        setQuizQuestions(parsed);
      }
    } catch {}
    setMessages((prev) => {
      const newArr = [...prev];
      if (newArr.length > 0 && newArr[newArr.length - 1].role === 'assistant') {
        newArr[newArr.length - 1].content = 'Quiz generated! See below.';
      }
      return newArr;
    });
  };

  const handleFlashcards = async (controller: AbortController) => {
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: 'Generate flashcards' },
      { role: 'assistant', content: 'Creating flashcards...' },
    ]);

    const response = await fetch('/api/flashcard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId, numCards: 10 }),
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    const decoder = new TextDecoder();
    let fullContent = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunkStr = decoder.decode(value);
      const lines = chunkStr.split('\n').filter(Boolean);
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const sseString = line.slice('data: '.length);
        let sseEvent: any;
        try {
          sseEvent = JSON.parse(sseString);
        } catch {
          continue;
        }
        const { event, data } = sseEvent;
        if (event === 'messages/partial' && Array.isArray(data)) {
          const lastObj = data[data.length - 1];
          if (lastObj?.type === 'ai') {
            const content = lastObj.content ?? '';
            if (typeof content === 'string') {
              fullContent = content;
              try {
                const parsed = JSON.parse(content);
                if (Array.isArray(parsed)) {
                  setFlashcards(parsed);
                }
              } catch {}
            }
          }
        }
      }
    }
    try {
      const parsed = JSON.parse(fullContent);
      if (Array.isArray(parsed)) {
        setFlashcards(parsed);
      }
    } catch {}
    setMessages((prev) => {
      const newArr = [...prev];
      if (newArr.length > 0 && newArr[newArr.length - 1].role === 'assistant') {
        newArr[newArr.length - 1].content = 'Flashcards created! See below.';
      }
      return newArr;
    });
  };

  const handleSearch = async (query: string, controller: AbortController) => {
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: query },
      { role: 'assistant', content: 'Searching...' },
    ]);

    const response = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, threadId }),
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunkStr = decoder.decode(value);
      const lines = chunkStr.split('\n').filter(Boolean);
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const sseString = line.slice('data: '.length);
        let sseEvent: any;
        try {
          sseEvent = JSON.parse(sseString);
        } catch {
          continue;
        }
        const { event, data } = sseEvent;
        if (event === 'messages/partial' && Array.isArray(data)) {
          const lastObj = data[data.length - 1];
          if (lastObj?.type === 'ai') {
            const content = lastObj.content ?? '';
            if (typeof content === 'string') {
              setSearchResults(content);
            }
          }
        }
      }
    }
    setMessages((prev) => {
      const newArr = [...prev];
      if (newArr.length > 0 && newArr[newArr.length - 1].role === 'assistant') {
        newArr[newArr.length - 1].content = 'Search results ready! See below.';
      }
      return newArr;
    });
  };

  const handleCompare = async (query: string, controller: AbortController) => {
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: query || 'Compare documents' },
      { role: 'assistant', content: 'Comparing documents...' },
    ]);

    const response = await fetch('/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query || 'Compare key concepts across documents' }),
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunkStr = decoder.decode(value);
      const lines = chunkStr.split('\n').filter(Boolean);
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const sseString = line.slice('data: '.length);
        let sseEvent: any;
        try {
          sseEvent = JSON.parse(sseString);
        } catch {
          continue;
        }
        const { event, data } = sseEvent;
        if (event === 'messages/partial' && Array.isArray(data)) {
          const lastObj = data[data.length - 1];
          if (lastObj?.type === 'ai') {
            const content = lastObj.content ?? '';
            if (typeof content === 'string') {
              setComparison(content);
            }
          }
        }
      }
    }
    setMessages((prev) => {
      const newArr = [...prev];
      if (newArr.length > 0 && newArr[newArr.length - 1].role === 'assistant') {
        newArr[newArr.length - 1].content = 'Comparison ready! See below.';
      }
      return newArr;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const nonPdfFiles = selectedFiles.filter(
      (f) => !f.name.toLowerCase().endsWith('.pdf'),
    );
    if (nonPdfFiles.length > 0) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload PDF files only',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      for (const file of selectedFiles) {
        toast({
          title: 'Processing...',
          description: `Extracting text from ${file.name}...`,
        });

        const pages = await extractTextFromPDF(file);
        if (pages.length === 0) {
          throw new Error(`Could not extract text from ${file.name}. The PDF may be image-based or empty.`);
        }

        const response = await fetch('/api/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pages, filename: file.name }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.details || data.error || 'Failed to ingest file');
        }

        setFiles((prev) => [...prev, file]);
        setUploadedDocs((prev) => [...prev, file.name]);
      }

      toast({
        title: 'Success',
        description: `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} uploaded successfully`,
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload files',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (fileToRemove: File) => {
    setFiles(files.filter((f) => f !== fileToRemove));
  };

  const getPlaceholder = () => {
    switch (activeTool) {
      case 'chat':
        return 'Ask anything about your documents...';
      case 'summary':
        return 'Click generate to summarize your documents';
      case 'quiz':
        return 'Click generate to create quiz questions';
      case 'flashcards':
        return 'Click generate to create flashcards';
      case 'search':
        return 'Search through your documents...';
      case 'compare':
        return 'What would you like to compare?';
      default:
        return 'Type a message...';
    }
  };

  const isInputDisabled = activeTool === 'summary' || activeTool === 'quiz' || activeTool === 'flashcards';

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            <h1 className="text-lg font-bold">Nexora</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">AI Document Intelligence</p>
        </div>

        {/* Uploaded documents */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Documents ({uploadedDocs.length})
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="h-3 w-3 mr-1" />
              Upload
            </Button>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {uploadedDocs.map((name, i) => (
              <div key={i} className="text-xs truncate text-muted-foreground flex items-center gap-1">
                <BookOpen className="h-3 w-3 flex-shrink-0" />
                {name}
              </div>
            ))}
            {uploadedDocs.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No documents yet</p>
            )}
          </div>
        </div>

        {/* Tool navigation */}
        <nav className="flex-1 p-2 space-y-1">
          {TOOLS.map((tool) => (
            <Button
              key={tool.id}
              variant={activeTool === tool.id ? 'default' : 'ghost'}
              className="w-full justify-start gap-2"
              onClick={() => handleToolChange(tool.id)}
            >
              {tool.icon}
              {tool.label}
            </Button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {/* Tool header */}
        <div className="border-b p-4">
          <h2 className="text-sm font-medium">
            {TOOLS.find((t) => t.id === activeTool)?.label} Mode
          </h2>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Chat messages */}
          {activeTool === 'chat' && messages.length > 0 && (
            <div className="space-y-4 mb-4">
              {messages.map((msg, i) => (
                <ChatMessage key={i} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Non-chat tool outputs */}
          {activeTool !== 'chat' && messages.length > 0 && (
            <div className="space-y-4 mb-4">
              {messages.map((msg, i) => (
                <ChatMessage key={i} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Tool-specific viewers */}
          {summary && activeTool === 'summary' && <SummaryViewer content={summary} />}
          {quizQuestions.length > 0 && activeTool === 'quiz' && (
            <QuizViewer questions={quizQuestions} />
          )}
          {flashcards.length > 0 && activeTool === 'flashcards' && (
            <FlashcardViewer cards={flashcards} />
          )}
          {searchResults && activeTool === 'search' && (
            <SearchResults content={searchResults} />
          )}
          {comparison && activeTool === 'compare' && (
            <ComparisonViewer content={comparison} />
          )}

          {/* Empty state */}
          {messages.length === 0 && (
            <div className="flex-1 flex items-center justify-center h-full">
              <div className="text-center">
                <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {activeTool === 'chat' && 'Chat with your study materials'}
                  {activeTool === 'summary' && 'Auto-generate summaries'}
                  {activeTool === 'quiz' && 'Generate quiz questions'}
                  {activeTool === 'flashcards' && 'Create flashcards'}
                  {activeTool === 'compare' && 'Compare documents'}
                  {activeTool === 'search' && 'Semantic document search'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  {activeTool === 'chat'
                    ? 'Upload lecture notes, PDFs, past papers, syllabi, and lab manuals, then ask questions about them.'
                    : 'Upload documents first, then use the generate button to get started.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t p-4">
          <div className="max-w-4xl mx-auto">
            {files.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-3">
                {files.map((file, index) => (
                  <FilePreview
                    key={`${file.name}-${index}`}
                    file={file}
                    onRemove={() => handleRemoveFile(file)}
                  />
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="relative">
              <div className="flex gap-2 border rounded-lg overflow-hidden bg-background">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf"
                  multiple
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-none h-12"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                </Button>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    isUploading ? 'Uploading PDF...' : getPlaceholder()
                  }
                  className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12 bg-transparent"
                  disabled={isUploading || isLoading || !threadId || isInputDisabled}
                />
                {isInputDisabled ? (
                  <Button
                    type="submit"
                    size="sm"
                    className="h-12 px-6 rounded-none"
                    disabled={isLoading || !threadId || uploadedDocs.length === 0}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Generate'
                    )}
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="icon"
                    className="rounded-none h-12"
                    disabled={!input.trim() || isUploading || isLoading || !threadId}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowUp className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
