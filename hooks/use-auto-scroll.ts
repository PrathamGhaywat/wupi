"use client";

import { useRef, useState, useCallback, useEffect } from "react";

const SCROLL_TOLERANCE = 100;

export function useAutoScroll(deps: unknown[]) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const rafRef = useRef<number | null>(null);

  const checkIsAtBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_TOLERANCE;
  }, []);

  const scrollToBottom = useCallback((smooth: boolean) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  const handleScroll = useCallback(() => {
    const atBottom = checkIsAtBottom();
    isAtBottomRef.current = atBottom;
    setShowScrollButton(!atBottom);
  }, [checkIsAtBottom]);

  const onScrollButtonClick = useCallback(() => {
    scrollToBottom(true);
    isAtBottomRef.current = true;
    setShowScrollButton(false);
  }, [scrollToBottom]);

  useEffect(() => {
    if (!isAtBottomRef.current) return;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      scrollToBottom(false);
      rafRef.current = null;
    });

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      if (!isAtBottomRef.current) return;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        scrollToBottom(false);
        rafRef.current = null;
      });
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [scrollToBottom]);

  return { scrollRef, handleScroll, showScrollButton, onScrollButtonClick };
}