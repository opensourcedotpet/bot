// src/components/Header.jsx
import React from "react";

export default function Header() {
	return (
		<header className="z-50 w-full">
			<nav
				className="flex justify-between items-center mx-auto p-6 max-w-7xl lg:px-8"
				aria-label="Global"
			>
				<div className="flex lg:flex-1">
					<a href="/" className="-m-1.5 p-1.5">
						<span className="sr-only">opensource.pet</span>
						<img
							className="h-8 w-auto"
							src="/favicon-black.svg"
							alt="opensource.pet logo"
						/>
					</a>
				</div>
				<div className="flex lg:hidden">
					<button
						type="button"
						className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
					>
						<span className="sr-only">Open main menu</span>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth="1.5"
							stroke="currentColor"
							aria-hidden="true"
							className="h-6 w-6"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
							/>
						</svg>
					</button>
				</div>
				<div className="hidden lg:flex flex-grow justify-center items-center space-x-12">
					<a
						href="/servers"
						className="text-sm font-semibold leading-6 text-gray-900"
					>
						Servers
					</a>
					<a
						href="/users"
						className="text-sm font-semibold leading-6 text-gray-900"
					>
						Users
					</a>
					<a
						href="/emojis"
						className="text-sm font-semibold leading-6 text-gray-900"
					>
						Emojis
					</a>
					<a
						href="/bans"
						className="text-sm font-semibold leading-6 text-gray-900"
					>
						Bans
					</a>
				</div>
			</nav>
		</header>
	);
}
