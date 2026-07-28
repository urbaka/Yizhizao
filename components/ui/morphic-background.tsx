"use client";

import { useEffect, useId, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface MorphicBackgroundProps {
  ballColor?: string;
  fixed?: boolean;
  className?: string;
}

interface BlobMotion {
  size: string;
  left: string;
  top: string;
  opacity: number;
  phase: number;
  speedX: number;
  speedY: number;
  rangeX: number;
  rangeY: number;
  stretch: number;
}

const BLOBS: BlobMotion[] = [
  {
    size: 'clamp(18rem, 38vw, 42rem)',
    left: '-8%',
    top: '-16%',
    opacity: 0.66,
    phase: 0.3,
    speedX: 0.085,
    speedY: 0.067,
    rangeX: 0.18,
    rangeY: 0.15,
    stretch: 0.13,
  },
  {
    size: 'clamp(15rem, 32vw, 36rem)',
    left: '28%',
    top: '-10%',
    opacity: 0.58,
    phase: 1.8,
    speedX: 0.072,
    speedY: 0.094,
    rangeX: 0.15,
    rangeY: 0.2,
    stretch: 0.16,
  },
  {
    size: 'clamp(20rem, 42vw, 48rem)',
    left: '62%',
    top: '4%',
    opacity: 0.56,
    phase: 3.5,
    speedX: 0.061,
    speedY: 0.078,
    rangeX: 0.2,
    rangeY: 0.16,
    stretch: 0.12,
  },
  {
    size: 'clamp(16rem, 34vw, 38rem)',
    left: '2%',
    top: '56%',
    opacity: 0.54,
    phase: 4.7,
    speedX: 0.091,
    speedY: 0.058,
    rangeX: 0.17,
    rangeY: 0.18,
    stretch: 0.15,
  },
  {
    size: 'clamp(19rem, 40vw, 44rem)',
    left: '38%',
    top: '48%',
    opacity: 0.62,
    phase: 5.9,
    speedX: 0.055,
    speedY: 0.088,
    rangeX: 0.16,
    rangeY: 0.2,
    stretch: 0.14,
  },
  {
    size: 'clamp(14rem, 30vw, 34rem)',
    left: '76%',
    top: '66%',
    opacity: 0.5,
    phase: 2.6,
    speedX: 0.098,
    speedY: 0.064,
    rangeX: 0.19,
    rangeY: 0.14,
    stretch: 0.17,
  },
];

export function MorphicBackground({
  ballColor = '#4f46e5',
  fixed = false,
  className,
}: MorphicBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const blobRefs = useRef<Array<HTMLDivElement | null>>([]);
  const dimensionsRef = useRef({ width: 0, height: 0 });
  const filterId = `morphic-goo-${useId().replace(/:/g, '')}`;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let frameId: number | null = null;
    let startTime = performance.now();
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updateDimensions = () => {
      dimensionsRef.current = {
        width: container.clientWidth,
        height: container.clientHeight,
      };
    };

    const renderFrame = (elapsedSeconds: number, movementScale: number) => {
      const { width, height } = dimensionsRef.current;

      BLOBS.forEach((blob, index) => {
        const element = blobRefs.current[index];
        if (!element) return;

        const secondaryPhase = blob.phase * 1.73 + index * 0.41;
        const x =
          (Math.sin(elapsedSeconds * blob.speedX + blob.phase) +
            Math.sin(elapsedSeconds * blob.speedX * 0.43 + secondaryPhase) * 0.34) *
          width *
          blob.rangeX *
          movementScale;
        const y =
          (Math.cos(elapsedSeconds * blob.speedY + secondaryPhase) +
            Math.sin(elapsedSeconds * blob.speedY * 0.57 + blob.phase) * 0.28) *
          height *
          blob.rangeY *
          movementScale;
        const stretchWave =
          Math.sin(elapsedSeconds * (blob.speedX + blob.speedY) * 0.78 + blob.phase) *
          blob.stretch *
          movementScale;
        const breathe =
          1 + Math.cos(elapsedSeconds * blob.speedY * 0.66 + secondaryPhase) * 0.055 * movementScale;
        const rotate =
          Math.sin(elapsedSeconds * blob.speedX * 0.52 + blob.phase) * 18 * movementScale;

        element.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${rotate.toFixed(2)}deg) scale(${(breathe + stretchWave).toFixed(4)}, ${(breathe - stretchWave).toFixed(4)})`;
      });
    };

    const animate = (now: number) => {
      renderFrame((now - startTime) / 1000, 1);
      frameId = requestAnimationFrame(animate);
    };

    const syncAnimationPreference = () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }

      if (motionPreference.matches) {
        renderFrame(0, 0);
        return;
      }

      startTime = performance.now();
      frameId = requestAnimationFrame(animate);
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
      if (motionPreference.matches) renderFrame(0, 0);
    });
    resizeObserver.observe(container);
    motionPreference.addEventListener('change', syncAnimationPreference);
    syncAnimationPreference();

    return () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      motionPreference.removeEventListener('change', syncAnimationPreference);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      data-morphic-background=""
      aria-hidden="true"
      className={cn(
        fixed ? 'fixed' : 'absolute',
        'pointer-events-none inset-0 -z-10 overflow-hidden bg-slate-50',
        className,
      )}
    >
      <svg className="absolute size-0" focusable="false">
        <defs>
          <filter
            id={filterId}
            x="-45%"
            y="-45%"
            width="190%"
            height="190%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="30" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10"
              result="goo"
            />
          </filter>
        </defs>
      </svg>

      <div
        className="absolute -inset-[24%] transform-gpu"
        style={{ filter: `url(#${filterId})`, WebkitFilter: `url(#${filterId})` }}
      >
        {BLOBS.map((blob, index) => (
          <div
            key={`${blob.left}-${blob.top}`}
            ref={(element) => {
              blobRefs.current[index] = element;
            }}
            className="absolute aspect-square rounded-full will-change-transform"
            style={{
              width: blob.size,
              left: blob.left,
              top: blob.top,
              opacity: blob.opacity,
              backgroundColor: ballColor,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default MorphicBackground;
