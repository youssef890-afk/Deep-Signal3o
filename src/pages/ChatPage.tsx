import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import Avatar from '@/components/Avatar';
import { Send, ArrowLeft, Loader2, MessageCircle } from 'lucide-react';
import { formatTime } from '@/utils/format';
import type { Profile, Message, Conversation } from '@/types';

export default function ChatPage() {
  const { user, profile: myProfile } = useAuth();
  const { userId: activeUserId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeUser, setActiveUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const loadConversations = async () => {
      setLoading(true);

      const { data: msgs, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error('Error loading conversations:', error);
        setLoading(false);
        return;
      }

      if (!msgs || msgs.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const convMap = new Map<
        string,
        {
          lastMessage: Message;
          unreadCount: number;
        }
      >();

      for (const rawMessage of msgs) {
        const message = rawMessage as Message;

        const otherUserId =
          message.sender_id === user.id
            ? message.receiver_id
            : message.sender_id;

        const existing = convMap.get(otherUserId);

        if (!existing) {
          convMap.set(otherUserId, {
            lastMessage: message,
            unreadCount:
              message.receiver_id === user.id && !message.read_at ? 1 : 0,
          });
        } else if (
          message.receiver_id === user.id &&
          !message.read_at
        ) {
          existing.unreadCount += 1;
        }
      }

      const userIds = Array.from(convMap.keys());

      if (userIds.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (cancelled) return;

      if (profilesError) {
        console.error(
          'Error loading conversation profiles:',
          profilesError
        );
        setLoading(false);
        return;
      }

      if (!profiles) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const profileMap = new Map<string, Profile>(
        (profiles as Profile[]).map((profile) => [
          profile.id,
          profile,
        ])
      );

      const conversationList: Conversation[] = [];

      for (const userId of userIds) {
        const conversation = convMap.get(userId);
        const otherUser = profileMap.get(userId);

        if (!conversation || !otherUser) continue;

        conversationList.push({
          otherUser,
          lastMessage: conversation.lastMessage,
          unreadCount: conversation.unreadCount,
        });
      }

      setConversations(conversationList);
      setLoading(false);
    };

    loadConversations();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!activeUserId) {
      setActiveUser(null);
      return;
    }

    let cancelled = false;

    const loadActiveUser = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', activeUserId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('Error loading active user:', error);
        setActiveUser(null);
        return;
      }

      setActiveUser(data as Profile | null);
    };

    loadActiveUser();

    return () => {
      cancelled = true;
    };
  }, [activeUserId]);

  const markMessagesAsRead = useCallback(
    async (unreadMessages: Message[]) => {
      if (!user || unreadMessages.length === 0) return;

      const readAt = new Date().toISOString();

      for (const message of unreadMessages) {
        const { error } = await supabase
          .from('messages')
          .update({ read_at: readAt })
          .eq('id', message.id)
          .eq('receiver_id', user.id);

        if (error) {
          console.error('Error marking message as read:', error);
        }
      }
    },
    [user]
  );

  const loadMessages = useCallback(async () => {
    if (!user || !activeUserId) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${activeUserId}),and(sender_id.eq.${activeUserId},receiver_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
      return;
    }

    const loadedMessages = (data as Message[]) ?? [];

    setMessages(loadedMessages);

    const unreadMessages = loadedMessages.filter(
      (message) =>
        message.receiver_id === user.id && !message.read_at
    );

    await markMessagesAsRead(unreadMessages);
  }, [user, activeUserId, markMessagesAsRead]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!user || !activeUserId) return;

    const channel = supabase
      .channel(`chat:${user.id}:${activeUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage = payload.new as Message;

          const belongsToConversation =
            (newMessage.sender_id === user.id &&
              newMessage.receiver_id === activeUserId) ||
            (newMessage.sender_id === activeUserId &&
              newMessage.receiver_id === user.id);

          if (!belongsToConversation) return;

          setMessages((previousMessages) => {
            if (
              previousMessages.some(
                (message) => message.id === newMessage.id
              )
            ) {
              return previousMessages;
            }

            return [...previousMessages, newMessage];
          });

          if (newMessage.receiver_id === user.id) {
            void markMessagesAsRead([newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, activeUserId, markMessagesAsRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages]);

  const handleSend = async () => {
    if (
      !newMessage.trim() ||
      !user ||
      !activeUserId ||
      sending
    ) {
      return;
    }

    setSending(true);

    const content = newMessage.trim();

    setNewMessage('');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id: activeUserId,
        content,
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      setNewMessage(content);
      setSending(false);
      return;
    }

    if (data) {
      setMessages((previousMessages) => {
        const message = data as Message;

        if (
          previousMessages.some(
            (existingMessage) =>
              existingMessage.id === message.id
          )
        ) {
          return previousMessages;
        }

        return [...previousMessages, message];
      });
    }

    setSending(false);
  };

  const displayName = (profile: Profile) =>
    profile.full_name || profile.username;

  return (
    <div className="h-screen flex">
      <div
        className={`w-full md:w-80 border-r border-white/10 flex flex-col ${
          activeUserId
            ? 'hidden md:flex'
            : 'flex'
        }`}
      >
        <div className="px-5 py-4 border-b border-white/10">
          <h1 className="text-xl font-bold">
            Messages
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-600" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <MessageCircle className="w-10 h-10 text-neutral-700 mb-3" />

              <p className="text-sm text-neutral-500">
                No conversations yet. Search for users and start
                chatting.
              </p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.otherUser.id}
                onClick={() =>
                  navigate(
                    `/chat/${conversation.otherUser.id}`
                  )
                }
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left ${
                  activeUserId === conversation.otherUser.id
                    ? 'bg-white/10'
                    : ''
                }`}
              >
                <Avatar
                  src={conversation.otherUser.avatar_url}
                  name={displayName(
                    conversation.otherUser
                  )}
                  size="md"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white truncate">
                      {conversation.otherUser.username}
                    </p>

                    {conversation.lastMessage && (
                      <span className="text-xs text-neutral-600 shrink-0">
                        {formatTime(
                          conversation.lastMessage.created_at
                        )}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-neutral-500 truncate mt-0.5">
                    {conversation.lastMessage?.sender_id === user?.id
                      ? 'You: '
                      : ''}

                    {conversation.lastMessage?.content ||
                      'No messages'}
                  </p>
                </div>

                {conversation.unreadCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center font-bold shrink-0">
                    {conversation.unreadCount}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      <div
        className={`flex-1 flex flex-col ${
          !activeUserId
            ? 'hidden md:flex'
            : 'flex'
        }`}
      >
        {activeUser ? (
          <>
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/10">
              <button
                onClick={() => navigate('/chat')}
                className="md:hidden text-neutral-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <Avatar
                src={activeUser.avatar_url}
                name={displayName(activeUser)}
                size="sm"
                onClick={() =>
                  navigate(`/profile/${activeUser.id}`)
                }
              />

              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() =>
                  navigate(`/profile/${activeUser.id}`)
                }
              >
                <p className="text-sm font-semibold text-white truncate">
                  {activeUser.username}
                </p>

                <p className="text-xs text-neutral-500 truncate">
                  #{activeUser.display_id}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Avatar
                    src={activeUser.avatar_url}
                    name={displayName(activeUser)}
                    size="xl"
                    ring
                  />

                  <p className="text-lg font-semibold text-white mt-4">
                    {activeUser.username}
                  </p>

                  <p className="text-sm text-neutral-500 mt-1">
                    Start a conversation with{' '}
                    {activeUser.username}
                  </p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isMine =
                    message.sender_id === user?.id;

                  const previousMessage =
                    messages[index - 1];

                  const showAvatar =
                    !isMine &&
                    (!previousMessage ||
                      previousMessage.sender_id !==
                        message.sender_id);

                  return (
                    <div
                      key={message.id}
                      className={`flex items-end gap-2 ${
                        isMine
                          ? 'justify-end'
                          : 'justify-start'
                      } animate-slide-up`}
                    >
                      {!isMine && (
                        <div className="w-8 shrink-0">
                          {showAvatar && (
                            <Avatar
                              src={activeUser.avatar_url}
                              name={displayName(activeUser)}
                              size="xs"
                            />
                          )}
                        </div>
                      )}

                      <div
                        className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMine
                            ? 'bg-gradient-to-br from-rose-500 to-pink-600 text-white rounded-br-md'
                            : 'bg-neutral-800 text-neutral-100 rounded-bl-md'
                        }`}
                      >
                        <p>{message.content}</p>

                        <p
                          className={`text-[10px] mt-1 ${
                            isMine
                              ? 'text-white/60'
                              : 'text-neutral-500'
                          }`}
                        >
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="px-4 py-3 border-t border-white/10">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(event) =>
                    setNewMessage(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === 'Enter' &&
                      !event.shiftKey
                    ) {
                      void handleSend();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 bg-neutral-800 border border-white/10 rounded-full px-5 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-rose-500/50 transition-all"
                />

                <button
                  onClick={() => void handleSend()}
                  disabled={
                    !newMessage.trim() ||
                    sending
                  }
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white disabled:opacity-40 hover:scale-105 active:scale-90 transition-all shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <MessageCircle className="w-10 h-10 text-neutral-600" />
            </div>

            <h3 className="text-lg font-semibold text-white mb-2">
              Your Messages
            </h3>

            <p className="text-sm text-neutral-500 max-w-xs">
              Select a conversation or search for users to start
              a new chat.
            </p>

            {myProfile && (
              <p className="text-xs text-neutral-700 mt-4">
                Signed in as @{myProfile.username}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
