// src/components/ArrowTopRightOnSquareIcon.tsx
import type React from "react";
import { forwardRef } from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
	title?: string;
	titleId?: string;
}

const ArrowTopRightOnSquareIcon = forwardRef<SVGSVGElement, IconProps>(
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
					d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z"
					clipRule="evenodd"
				/>
				<path
					fillRule="evenodd"
					d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z"
					clipRule="evenodd"
				/>
			</svg>
		);
	},
);

ArrowTopRightOnSquareIcon.displayName = "ArrowTopRightOnSquareIcon";

export default ArrowTopRightOnSquareIcon;
