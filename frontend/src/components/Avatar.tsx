import { cn } from "../utils/cn";

interface AvatarProps {
  name?: string;
  src?: string;
  size?: "sm" | "md" | "lg" | "xl";
  online?: boolean;
  className?: string;
}

const sizes = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-20 h-20 text-2xl",
};

const dotSizes = {
  sm: "w-2 h-2",
  md: "w-2.5 h-2.5",
  lg: "w-3 h-3",
  xl: "w-4 h-4",
};

export default function Avatar({ name, src, size = "md", online, className }: AvatarProps) {
  const initials = name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

  return (
    <div className={cn("relative shrink-0", className)}>
      {src ? (
        <img src={src} alt={name} className={cn("rounded-full object-cover", sizes[size])} />
      ) : (
        <div
          className={cn(
            "rounded-full flex items-center justify-center font-semibold text-white",
            sizes[size],
            "bg-gradient-to-br from-noris-400 to-noris-600"
          )}
        >
          {initials}
        </div>
      )}
      {online && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full bg-green-500 border-2 border-white dark:border-[#17212b] online-pulse",
            dotSizes[size]
          )}
        />
      )}
    </div>
  );
}
