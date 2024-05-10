// src/components/StatsDashboard.tsx
import type React from "react";
import { useState, useEffect } from "react";

interface Stats {
	servers: number;
	memberCount: number;
	messagesCount: number;
}

interface StatsDashboardProps {
	PUBLIC_API: string;
}

const StatsDashboard: React.FC<StatsDashboardProps> = ({ PUBLIC_API }) => {
	const [stats, setStats] = useState<Stats>({
		servers: 12317,
		memberCount: 582628640,
		messagesCount: 3331730937,
	});
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchStats = async () => {
			try {
				const response = await fetch(`${PUBLIC_API}/etc/stats`, {
					credentials: "include",
				});
				if (response.ok) {
					const data = await response.json();
					setStats(data);
				} else {
					throw new Error(`Failed with status code ${response.status}`);
				}
			} catch (error) {
				console.error(`Failed to fetch stats: ${error}`);
				setError("Failed to load stats.");
			}
		};

		fetchStats();
	}, [PUBLIC_API]);

	return (
		<div className="bg-white py-9 sm:py-12">
			<div className="mx-auto max-w-7xl px-9 lg:px-12 justify-center">
				{error ? (
					<div className="text-center text-red-500">{error}</div>
				) : (
					<dl className="grid grid-cols-1 gap-y-16 gap-x-8 text-center lg:grid-cols-3">
						<div className="mx-auto flex max-w-xs flex-col gap-y-4">
							<dt className="text-base leading-7 text-gray-600">
								Servers being tracked
							</dt>
							<dd className="order-first text-3xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
								{stats.servers.toLocaleString()}
							</dd>
						</div>
						<div className="mx-auto flex max-w-xs flex-col gap-y-4">
							<dt className="text-base leading-7 text-gray-600">
								Approximate users being tracked
							</dt>
							<dd className="order-first text-3xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
								{stats.memberCount.toLocaleString()}
							</dd>
						</div>
						<div className="mx-auto flex max-w-xs flex-col gap-y-4">
							<dt className="text-base leading-7 text-gray-600">
								Messages logged
							</dt>
							<dd className="order-first text-3xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
								{stats.messagesCount.toLocaleString()}
							</dd>
						</div>
					</dl>
				)}
			</div>
		</div>
	);
};

export default StatsDashboard;
