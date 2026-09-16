'use client';

import { useAppStore } from '@/lib/store';
import { MessageSquare, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CustomerMessagesPage() {
  const { currentUser } = useAppStore();

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 bg-background p-6 md:p-8">
      <div>
        <h1 className="font-bar text-2xl font-semibold tracking-tight text-foreground">
          Messages
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Chat with the salon concierge about appointments, billing, and pet care.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden flex flex-col h-[calc(100vh-200px)]">
        {/* Chat header */}
        <div className="bg-muted/40 border-b border-border px-4 py-3 flex items-center gap-3">
          <div className="size-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
            <MessageSquare className="size-4" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-foreground">Salon Concierge</p>
            <p className="text-[11px] text-success">Online</p>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          <div className="flex justify-start">
            <div className="max-w-[70%] bg-muted rounded-lg px-4 py-2.5 text-[13px] text-foreground">
              Hi {currentUser?.name?.split(' ')[0] || 'there'}! Welcome to All About Pawz. How can we help you today?
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[70%] bg-muted rounded-lg px-4 py-2.5 text-[13px] text-foreground">
              You can ask about appointments, pricing, your pet's grooming history, or billing questions.
            </div>
          </div>
        </div>

        {/* Input area */}
        <div className="border-t border-border p-3 flex items-center gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 h-9 bg-background border border-input rounded-md px-3 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button className="inline-flex items-center justify-center size-9 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer">
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
