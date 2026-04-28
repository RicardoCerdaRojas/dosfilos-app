import { HTMLAttributes, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface RevealProps extends HTMLAttributes<HTMLDivElement> {
    /** Optional delay (ms) so consecutive reveals can stagger naturally. */
    delay?: number;
}

/**
 * Intersection-observer based fade-up reveal. Used throughout the landing
 * page to softly animate sections as they scroll into view.
 *
 * Respects `prefers-reduced-motion` — when the user disables animations the
 * content renders immediately without transition.
 */
export function Reveal({ children, delay = 0, className, ...rest }: RevealProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setVisible(true);
            return;
        }
        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    io.disconnect();
                }
            },
            { threshold: 0.1, rootMargin: '0px 0px -80px 0px' }
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className={cn(
                'transition-all duration-[900ms] ease-out',
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
                className
            )}
            style={{ transitionDelay: `${delay}ms` }}
            {...rest}
        >
            {children}
        </div>
    );
}
