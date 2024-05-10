import { Client } from "discord.js-selfbot-v13";
import path from "node:path";
import fs from "node:fs";
import readline from "node:readline";

const client = new Client();
const GUILD_IDS = new Set<string>();
let latestStats = {
	servers: 0,
	allServers: 0,
	memberCount: 0,
	messagesCount: 0,
	emojis: 0,
}; // Assuming messages count is also tracked somewhere

async function loadGuildIdsFromFile() {
	const serversFilePath = path.join(
		__dirname,
		"..",
		"frontend",
		"src",
		"api",
		"servers.js",
	);
	try {
		const { serversData } = await import(
			`${serversFilePath}?update=${Date.now()}`
		);
		for (const server of serversData) {
			GUILD_IDS.add(server.id);
		}
	} catch (error) {
		console.error(`Error loading servers file: ${error}`);
	}
}

function writeGuildsToFile(client: Client) {
	const serversFilePath = path.join(
		__dirname,
		"..",
		"frontend",
		"src",
		"data",
		"servers.js",
	);
	const guildsData = Array.from(client.guilds.cache.values())
		.filter((guild) => GUILD_IDS.has(guild.id))
		.map((guild) => ({
			id: guild.id,
			name: guild.name,
			icon:
				guild.iconURL({ format: "webp", size: 128 }) || "default_icon_url_here",
		}));

	const moduleContent = `// src/data/servers.js\nexport const serversData = ${JSON.stringify(
		guildsData,
		null,
		2,
	)};`;

	const directoryPath = path.join(__dirname, "..", "frontend", "src", "data");
	if (!fs.existsSync(directoryPath)) {
		fs.mkdirSync(directoryPath, { recursive: true });
	}

	fs.writeFileSync(serversFilePath, moduleContent);
	console.log(`Guilds data written to ${serversFilePath}`);
}

async function calculateTotalUsers() {
	let totalUsers = 0;
	for (const guildId of GUILD_IDS) {
		const guild = client.guilds.cache.get(guildId);
		if (guild) {
			try {
				const fetchedGuild = await guild.fetch();
				totalUsers += fetchedGuild.memberCount;
			} catch (error) {
				console.error(`Failed to fetch server ${guildId}:`, error);
			}
		} else {
			console.log(`Server with ID ${guildId} not found.`);
		}
	}
	return totalUsers;
}

async function updateStats() {
	const totalUsers = await calculateTotalUsers();
	latestStats = {
		servers: GUILD_IDS.size,
		allServers: 0,
		memberCount: totalUsers,
		messagesCount: 0,
		emojis: 0,
	}; // Update messagesCount accordingly
	writeStatsToFile();
	console.log(`Updated stats emitted: ${JSON.stringify(latestStats)}`);
}

function writeStatsToFile() {
	const statsFilePath = path.join(
		__dirname,
		"..",
		"frontend",
		"src",
		"api",
		"etc",
		"stats.json",
	);
	const statsContent = `
	{
		"servers": "${latestStats.servers}",
		"allServers": "${latestStats.allServers}",
		"memberCount": "${latestStats.memberCount}",
		"messagesCount": "${latestStats.messagesCount}",
		"emojis": "${latestStats.emojis}"
	}
`;

	fs.writeFileSync(statsFilePath, statsContent);
	console.log(`Stats data written to ${statsFilePath}`);
}

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

rl.on("line", async (input) => {
	const [command, ...args] = input.trim().split(" ");
	switch (command) {
		case "add":
			if (args[0] === "server" && args[1]) {
				const serverId = args[1];
				if (!GUILD_IDS.has(serverId)) {
					GUILD_IDS.add(serverId);
					await updateStats();
					writeGuildsToFile(client);
					console.log(`Server ${serverId} added.`);
				} else {
					console.log(`Server ${serverId} is already in the list.`);
				}
			} else {
				console.log("Usage: add server [serverId]");
			}
			break;
		case "remove":
			if (args[0] === "server" && args[1]) {
				const serverId = args[1];
				if (GUILD_IDS.delete(serverId)) {
					await updateStats();
					writeGuildsToFile(client);
					console.log(`Server ${serverId} removed.`);
				} else {
					console.log(`Server ${serverId} not found.`);
				}
			} else {
				console.log("Usage: remove server [serverId]");
			}
			break;
		default:
			console.log(
				"Unknown command. Available commands: add server [serverId], remove server [serverId]",
			);
			break;
	}
});

client.on("ready", async () => {
	console.log(`Logged in as ${client.user?.tag}!`);
	await loadGuildIdsFromFile();
	await updateStats();
	writeGuildsToFile(client);
});

export { client, updateStats, GUILD_IDS, latestStats };
