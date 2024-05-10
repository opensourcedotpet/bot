// src/components/UsernameSearchForm.tsx
import type React from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import MagnifyingGlassIcon from "./MagnifyingGlassIcon";

interface UsernameSearchFormProps {
	error?: string;
}

const UsernameSearchForm: React.FC<UsernameSearchFormProps> = ({ error }) => {
	return (
		<>
			<div className="flex min-h-full items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
				<div className="w-full max-w-md space-y-2">
					<div>
						<h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
							Discover users by their username
						</h2>
					</div>
					<form id="form" className="mt-8 space-y-2" method="POST">
						{error && <p className="text-red-500 text-center">{error}</p>}
						<div className="-space-y-px rounded-md shadow-sm">
							<div>
								<label htmlFor="username">Username:</label>
								<input
									id="username"
									name="username"
									type="text"
									required
									className="relative block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
								/>
							</div>
						</div>
						<Turnstile
							siteKey="0x4AAAAAAAZ3L1iwSdM__C5f" // Replace with your actual sitekey
						/>
						<div>
							<button
								type="submit"
								className="group relative flex w-full justify-center rounded-md bg-indigo-600 py-2 px-3 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
							>
								<span className="absolute inset-y-0 left-0 flex items-center pl-3">
									<MagnifyingGlassIcon
										className="h-5 w-5 text-indigo-500 group-hover:text-indigo-400"
										aria-hidden="true"
									/>
								</span>
								Search
							</button>
						</div>
					</form>
				</div>
			</div>
		</>
	);
};

export default UsernameSearchForm;
