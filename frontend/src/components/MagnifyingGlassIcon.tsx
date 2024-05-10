// src/components/MagnifyingGlassIcon.tsx
import type React from "react";
import { forwardRef } from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
	title?: string;
	titleId?: string;
}

const MagnifyingGlassIcon = forwardRef<SVGSVGElement, IconProps>(
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
				<path
					fillRule="evenodd"
					d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
					clipRule="evenodd"
				/>
			</svg>
		);
	},
);

MagnifyingGlassIcon.displayName = "MagnifyingGlassIcon";

export default MagnifyingGlassIcon;
