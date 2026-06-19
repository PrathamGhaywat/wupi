"use client";

import { useState } from "react";
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
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Settings, MessageSquare, History, Plus } from "lucide-react";
import { ConversationList } from "./ConversationList";
import { ModelPicker } from "./ModelPicker";
import { ThemeToggle } from "./ThemeToggle";
import type { WupiModelInfo } from "@/app/types";

interface AppSidebarProps {
  models: WupiModelInfo[];
  currentModel: string;
  onModelChange: (provider: string, modelId: string) => void;
  disabled: boolean;
  onSettingsClick: () => void;
}

export function AppSidebar({
  models,
  currentModel,
  onModelChange,
  disabled,
  onSettingsClick,
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2" data-sidebar-item>
          <SidebarTrigger className="size-8" />
          <span className="font-semibold text-lg text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            Wupi
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
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
          <SidebarGroupLabel>Models</SidebarGroupLabel>
          <SidebarGroupContent>
            <ModelPicker
              models={models}
              currentModel={currentModel}
              onModelChange={onModelChange}
              disabled={disabled}
            />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Conversations</SidebarGroupLabel>
          <SidebarGroupContent>
            <ConversationList />
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="flex-1" />

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent className="flex flex-col gap-2 px-3 pb-4">
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