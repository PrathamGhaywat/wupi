"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Settings, MessageSquare, History } from "lucide-react";
import { ConversationList } from "./ConversationList";
import { ThemeToggle } from "./ThemeToggle";

interface AppSidebarProps {
  onSettingsClick: () => void;
}

export function AppSidebar({
  onSettingsClick,
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="px-4 pt-4 pb-2 group-data-[collapsible=icon]:p-2">
        <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center" data-sidebar-item>
          <SidebarTrigger className="size-8 [&_svg]:size-4" />
          <span className="font-semibold text-base tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            Wupi
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[0.6875rem] tracking-wide uppercase text-sidebar-foreground/40 font-medium px-3 py-1.5">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Chat" isActive>
                  <MessageSquare className="size-4" />
                  <span>Chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="History">
                  <History className="size-4" />
                  <span>History</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[0.6875rem] tracking-wide uppercase text-sidebar-foreground/40 font-medium px-3 py-1.5">Conversations</SidebarGroupLabel>
          <SidebarGroupContent>
            <ConversationList />
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="flex-1" />

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent className="flex flex-col pb-4">
            <ThemeToggle />
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Settings"
                  onClick={onSettingsClick}
                >
                  <Settings className="size-4" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}