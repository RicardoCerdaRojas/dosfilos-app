import { motion } from 'framer-motion';

/**
 * Hero illustration for the welcome step: an open book + desk lamp on a desk
 * with a soft halo. Rendered as inline SVG so it inherits `currentColor` tokens
 * and respects the active theme (light/dark + color theme). Subtle floating
 * + glow animations driven by Framer Motion.
 */
export function WelcomeIllustration() {
    return (
        <div className="relative w-full h-full flex items-center justify-center">
            {/* Ambient halo behind the desk */}
            <motion.div
                aria-hidden
                className="absolute inset-0 bg-gradient-radial from-primary/20 via-primary/5 to-transparent rounded-full"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />

            <motion.svg
                viewBox="0 0 400 320"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="relative w-full max-w-md text-foreground"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
            >
                {/* Desk surface */}
                <motion.rect
                    x="20"
                    y="240"
                    width="360"
                    height="14"
                    rx="2"
                    className="fill-foreground/10"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    style={{ transformOrigin: 'center' }}
                />
                <rect x="20" y="254" width="360" height="6" rx="2" className="fill-foreground/5" />

                {/* Lamp arm + base */}
                <motion.g
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                >
                    <rect x="60" y="180" width="40" height="6" rx="2" className="fill-foreground/30" />
                    <rect x="74" y="100" width="6" height="84" className="fill-foreground/30" />
                    <path d="M77 100 Q120 80 150 110" stroke="currentColor" className="text-foreground/30" strokeWidth="6" fill="none" strokeLinecap="round" />
                    {/* Lamp shade */}
                    <path d="M140 95 L175 95 L165 130 L150 130 Z" className="fill-foreground/40" />
                </motion.g>

                {/* Lamp light cone — animated glow */}
                <motion.path
                    d="M148 130 L210 250 L105 250 Z"
                    className="fill-primary/15"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.4, 0.7, 0.4] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
                />

                {/* Open book */}
                <motion.g
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                >
                    {/* Left page */}
                    <path d="M150 200 L150 240 L200 245 L200 205 Z" className="fill-card stroke-foreground/20" strokeWidth="1.5" />
                    {/* Right page */}
                    <path d="M200 205 L200 245 L250 240 L250 200 Z" className="fill-card stroke-foreground/20" strokeWidth="1.5" />
                    {/* Spine */}
                    <line x1="200" y1="205" x2="200" y2="245" className="stroke-foreground/30" strokeWidth="1" />
                    {/* Text lines on left page */}
                    <line x1="160" y1="215" x2="195" y2="216" className="stroke-foreground/30" strokeWidth="1" strokeLinecap="round" />
                    <line x1="160" y1="222" x2="190" y2="223" className="stroke-foreground/30" strokeWidth="1" strokeLinecap="round" />
                    <line x1="160" y1="229" x2="195" y2="230" className="stroke-foreground/30" strokeWidth="1" strokeLinecap="round" />
                    {/* Text lines on right page */}
                    <line x1="205" y1="215" x2="240" y2="216" className="stroke-foreground/30" strokeWidth="1" strokeLinecap="round" />
                    <line x1="205" y1="222" x2="245" y2="223" className="stroke-foreground/30" strokeWidth="1" strokeLinecap="round" />
                    <line x1="205" y1="229" x2="240" y2="230" className="stroke-foreground/30" strokeWidth="1" strokeLinecap="round" />
                </motion.g>

                {/* Coffee mug */}
                <motion.g
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                >
                    <rect x="290" y="210" width="32" height="30" rx="2" className="fill-primary/80" />
                    <path d="M322 218 Q335 220 335 228 Q335 236 322 232" stroke="currentColor" className="text-primary/80" strokeWidth="3" fill="none" />
                    {/* Steam */}
                    <motion.g
                        animate={{ y: [0, -4, 0], opacity: [0.3, 0.7, 0.3] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        <path d="M298 208 Q300 200 298 195" stroke="currentColor" className="text-foreground/30" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                        <path d="M306 208 Q308 198 306 192" stroke="currentColor" className="text-foreground/30" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                        <path d="M314 208 Q316 200 314 195" stroke="currentColor" className="text-foreground/30" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    </motion.g>
                </motion.g>

                {/* Stack of books on right */}
                <motion.g
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.7 }}
                >
                    <rect x="260" y="210" width="22" height="30" rx="1" className="fill-success/70" />
                    <rect x="262" y="200" width="20" height="10" rx="1" className="fill-warning/70" />
                    <rect x="264" y="190" width="18" height="10" rx="1" className="fill-info/70" />
                </motion.g>
            </motion.svg>
        </div>
    );
}
