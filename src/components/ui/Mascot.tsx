import { cn } from '../../utils/cn';

interface MascotProps {
  className?: string;
  isThinking?: boolean;
}

export function Mascot({ className, isThinking }: MascotProps) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl",
      className,
      isThinking && "animate-bounce"
    )}>
      <img
        src="/mascot.svg"
        alt="FINSURF Mascot"
        className="w-full h-full object-contain transition-all duration-500"
      />
    </div>
  );
}