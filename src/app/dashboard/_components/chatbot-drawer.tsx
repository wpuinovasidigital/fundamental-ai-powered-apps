'use client';

import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  createChatSession,
  deleteChatSession,
  getChatSession,
  handleChatStreaming,
  updateChatSession,
  handleChatStreamingSupabase,
} from '@/features/ai/chat';
import { cn } from '@/lib/utils';
import {
  ArrowLeftIcon,
  BotIcon,
  ChevronDownIcon,
  EllipsisIcon,
  Loader2Icon,
  MessageSquareIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ChatbotTextarea from './chatbot-textarea';
import { useMutation, useQuery } from '@tanstack/react-query';
import Markdown from 'react-markdown';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChatSession, Conversation } from '@/types/ai';
import { toast } from 'sonner';

export default function ChatbotDrawer() {
  const chatRef = useRef<HTMLDivElement>(null);
  const [conversation, setConversation] = useState<Conversation[]>([]);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [mode, setMode] = useState<'general' | 'personal'>('personal');

  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [activeChatSession, setActiveChatSession] = useState<string | null>(
    null,
  );

  const { data: chatSessions = [], refetch: refetchSessions } = useQuery<
    ChatSession[]
  >({
    queryKey: ['chatSessions'],
    queryFn: getChatSession,
  });

  const { mutate: handleChatMutation, isPending } = useMutation({
    mutationFn: async ({
      isThinking,
      sessionId,
      history,
    }: {
      isThinking: boolean;
      sessionId: string;
      history: Conversation[];
    }) => {
      let finalThought = '';
      let finalAnswer = '';
      let historyFromAI: Conversation[] = [];

      if (isThinking) {
        setConversation((prev) => [
          ...prev,
          { role: 'model', parts: [{ thought: true, text: '' }, { text: '' }] },
        ]);
        const response = await handleChatStreaming(history, isThinking, mode);
        // const response = await handleChatStreamingSupabase(history, isThinking);
        for await (const chunk of response) {
          setConversation((prev) => {
            const newConversation = [...prev];
            const lastIndex = newConversation.length - 1;

            const parts = newConversation[lastIndex].parts;

            newConversation[lastIndex] = {
              ...newConversation[lastIndex],
              parts: [
                {
                  ...parts[0],
                  text: chunk.startsWith('[thought]')
                    ? parts[0].text + chunk.replace('[thought]', '')
                    : parts[0].text,
                },
                {
                  text: !chunk.startsWith('[thought]')
                    ? parts[1].text + chunk
                    : parts[1].text,
                },
              ],
            };
            historyFromAI = newConversation;
            return newConversation;
          });

          if (chunk.startsWith('[thought]')) {
            finalThought += chunk.replace('[thought]', '');
          } else {
            finalAnswer += chunk;
          }
        }

        if (historyFromAI.length === 0) {
          historyFromAI = [
            ...history,
            {
              role: 'model',
              parts: [
                { thought: true, text: finalThought },
                { text: finalAnswer },
              ],
            },
          ];
        }
        await updateChatSession(sessionId, historyFromAI);
        refetchSessions();
        return response;
      } else {
        setConversation((prev) => [
          ...prev,
          { role: 'model', parts: [{ text: '' }] },
        ]);
        const response = await handleChatStreaming(history, isThinking, mode);
        // const response = await handleChatStreamingSupabase(history, isThinking);
        for await (const chunk of response) {
          setConversation((prev) => {
            const newConversation = [...prev];
            const lastIndex = newConversation.length - 1;

            newConversation[lastIndex] = {
              ...newConversation[lastIndex],
              parts: [
                { text: newConversation[lastIndex].parts[0].text + chunk },
              ],
            };
            historyFromAI = newConversation;
            return newConversation;
          });
          finalAnswer += chunk;
        }

        if (historyFromAI.length === 0) {
          historyFromAI = [
            ...history,
            {
              role: 'model',
              parts: [{ text: finalAnswer }],
            },
          ];
        }

        await updateChatSession(sessionId, historyFromAI);
        refetchSessions();
        return response;
      }
    },
    onError: (error) => {
      const botMessage = {
        role: 'model',
        parts: [{ text: 'Terjadi kesalahan: ' + error.message }],
      };
      setConversation((prev) => [...prev, botMessage]);
    },
  });

  async function sendMessage(message: string) {
    const newMessage = {
      role: 'user',
      parts: [{ text: message }],
    };

    const history = [...conversation, newMessage];
    setConversation(history);
    let sessionId = activeChatSession;

    try {
      if (!sessionId) {
        const title =
          message.substring(0, 30) + (message.length > 30 ? '...' : '');
        const newSession: ChatSession = await createChatSession(title);
        sessionId = newSession.id;
        setActiveChatSession(sessionId);
      } else {
        await updateChatSession(sessionId, history);
      }
      handleChatMutation({ isThinking, sessionId, history });
      refetchSessions();
    } catch (error) {
      toast.error(
        'Failed to save message: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current?.scrollTo({
        top: chatRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [conversation]);

  function selectSession(sessionId: string) {
    const session = chatSessions.find((s) => s.id === sessionId);
    if (session) {
      setConversation(session.messages);
      setActiveChatSession(sessionId);
      setShowHistory(false);
    } else {
      toast.error('Chat session not found');
    }
  }

  function startNewChat() {
    setActiveChatSession(null);
    setConversation([]);
    setShowHistory(false);
  }

  const {
    mutate: mutateDeleteChatSession,
    isPending: isLoadingDeleteChatSession,
  } = useMutation({
    mutationKey: ['deleteChatSession'],
    mutationFn: async (payload: { sessionId: string }) => {
      await deleteChatSession(payload.sessionId);
    },
    onSuccess() {
      refetchSessions();
      toast.success('Chat session deleted successfully');
      setActiveChatSession(null);
      setConversation([]);
    },
    onError(error) {
      toast.error(
        'Failed to delete chat session: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    },
  });

  return (
    <Drawer direction="right" modal={false}>
      <DrawerTrigger className="fixed bottom-4 right-4" asChild>
        <Button className="rounded-full size-14" size="icon-lg">
          <BotIcon className="size-6" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="w-screen! md:w-110! flex flex-col h-full">
        <DrawerHeader className="flex flex-row items-center justify-between pb-4 border-b">
          {showHistory ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="cursor-pointer"
                onClick={() => setShowHistory(false)}
              >
                <ArrowLeftIcon />
              </Button>
              <DrawerTitle className="text-base font-bold text-primary">
                Chat History
              </DrawerTitle>
            </div>
          ) : (
            <div>
              <DrawerTitle className="font-bold text-primary">
                AI Financial Advisor
              </DrawerTitle>
              <DrawerDescription className="text-xs">
                Get personalized financial advice
              </DrawerDescription>
            </div>
          )}

          <div className="flex items-center gap-1.5 ml-auto">
            {showHistory ? (
              <Button onClick={startNewChat}>
                <PlusIcon className="size-4" />
                New Chat
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowHistory(true)}
                  className="cursor-pointer"
                >
                  <MessageSquareIcon className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="cursor-pointer"
                  onClick={startNewChat}
                >
                  <PlusIcon className="size-4" />
                </Button>
              </>
            )}
          </div>

          <DrawerClose asChild>
            <Button variant="outline" size="icon">
              <XIcon />
            </Button>
          </DrawerClose>
        </DrawerHeader>
        <div className="flex flex-col flex-1 min-h-0 px-4 py-2 overflow-y-auto no-scrollbar">
          {showHistory ? (
            <div>
              {chatSessions.length > 0 ? (
                <div className="flex flex-col gap-2 overflow-y-auto">
                  {chatSessions.map((chatSession) => (
                    <div
                      key={chatSession.id}
                      onClick={() => selectSession(chatSession.id)}
                      className={cn(
                        'flex items-center justify-between p-3 text-left transition-all border cursor-pointer rounded-xl border-border hover:bg-muted/70 group',
                        activeChatSession === chatSession.id &&
                          'border-primary bg-primary-5 hover:bg-primary/5',
                      )}
                    >
                      <span className="font-medium truncate">
                        {chatSession.title}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="cursor-pointer hover:text-destructive text-muted-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          mutateDeleteChatSession({
                            sessionId: chatSession.id,
                          });
                        }}
                        disabled={isLoadingDeleteChatSession}
                      >
                        {isLoadingDeleteChatSession ? (
                          <Loader2Icon className="animate-spin" />
                        ) : (
                          <Trash2Icon />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <MessageSquareIcon className="size-10 text-muted-foreground/40" />
                  <h4 className="text-sm font-medium text-muted-foreground">
                    No chat history yet
                  </h4>
                  <p className="text-xs text-muted-foreground/70">
                    Start a new conversation to get financial advice
                  </p>
                </div>
              )}
            </div>
          ) : conversation.length > 0 ? (
            <div
              ref={chatRef}
              className="flex flex-col h-full gap-8 overflow-x-hidden overflow-y-auto no-scrollbar"
            >
              {conversation.map((message, index) => (
                <div
                  key={`conversation-${index}`}
                  className={cn(
                    'flex flex-col gap-2',
                    message.role === 'model' ? 'items-start' : 'items-end',
                  )}
                >
                  <div
                    className={cn('flex flex-col w-full', {
                      'bg-primary/20 text-primary px-5 py-2 rounded-3xl rounded-br-md w-fit max-w-3/4':
                        message.role === 'user',
                    })}
                  >
                    {message.role === 'model' && (
                      <div className="flex items-center gap-1 text-xs font-semibold text-primary">
                        <BotIcon />
                        AI Advisor
                      </div>
                    )}
                    {message.role === 'model' ? (
                      <div className="response-ai">
                        {message.parts.map((part, indexPart) => (
                          <div key={`response-ai-${index}-${indexPart}`}>
                            {part.thought ? (
                              <Collapsible>
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="secondary"
                                    className="mt-1 text-xs font-medium cursor-pointer"
                                    size="sm"
                                  >
                                    Thought
                                    <ChevronDownIcon />
                                  </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="pl-2 ml-4 text-xs italic border-l border-muted text-muted-foreground">
                                    <Markdown>{part.text}</Markdown>
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            ) : (
                              <Markdown>{part.text}</Markdown>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      message.parts[0].text
                    )}
                  </div>
                </div>
              ))}
              {isPending && (
                <div className="flex items-center -mt-8 animate-pulse">
                  <EllipsisIcon className="size-8 text-primary/50" />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <h2 className="text-3xl font-bold text-primary">Hello There</h2>
              <h4 className="text-xl">What can I help you?</h4>
            </div>
          )}
        </div>
        {!showHistory && (
          <DrawerFooter>
            <ChatbotTextarea
              isThinking={isThinking}
              setIsThinking={setIsThinking}
              sendMessage={sendMessage}
              mode={mode}
              setMode={setMode}
            />
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
