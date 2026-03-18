import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User, Bike, Store, MessageSquare } from 'lucide-react';
import { Order, ChatMessage, SenderType, ChatRoomType } from '../types';
import { supabase } from '../lib/supabaseClient';

interface ChatMultilateralModalProps {
  order: Order;
  onClose: () => void;
  theme?: string;
}

export const ChatMultilateralModal: React.FC<ChatMultilateralModalProps> = ({ onClose, order, theme }) => {
  const isOpen = !!order;
  const [activeTab, setActiveTab] = useState<ChatRoomType>('COURIER_CLIENT');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Initial Messages & Setup Realtime
  useEffect(() => {
    if (!order || !isOpen) return;

    const fetchMessages = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('order_messages')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data.map(m => ({
          id: m.id,
          orderId: m.order_id,
          senderType: m.sender_type as SenderType,
          senderName: m.sender_name,
          text: m.content,
          timestamp: new Date(m.created_at),
          room: m.room_type as ChatRoomType
        })));
      }
      setIsLoading(false);
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`order-chat-${order.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'order_messages',
        filter: `order_id=eq.${order.id}`
      }, (payload) => {
        const newMessage: ChatMessage = {
          id: payload.new.id,
          orderId: payload.new.order_id,
          senderType: payload.new.sender_type as SenderType,
          senderName: payload.new.sender_name,
          text: payload.new.content,
          timestamp: new Date(payload.new.created_at),
          room: payload.new.room_type as ChatRoomType
        };
        setMessages(prev => [...prev, newMessage]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order, isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeTab]);

  const handleSend = async () => {
    if (!message.trim() || !order) return;

    const textToSend = message.trim();
    setMessage(''); // Optimistic clear

    const { error } = await supabase
      .from('order_messages')
      .insert({
        order_id: order.id,
        room_type: activeTab,
        sender_type: 'STORE',
        sender_name: 'Atendimento Guepardo',
        content: textToSend
      });

    if (error) {
      console.error('Error sending message:', error);
      // Optional: add UI feedback for error
    }
  };

  if (!isOpen || !order) return null;

  const currentMessages = messages.filter(m => m.room === activeTab);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#1A0900] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-[600px] animate-in fade-in zoom-in duration-300">
        
        {/* HEADER */}
        <div className="p-8 bg-gradient-to-b from-[#2D0F00] to-[#1A0900] border-b border-white/5 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-guepardo-accent/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-14 h-14 bg-guepardo-accent rounded-2xl shadow-[0_0_30px_rgba(255,102,0,0.3)] flex items-center justify-center">
              <MessageSquare size={28} className="text-white fill-white/20" />
            </div>
            <div>
              <h3 className="text-xl font-black italic tracking-tighter uppercase text-white leading-none">Chat Multilateral</h3>
              <p className="text-[11px] font-black text-guepardo-accent uppercase tracking-[0.2em] mt-2">Pedido #{order.display_id || order.id.slice(-4)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-white/40 hover:text-white group/close">
            <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {/* TABS */}
        <div className="px-6 py-4 bg-[#1A0900] flex gap-3">
          <button
            onClick={() => setActiveTab('COURIER_CLIENT')}
            className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-3 border ${
              activeTab === 'COURIER_CLIENT' 
              ? 'bg-white/10 border-white/20 text-white shadow-xl scale-[1.02]' 
              : 'bg-transparent border-white/5 text-white/20 hover:text-white/40 hover:bg-white/5'
            }`}
          >
            <Bike size={16} strokeWidth={3} /> Entregador x Cliente
          </button>
          <button
            onClick={() => setActiveTab('STORE_COURIER')}
            className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-3 border ${
              activeTab === 'STORE_COURIER' 
              ? 'bg-guepardo-accent border-guepardo-accent text-white shadow-[0_10px_20px_rgba(255,102,0,0.2)] scale-[1.02]' 
              : 'bg-transparent border-white/5 text-white/20 hover:text-white/40 hover:bg-white/5'
            }`}
          >
            <Store size={16} strokeWidth={3} /> Loja x Entregador
          </button>
        </div>

        {/* MESSAGES AREA */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 bg-black/40 scrollbar-guepardo shadow-inner relative"
        >
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-guepardo-accent border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 italic">Sincronizando...</p>
            </div>
          ) : currentMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-10">
              <MessageSquare size={64} className="mb-4 text-white" />
              <p className="text-sm font-black uppercase tracking-[0.3em] text-white">Silêncio no Canal</p>
            </div>
          ) : (
            currentMessages.map((msg) => {
              const isMine = msg.senderType === 'STORE';
              return (
                <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 fade-in duration-500`}>
                  <div className={`max-w-[85%] p-5 rounded-[1.5rem] relative group/msg ${
                    isMine 
                    ? 'bg-guepardo-accent text-white rounded-tr-none shadow-[0_10px_30px_rgba(255,102,0,0.3)]' 
                    : 'bg-[#121212] border border-white/10 text-white rounded-tl-none shadow-xl'
                  }`}>
                    {!isMine && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-guepardo-accent">
                          {msg.senderName}
                        </span>
                      </div>
                    )}
                    {isMine && (
                      <div className="flex items-center gap-2 mb-2 justify-end">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                          {msg.senderName}
                        </span>
                      </div>
                    )}
                    <p className="text-[15px] font-bold leading-relaxed tracking-tight">{msg.text}</p>
                    
                    {/* Glow effect for mine */}
                    {isMine && <div className="absolute inset-0 bg-white/10 rounded-[1.5rem] opacity-0 group-hover/msg:opacity-100 transition-opacity pointer-events-none"></div>}
                  </div>
                  <span className="text-[9px] font-black text-white/20 mt-2 uppercase tracking-widest px-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* INPUT AREA */}
        <div className="p-8 bg-[#2D0F00]/40 border-t border-white/5 backdrop-blur-3xl">
          <div className="flex gap-4 bg-black/60 p-3 rounded-[2rem] border border-white/10 focus-within:border-guepardo-accent/50 focus-within:shadow-[0_0_30px_rgba(255,102,0,0.1)] transition-all duration-500">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Digite sua mensagem para o canal..."
              className="flex-1 bg-transparent border-none focus:outline-none text-[15px] font-bold text-white px-4 placeholder:text-white/20"
            />
            <button
              onClick={handleSend}
              disabled={!message.trim()}
              className="w-14 h-14 bg-guepardo-accent rounded-2xl text-white flex items-center justify-center hover:scale-105 hover:bg-[#FF7A29] active:scale-95 transition-all disabled:opacity-30 disabled:scale-100 shadow-[0_10px_20px_rgba(255,102,0,0.4)]"
            >
              <Send size={24} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
