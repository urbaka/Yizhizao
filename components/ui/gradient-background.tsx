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
  'linear-gradient(135deg, #eef3f7 0%, #e6eef2 52%, #dfeceb 100%)',
  'linear-gradient(135deg, #edf2f6 0%, #e3ebf2 48%, #e2efec 100%)',
  'linear-gradient(135deg, #f0f4f7 0%, #e4edf0 56%, #dce9e7 100%)',
  'linear-gradient(135deg, #eef3f6 0%, #e7edf3 44%, #dfecea 100%)',
  'linear-gradient(135deg, #eef3f7 0%, #e6eef2 52%, #dfeceb 100%)',
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
      className={cn('relative min-h-[100dvh] w-full overflow-hidden', className)}
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
            'relative z-10 min-h-[100dvh]',
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
