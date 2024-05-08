// Import modules
import fs from "node:fs";
import path from "node:path";
import express from "express";
import { createServer } from "node:http";
import { Server as SocketIO } from "socket.io";
import {
	Client,
	type GuildMember,
	type Message,
	MessageEmbed,
} from "discord.js-selfbot-v13";
import ioClient from "socket.io-client";
import readline from "node:readline";

// Configuration and constants
const PORT = 3000;
const app = express();
app.use(express.static("public"));
const httpServer = createServer(app);
const io = new SocketIO(httpServer, {
	cors: { origin: "*", methods: ["GET", "POST"] },
});
const clientSocket = ioClient(`http://localhost:${PORT}`);
const client = new Client();
let latestStats = { guildCount: 0, userCount: 0 };

// Helper function to initialize configuration
function parseFlagsAndEnvVars() {
	const guildFlagIndex = process.argv.indexOf("--guild");
	const rawGuildIds =
		guildFlagIndex !== -1 ? process.argv.slice(guildFlagIndex + 1) : [];
	const GUILD_IDS = new Set<string>(rawGuildIds);
	const USE_GUILD_FILE = guildFlagIndex !== -1 && rawGuildIds.length > 0;
	const disableWebhook = process.argv.includes("--disable-webhook");
	const WEBHOOK_URL = disableWebhook ? null : (Bun.env.webhook as string);

	return { GUILD_IDS, USE_GUILD_FILE, disableWebhook, WEBHOOK_URL };
}

const { GUILD_IDS, USE_GUILD_FILE, disableWebhook, WEBHOOK_URL } =
	parseFlagsAndEnvVars();

// Function to handle WebSocket server setup
function setupWebSocketServer() {
	httpServer.listen(PORT, () =>
		console.log(`WebSocket server listening on *:${PORT}`),
	);
	clientSocket.on("connect", () =>
		console.log("Connected to WebSocket server as client"),
	);
	clientSocket.on("connect_error", (error) =>
		console.error("Connection error:", error),
	);
	io.on("connection", (socket) => socket.emit("updateStats", latestStats));
}

// Function to load guild IDs from file
function loadGuildIdsFromFile() {
	const guildsFilePath = path.join(__dirname, "public", "api", "guilds.json");
	try {
		const guildsData = JSON.parse(fs.readFileSync(guildsFilePath, "utf8"));
		for (const guild of guildsData) {
			GUILD_IDS.add(guild.id);
		}
	} catch (error) {
		console.error(`Error reading guilds file: ${error}`);
	}
}

// Function to write guild data to file
function writeGuildsToFile(client: Client, guildIds: Set<string>) {
	const guildsFilePath = path.join(__dirname, "public", "api", "guilds.json");
	const guildsData = [...client.guilds.cache.values()]
		.filter((guild) => guildIds.has(guild.id))
		.map((guild) => ({ id: guild.id, name: guild.name }));

	const directoryPath = path.join(__dirname, "public", "api");
	if (!fs.existsSync(directoryPath)) {
		fs.mkdirSync(directoryPath, { recursive: true });
	}

	fs.writeFileSync(guildsFilePath, JSON.stringify(guildsData, null, 2));
	console.log(`Guilds data written to ${guildsFilePath}`);
}

// Async function to calculate total users
async function calculateTotalUsers(
	client: Client,
	guildIds: Set<string>,
): Promise<number> {
	let totalUsers = 0;
	for (const guildId of guildIds) {
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

// Function to emit updated stats
async function updateStats() {
	const totalUsers = await calculateTotalUsers(client, GUILD_IDS);
	latestStats = { guildCount: GUILD_IDS.size, userCount: totalUsers };
	io.emit("updateStats", latestStats);
	console.log(`Updated stats emitted: ${JSON.stringify(latestStats)}`);
}

// Function to send data via Webhook
async function sendToWebhook(webhookUrl: string, data: object) {
	try {
		const response = await fetch(webhookUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});
		const text = await response.text();
		console.log("Sent data to webhook:", text);
	} catch (error) {
		console.error("Error sending data to webhook:", error);
	}
}

// Function to handle member join events
function handleGuildMemberAdd(member: GuildMember) {
	if (GUILD_IDS.has(member.guild.id)) {
		const joinDate = member.joinedTimestamp
			? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`
			: "Unknown join date";
		const creationDate = `<t:${Math.floor(
			member.user.createdTimestamp / 1000,
		)}:F>`;
		const avatarURL = member.user.displayAvatarURL();

		const joinEmbed = new MessageEmbed()
			.setTitle(`${member.user.username}`)
			.setDescription(
				`${member.user.username} has joined ${member.guild.name}.`,
			)
			.addFields(
				{ name: "Joined", value: joinDate, inline: true },
				{ name: "Created", value: creationDate, inline: true },
			)
			.setThumbnail(avatarURL)
			.setColor("#0099ff")
			.setTimestamp();

		const joinData = {
			username: member.user.username,
			avatar_url: avatarURL,
			content: `${member.user.username} has joined the server.`,
			timestamp: joinDate,
			guildId: member.guild.id,
			guildName: member.guild.name,
			embeds: [joinEmbed.toJSON()],
		};

		io.emit("updateFilters", joinData);

		if (!disableWebhook && WEBHOOK_URL) {
			sendToWebhook(WEBHOOK_URL, { embeds: joinData.embeds });
		}
	}
}

// Function to handle message creation events
function handleMessageCreate(message: Message) {
	if (
		message.author.bot ||
		message.webhookId ||
		!message.guild ||
		!GUILD_IDS.has(message.guild.id)
	)
		return;

	const messageData = {
		username: message.author.username,
		avatar_url: message.author.displayAvatarURL({ format: "png", size: 4096 }),
		content: message.content,
		timestamp: `<t:${Math.floor(message.createdTimestamp / 1000)}:F>`,
		attachments: message.attachments.map((a) => a.url),
		guildId: message.guild.id,
		guildName: message.guild.name,
		channelName: message.channelId,
		message_link: `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`,
		userId: message.author.id,
	};

	io.emit("updateFilters", messageData);

	if (!disableWebhook && WEBHOOK_URL) {
		sendToWebhook(WEBHOOK_URL, messageData);
	}
}

// Command-line interface setup
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

function handleCLICommands() {
	rl.on("line", async (input: string) => {
		const [command, ...args] = input.split(" ");
		switch (command) {
			case "add":
				if (args[0] === "server" && args[1]) {
					const serverId = args[1];
					if (!GUILD_IDS.has(serverId)) {
						GUILD_IDS.add(serverId);
						await updateStats();
						writeGuildsToFile(client, GUILD_IDS);
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
						writeGuildsToFile(client, GUILD_IDS);
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
}

// Discord client event handlers
client.on("ready", async () => {
	console.log(`Logged in as ${client.user?.tag}!`);

	if (!USE_GUILD_FILE) {
		loadGuildIdsFromFile();
	}

	await updateStats();

	if (USE_GUILD_FILE) {
		writeGuildsToFile(client, GUILD_IDS);
	}

	handleCLICommands();
});

client.on("guildMemberAdd", handleGuildMemberAdd);
client.on("messageCreate", handleMessageCreate);
client.login(Bun.env.token);

// Start WebSocket server
setupWebSocketServer();
