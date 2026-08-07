import { cn } from "@/lib/utils";

interface ImsMarkProps {
  className?: string;
  title?: string;
}

/** Hexagonal cube mark used on the auth surfaces. */
export function ImsMark({ className, title }: ImsMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-8 w-8 text-accent", className)}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M16 3.5 27 9.5v13L16 28.5 5 22.5v-13L16 3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M16 3.5v25M5 9.5l11 6 11-6M5 22.5l11-6 11 6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        opacity="0.85"
      />
    </svg>
  );
}
