import { MorphicBackground } from '@/components/ui/morphic-background';

export function MorphicBackgroundDemo() {
  return (
    <div className="relative isolate min-h-[420px] overflow-hidden rounded-2xl">
      <MorphicBackground />
      <div className="relative z-10 p-10">Default morphic background</div>
    </div>
  );
}

export function HotpinkMorphicBackgroundDemo() {
  return (
    <div className="relative isolate min-h-[420px] overflow-hidden rounded-2xl">
      <MorphicBackground ballColor="hotpink" />
      <div className="relative z-10 p-10">Hotpink morphic background</div>
    </div>
  );
}
