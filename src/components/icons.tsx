import type { SVGProps } from "react";

export function AtomIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="1" />
      <path d="M20.2 20.2c2.04-2.03.02-5.91-4.3-9.c-4.32-3.08-8.2-1.06-10.24 1.0" />
      <path d="M3.8 3.8c-2.04 2.03-.02 5.91 4.3 9.c4.32 3.08 8.2 1.06 10.24-1.0" />
    </svg>
  );
}
