// Import modules
import fs from "node:fs";
import path from "node:path";
import express from "express";
import { createServer } from "node:http";
import { Server as SocketIO } from "socket.io";
import { Client, GuildMember, Message, MessageEmbed } from "discord.js-selfbot-v13";
import ioClient from "socket.io-client";

// Configuration and constants
const PORT = 3000;
const client = new Client();

// Check flags and Webhook configuration
const { GUILD_IDS, USE_GUILD_FILE, disableWebhook, WEBHOOK_URL } = parseFlagsAndEnvVars();
const app = express();
app.use(express.static("public"));

// HTTP and WebSocket server setup
const httpServer = createServer(app);
const io = new SocketIO(httpServer, {
	cors: { origin: "*", methods: ["GET", "POST"] }
});
const clientSocket = ioClient(`http://localhost:${PORT}`);

httpServer.listen(PORT, () => console.log(`WebSocket server listening on *:${PORT}`));

clientSocket.on("connect", () => console.log("Connected to WebSocket server as client"));
clientSocket.on("connect_error", (error) => console.error("Connection error:", error));

io.on("connection", (socket) => socket.emit("updateStats", latestStats));

let latestStats = { guildCount: 0, userCount: 0 };

client.on("ready", async () => {
	console.log(`Logged in as ${client.user?.tag}!`);

	if (!USE_GUILD_FILE) {
		loadGuildIdsFromFile();
	}

	const totalUsers = await calculateTotalUsers(client, GUILD_IDS);
	latestStats = { guildCount: GUILD_IDS.length, userCount: totalUsers };
	io.emit("updateStats", latestStats);
	console.log(`Updated stats emitted: ${JSON.stringify(latestStats)}`);

	if (USE_GUILD_FILE) {
		writeGuildsToFile(client, GUILD_IDS);
	}
});

client.on("guildMemberAdd", (member) => handleGuildMemberAdd(member, GUILD_IDS, disableWebhook, WEBHOOK_URL, io));
client.on("messageCreate", (message) => handleMessageCreate(message, GUILD_IDS, disableWebhook, WEBHOOK_URL, io));
client.login(Bun.env.token);

// Helper functions
function parseFlagsAndEnvVars() {
	const guildFlagIndex = process.argv.indexOf("--guild");
	const GUILD_IDS = guildFlagIndex !== -1 ? process.argv.slice(guildFlagIndex + 1) : [];
	const USE_GUILD_FILE = guildFlagIndex !== -1 && GUILD_IDS.length > 0;
	const disableWebhook = process.argv.includes("--disable-webhook");
	const WEBHOOK_URL = disableWebhook ? null : (Bun.env.webhook as string);

	return { GUILD_IDS, USE_GUILD_FILE, disableWebhook, WEBHOOK_URL };
}

function loadGuildIdsFromFile() {
	const guildsFilePath = path.join(__dirname, "public", "api", "guilds.json");
	try {
		const guildsData = JSON.parse(fs.readFileSync(guildsFilePath, "utf8"));
		GUILD_IDS.push(...guildsData.map((guild: { id: string }) => guild.id));
	} catch (error) {
		console.error(`Error reading guilds file: ${error}`);
	}
}

function writeGuildsToFile(client: Client, guildIds: string[]) {
	const guildsFilePath = path.join(__dirname, "public", "api", "guilds.json");
	const guildsData = client.guilds.cache
		.filter((guild) => guildIds.includes(guild.id))
		.map((guild) => ({
			id: guild.id,
			name: guild.name
		}));

	const directoryPath = path.join(__dirname, "public", "api");
	if (!fs.existsSync(directoryPath)) {
		fs.mkdirSync(directoryPath, { recursive: true });
	}

	fs.writeFileSync(guildsFilePath, JSON.stringify(guildsData));
	console.log(`Guilds data written to ${guildsFilePath}`);
}

async function calculateTotalUsers(client: Client, guildIds: string[]) {
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

function handleGuildMemberAdd(member: GuildMember, guildIds: string | any[], disableWebhook: boolean, webhookUrl: string | Request | null, io) {
	if (guildIds.includes(member.guild.id)) {
		const joinDate = member.joinedTimestamp
			? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`
			: "Unknown join date";
		const creationDate = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`;
		const avatarURL = member.user.displayAvatarURL();

		const joinEmbed = new MessageEmbed()
			.setTitle(`${member.user.username}`)
			.setDescription(`${member.user.username} has joined ${member.guild.name}.`)
			.addFields(
				{ name: "Joined", value: joinDate, inline: true },
				{ name: "Created", value: creationDate, inline: true }
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
			embeds: [joinEmbed.toJSON()]
		};

		io.emit("updateFilters", joinData);

		if (!disableWebhook && webhookUrl) {
			fetch(webhookUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ embeds: joinData.embeds })
			})
				.then((response) => response.text())
				.then((text) => console.log("Sent join data with embed to webhook:", text))
				.catch((error) => console.error("Error sending join data", error));
		}
	}
}

function handleMessageCreate(message: Message<boolean>, guildIds: string | any[], disableWebhook: boolean, webhookUrl: string | Request | null, io) {
	if (
		message.author.bot ||
		message.webhookId ||
		!message.guild ||
		!guildIds.includes(message.guild.id)
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
		userId: message.author.id
	};

	io.emit("updateFilters", messageData);

	if (!disableWebhook && webhookUrl) {
		fetch(webhookUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(messageData)
		})
			.then((response) => response.text())
			.then((text) => console.log("Message sent to webhook:", text))
			.catch((error) => console.error("Error sending message", error));
	}
}