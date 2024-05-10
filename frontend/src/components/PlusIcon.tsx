// src/components/PlusIcon.tsx
import type React from "react";
import { forwardRef } from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
    title?: string;
    titleId?: string;
}

const PlusIcon = forwardRef<SVGSVGElement, IconProps>(
    ({ title, titleId, ...props }, ref) => {
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
                ref={ref}
                aria-labelledby={titleId}
                {...props}
            >
                {title ? <title id={titleId}>{title}</title> : null}
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
        );
    }
);

PlusIcon.displayName = "PlusIcon";

export default PlusIcon;