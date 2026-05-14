import { useEffect, useRef } from 'react';

/**
 * Sticky-bottom scroll behavior for the Faculty chat. Mirrors the
 * pattern most chat UIs ship: auto-scroll to bottom when new
 * messages arrive UNLESS the user scrolled up to read history (then
 * we hold position so a new chunk doesn't yank them).
 *
 * Returns refs to attach to the scroll container + bottom sentinel,
 * plus an imperative `scrollToBottom(force)` for explicit triggers
 * (e.g. after the user sends their own message — they expect to see
 * the bottom regardless of prior scroll position).
 *
 * `dependencies` is the value(s) you want to trigger auto-scroll on
 * — typically the streaming chunk + the materialized message list.
 */
export function useAutoscrollChat(dependencies: ReadonlyArray<unknown>) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatScrollRef = useRef<HTMLDivElement>(null);
    const userScrolledUp = useRef(false);

    const scrollToBottom = (force = false) => {
        const container = chatScrollRef.current;
        if (!container) return;
        if (force || !userScrolledUp.current) {
            // Forced scroll resets the follow flag too — the user just
            // sent a message, so we want to resume auto-following the
            // stream regardless of where they had scrolled to before.
            if (force) userScrolledUp.current = false;
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Track whether the user has scrolled up — once they're more than
    // 150px from the bottom we stop auto-following so they can read
    // back through messages without the page yanking on every chunk.
    useEffect(() => {
        const container = chatScrollRef.current;
        if (!container) return;
        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            userScrolledUp.current = (scrollHeight - scrollTop - clientHeight) > 150;
        };
        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        scrollToBottom();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, dependencies);

    return { messagesEndRef, chatScrollRef, scrollToBottom };
}
