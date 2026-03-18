import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User, Bike, Store, MessageSquare } from 'lucide-react';
import { Order, ChatMessage, SenderType, ChatRoomType } from '../types';

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
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initial Mock Data
  useEffect(() => {
    if (order && isOpen) {
      const mockMessages: ChatMessage[] = [
        {
          id: '1',
          orderId: order.id,
          senderType: 'COURIER',
          senderName: order.courier?.name || 'Entregador',
          text: 'Olá! Estou a caminho com o seu pedido.',
          timestamp: new Date(Date.now() - 1000 * 60 * 5),
          room: 'COURIER_CLIENT'
        },
        {
          id: '2',
          orderId: order.id,
          senderType: 'CLIENT',
          senderName: order.clientName,
          text: 'Perfeito, muito obrigado! Pode deixar na portaria?',
          timestamp: new Date(Date.now() - 1000 * 60 * 4),
          room: 'COURIER_CLIENT'
        },
        {
          id: '3',
          orderId: order.id,
          senderType: 'COURIER',
          senderName: order.courier?.name || 'Entregador',
          text: 'Sem problemas. Acabei de coletar na loja.',
          timestamp: new Date(Date.now() - 1000 * 60 * 10),
          room: 'STORE_COURIER'
        },
        {
          id: '4',
          orderId: order.id,
          senderType: 'STORE',
          senderName: 'Atendimento Guepardo',
          text: 'Entregador, favor conferir o número do pedido na embalagem.',
          timestamp: new Date(Date.now() - 1000 * 60 * 12),
          room: 'STORE_COURIER'
        }
      ];
      setMessages(mockMessages);
    }
  }, [order, isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeTab]);

  const handleSend = () => {
    if (!message.trim() || !order) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      orderId: order.id,
      senderType: 'STORE',
      senderName: 'Minha Loja',
      text: message,
      timestamp: new Date(),
      room: activeTab
    };

    setMessages([...messages, newMessage]);
    setMessage('');
  };

  if (!isOpen || !order) return null;

  const currentMessages = messages.filter(m => m.room === activeTab);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#1A0900] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-[600px] animate-in fade-in zoom-in duration-300">
        
        {/* HEADER */}
        <div className="p-6 bg-[#2D0F00] border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-guepardo-accent rounded-2xl shadow-lg">
              <MessageSquare size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black italic tracking-tighter uppercase text-white">Chat Multilateral</h3>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Pedido #{order.display_id || order.id.slice(-4)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* TABS */}
        <div className="p-4 bg-[#1A0900] flex gap-2">
          <button
            onClick={() => setActiveTab('COURIER_CLIENT')}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border ${
              activeTab === 'COURIER_CLIENT' 
              ? 'bg-guepardo-accent border-guepardo-accent text-white shadow-lg' 
              : 'bg-white/5 border-white/5 text-white/40 hover:text-white hover:bg-white/10'
            }`}
          >
            <Bike size={14} /> Entregador x Cliente
          </button>
          <button
            onClick={() => setActiveTab('STORE_COURIER')}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border ${
              activeTab === 'STORE_COURIER' 
              ? 'bg-guepardo-accent border-guepardo-accent text-white shadow-lg' 
              : 'bg-white/5 border-white/5 text-white/40 hover:text-white hover:bg-white/10'
            }`}
          >
            <Store size={14} /> Loja x Entregador
          </button>
        </div>

        {/* MESSAGES AREA */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 bg-black/20 scrollbar-guepardo"
        >
          {currentMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20">
              <MessageSquare size={48} className="mb-4 text-white" />
              <p className="text-xs font-black uppercase tracking-widest text-white">Nenhuma mensagem ainda</p>
            </div>
          ) : (
            currentMessages.map((msg) => {
              const isMine = msg.senderType === 'STORE';
              return (
                <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl ${
                    isMine 
                    ? 'bg-guepardo-accent text-white rounded-tr-none shadow-lg' 
                    : 'bg-white/5 border border-white/5 text-white rounded-tl-none'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[8px] font-black uppercase tracking-tighter opacity-60">
                        {msg.senderName}
                      </span>
                    </div>
                    <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                  </div>
                  <span className="text-[8px] font-bold text-white/20 mt-1 uppercase">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* INPUT AREA */}
        <div className="p-6 bg-[#2D0F00]/40 border-t border-white/5">
          <div className="flex gap-3 bg-white/5 p-2 rounded-2xl border border-white/10 focus-within:border-guepardo-accent transition-colors">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Digite sua mensagem..."
              className="flex-1 bg-transparent border-none focus:outline-none text-sm font-medium text-white px-2"
            />
            <button
              onClick={handleSend}
              disabled={!message.trim()}
              className="p-3 bg-guepardo-accent rounded-xl text-white hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
