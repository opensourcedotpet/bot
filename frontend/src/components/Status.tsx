// src/components/StatusNotification.tsx
import type React from "react";
import { useState, useEffect } from "react";
import ArrowDownTrayIcon from "./ArrowDownTrayIcon";
import PlusIcon from "./PlusIcon";

interface StatusNotificationProps {
	statusAPI: string;
}

interface Status {
	id: string;
	attributes: {
		title: string;
	};
}

const StatusNotification: React.FC<StatusNotificationProps> = ({
	statusAPI,
}) => {
	const [status, setStatus] = useState<Status | null>(null);

	useEffect(() => {
		const fetchStatus = async () => {
			try {
				const response = await fetch(`${statusAPI}/etc/status`, {
					credentials: "include",
				});
				if (response.ok) {
					const data = await response.json();
					setStatus(data);
				} else {
					console.error(
						`Failed to fetch stats with status code ${response.status}`,
					);
				}
			} catch (error) {
				console.error(`Failed to fetch stats: ${error}`);
			}
		};

		fetchStatus();
	}, [statusAPI]);

	if (!status) return null;

	return (
		<div className="p-2 bg-red-500 text-white">
			<div className="flex items-center">
				<ArrowDownTrayIcon className="w-6 h-6 mx-3" />
				<div>
					<p className="text-xs">Spy.pet is having issues...</p>
					<p className="font-semibold mb-1">{status.attributes.title}</p>
				</div>
				<div className="ml-auto">
					<a
						href={`https://status.${window.location.hostname}/incident/${status.id}`}
						target="_blank"
						rel="noopener noreferrer"
						className="text-white underline"
					>
						<PlusIcon className="w-5 h-5 mr-3" />
					</a>
				</div>
			</div>
		</div>
	);
};

export default StatusNotification;
