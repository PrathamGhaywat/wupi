"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

interface ConversationListProps {
  currentSessionFile?: string;
  onSessionSwitch?: (sessionFile: string) => void;
}

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;

  const date = new Date(ms);
  const nowYear = new Date().getFullYear();
  if (date.getFullYear() === nowYear) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ConversationList({ currentSessionFile, onSessionSwitch }: ConversationListProps) {
  const [sessions, setSessions] = useState<WupiSessionInfo[]>([]);
  const [contextFile, setContextFile] = useState<string | null>(null);
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  function unwrapSessionList(result: unknown): WupiSessionInfo[] {
    if (Array.isArray(result)) return result;
    if (result && typeof result === "object" && "sessions" in result && Array.isArray((result as { sessions: unknown }).sessions))
      return (result as { sessions: WupiSessionInfo[] }).sessions;
    return [];
  }

  const refresh = useCallback(async () => {
    try {
      const result = await window.electronAPI.sessionList();
      setSessions(unwrapSessionList(result));
    } catch (e) {
      console.error("sessionList failed:", e);
    }
  }, []);

  useEffect(() => {
    refresh();
    window.electronAPI.onAgentState(refresh);
  }, [refresh]);

  useEffect(() => {
    if (renamingFile) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renamingFile]);

  async function handleSwitch(sessionFile: string) {
    await window.electronAPI.sessionSwitch(sessionFile);
    onSessionSwitch?.(sessionFile);
  }

  async function handleNew() {
    const res = await window.electronAPI.sessionCreate();
    if (res.ok) {
      const list = unwrapSessionList(await window.electronAPI.sessionList());
      setSessions(list);
      if (list.length > 0) {
        onSessionSwitch?.(list[0].sessionFile);
      }
    }
  }

  function startRename(file: string) {
    const session = sessions.find((s) => s.sessionFile === file);
    setRenamingFile(file);
    setRenameValue(session?.title ?? "");
    setContextFile(null);
  }

  async function finishRename() {
    if (renamingFile && renameValue.trim()) {
      await window.electronAPI.sessionRename(renamingFile, renameValue.trim());
      refresh();
    }
    setRenamingFile(null);
    setRenameValue("");
  }

  function confirmDelete(file: string) {
    setDeleteTarget(file);
    setContextFile(null);
  }

  async function executeDelete() {
    if (!deleteTarget) return;
    await window.electronAPI.sessionDelete(deleteTarget);
    setDeleteTarget(null);
    refresh();
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton tooltip="New conversation" variant="outline" className="mb-2" onClick={handleNew}>
            <Plus className="size-4" />
            <span>New Chat</span>
          </SidebarMenuButton>
        </SidebarMenuItem>

        {sessions.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-sidebar-foreground/40 leading-relaxed group-data-[collapsible=icon]:hidden">
            <span className="block text-lg mb-1">💬</span>
            No conversations yet
          </div>
        ) : (
          sessions.map((s) => (
            <SidebarMenuItem key={s.sessionFile}>
              <div className="relative group">
                <DropdownMenu
                  open={contextFile === s.sessionFile}
                  onOpenChange={(open) => { if (!open) setContextFile(null); }}
                >
                  <div
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextFile(s.sessionFile);
                    }}
                  >
                    <SidebarMenuButton
                      onClick={() => handleSwitch(s.sessionFile)}
                      isActive={s.sessionFile === currentSessionFile}
                      tooltip={s.title}
                    >
                      <MessageSquare className="size-4 shrink-0" />
                      <div className="flex flex-1 flex-col items-start min-w-0">
                        {renamingFile === s.sessionFile ? (
                          <Input
                            ref={renameInputRef}
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={finishRename}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") finishRename();
                              if (e.key === "Escape") setRenamingFile(null);
                              e.stopPropagation();
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="h-6 px-1 py-0 text-sm rounded-sm"
                          />
                        ) : (
                          <span className="truncate text-sm font-medium max-w-full">
                            {s.title.length > 50 ? `${s.title.slice(0, 50)}…` : s.title}
                          </span>
                        )}
                        {renamingFile !== s.sessionFile && (
                          <span className="text-xs text-sidebar-foreground/50 truncate max-w-full">
                            {relativeTime(s.createdAt)}
                            {s.messageCount > 0 && ` · ${s.messageCount} msgs`}
                            {s.modelName && ` · ${s.modelName}`}
                          </span>
                        )}
                      </div>
                    </SidebarMenuButton>
                  </div>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={() => setContextFile(s.sessionFile)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 flex size-5 items-center justify-center rounded-sm opacity-0 group-hover:opacity-100 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="size-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={4}>
                    <DropdownMenuItem onClick={() => startRename(s.sessionFile)}>
                      <Pencil className="size-3.5" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => confirmDelete(s.sessionFile)}>
                      <Trash2 className="size-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </SidebarMenuItem>
          ))
        )}
      </SidebarMenu>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={executeDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
