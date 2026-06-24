"use client";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Plus, MessageSquare, ChevronRight } from "lucide-react";

export function ConversationList() {
  const conversations: { id: string; title: string; date: string; count: number }[] = [];

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton tooltip="New conversation" variant="outline" className="mb-2">
          <Plus className="size-4" />
          <span>New Chat</span>
        </SidebarMenuButton>
      </SidebarMenuItem>

      {conversations.length === 0 ? (
        <div className="px-3 py-6 text-center text-sm text-sidebar-foreground/40 leading-relaxed group-data-[collapsible=icon]:hidden">
          <span className="block text-lg mb-1">💬</span>
          No conversations yet
        </div>
      ) : (
        conversations.map((conv) => (
          <SidebarMenuItem key={conv.id}>
            <SidebarMenuButton tooltip={conv.title}>
              <MessageSquare className="size-4" />
              <div className="flex flex-1 flex-col items-start min-w-0">
                <span className="truncate text-sm font-medium">{conv.title}</span>
                <span className="text-xs text-sidebar-foreground/50 truncate">
                  {conv.date} · {conv.count} msgs
                </span>
              </div>
              <ChevronRight className="size-3 ml-auto text-sidebar-foreground/40" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))
      )}
    </SidebarMenu>
  );
}