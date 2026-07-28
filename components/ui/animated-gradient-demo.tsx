import { AnimatedGradient } from '@/components/ui/animated-gradient';

export default function AnimatedGradientDemo() {
  return (
    <div className="relative h-[420px] w-full max-w-2xl overflow-hidden rounded-xl">
      <AnimatedGradient config={{ preset: 'Aurora' }} radius="12px" />
      <div className="relative z-10 flex h-full items-center justify-center text-5xl font-semibold text-white">
        Animated Gradient
      </div>
    </div>
  );
}
