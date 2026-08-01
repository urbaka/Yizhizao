import { GradientBackground } from '@/components/ui/gradient-background';

export function GradientBackgroundDemo() {
  return (
    <GradientBackground className="flex min-h-[100dvh] items-center justify-center">
      <div className="space-y-6 px-4 text-center text-white">
        <h1 className="text-4xl font-extrabold md:text-5xl">
          Animated Gradients Background
        </h1>
      </div>
    </GradientBackground>
  );
}

export default GradientBackgroundDemo;
