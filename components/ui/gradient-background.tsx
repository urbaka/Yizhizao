'use client';

import type React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type GradientBackgroundProps = React.ComponentProps<'div'> & {
  gradients?: string[];
  animationDuration?: number;
  animationDelay?: number;
  enableCenterContent?: boolean;
  overlay?: boolean;
  overlayOpacity?: number;
};

const DEFAULT_GRADIENTS = [
  'linear-gradient(135deg, #2d1b69 0%, #11998e 100%)',
  'linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)',
  'linear-gradient(135deg, #0f3460 0%, #e94560 100%)',
  'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
  'linear-gradient(135deg, #2d1b69 0%, #11998e 100%)',
];

export function GradientBackground({
  children,
  className,
  gradients = DEFAULT_GRADIENTS,
  animationDuration = 8,
  animationDelay = 0.5,
  enableCenterContent = true,
  overlay = false,
  overlayOpacity = 0.3,
  ...props
}: GradientBackgroundProps) {
  const prefersReducedMotion = useReducedMotion();
  const gradientFrames = gradients.length > 0 ? gradients : DEFAULT_GRADIENTS;

  return (
    <div
      className={cn('relative min-h-screen w-full overflow-hidden', className)}
      {...props}
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        initial={false}
        style={{ background: gradientFrames[0] }}
        animate={
          prefersReducedMotion ? { background: gradientFrames[0] } : { background: gradientFrames }
        }
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : {
                delay: animationDelay,
                duration: animationDuration,
                repeat: Number.POSITIVE_INFINITY,
                ease: 'easeInOut',
              }
        }
      />

      {overlay && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      )}

      {children && (
        <div
          className={cn(
            'relative z-10 min-h-screen',
            enableCenterContent && 'flex items-center justify-center',
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export default GradientBackground;
