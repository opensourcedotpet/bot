// Import modules
import fs from "node:fs";
import path from "node:path";
import express from "express";
import { createServer } from "node:http";
import { Server as SocketIO } from "socket.io";
import { Client, MessageEmbed } from "discord.js-selfbot-v13";
import ioClient from "socket.io-client";

// Configuration and constants
const PORT = 3000;
const client = new Client();

// Check if the --guild flag is present
const guildFlagIndex = process.argv.indexOf("--guild");
const GUILD_IDS =
	guildFlagIndex !== -1 ? process.argv.slice(guildFlagIndex + 1) : [];
const USE_GUILD_FILE = guildFlagIndex !== -1 && GUILD_IDS.length > 0;

// Check if the --disable-webhook flag is present
const disableWebhook = process.argv.includes("--disable-webhook");

// Webhook configuration
const WEBHOOK_URL = disableWebhook ? null : (Bun.env.webhook as string);

// Express setup
const app = express();
app.use(express.static("public")); // Serve static files from 'public' directory

// HTTP and WebSocket server setup
const httpServer = createServer(app);
const io = new SocketIO(httpServer, {
	cors: { origin: "*", methods: ["GET", "POST"] },
});
const clientSocket = ioClient(`http://localhost:${PORT}`);

httpServer.listen(PORT, () =>
	console.log(`WebSocket server listening on *:${PORT}`),
);

// WebSocket client events
clientSocket.on("connect", () =>
	console.log("Connected to WebSocket server as client"),
);
clientSocket.on("connect_error", (error) =>
	console.error("Connection error:", error),
);

// WebSocket server events
io.on("connection", (socket) => {
	socket.emit("updateStats", latestStats);
});

let latestStats = { guildCount: 0, userCount: 0 };

client.on("ready", async () => {
	console.log(`Logged in as ${client.user?.tag}!`);

	// Initialize GUILD_IDS with all guild IDs from the file if no --guild argument is provided
	if (!USE_GUILD_FILE) {
		const guildsFilePath = path.join(__dirname, "public", "api", "guilds.json");
		try {
			const guildsData = JSON.parse(fs.readFileSync(guildsFilePath, "utf8"));
			GUILD_IDS.push(...guildsData.map((guild: { id: string }) => guild.id));
		} catch (error) {
			console.error(`Error reading guilds file: ${error}`);
		}
	}

	// Calculate total users and update stats
	const totalUsers = await calculateTotalUsers(client, GUILD_IDS);
	latestStats = { guildCount: GUILD_IDS.length, userCount: totalUsers };
	io.emit("updateStats", latestStats);
	console.log(`Updated stats emitted: ${JSON.stringify(latestStats)}`);

	// Write guilds data to file if --guild argument is provided
	if (USE_GUILD_FILE) {
		const guildsFilePath = path.join(__dirname, "public", "api", "guilds.json");
		const guildsData = client.guilds.cache
			.filter((guild) => GUILD_IDS.includes(guild.id))
			.map((guild) => ({
				id: guild.id,
				name: guild.name,
			}));

		// Ensure that the directory exists before writing the file
		const directoryPath = path.join(__dirname, "public", "api");
		if (!fs.existsSync(directoryPath)) {
			fs.mkdirSync(directoryPath, { recursive: true });
		}

		fs.writeFileSync(guildsFilePath, JSON.stringify(guildsData));
		console.log(`Guilds data written to ${guildsFilePath}`);
	}
});

// Helper functions
async function calculateTotalUsers(
	client: Client<boolean>,
	guildIDs: string[],
) {
	let totalUsers = 0;
	for (const guildId of guildIDs) {
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

client.on("guildMemberAdd", (member) => {
	if (GUILD_IDS.includes(member.guild.id)) {
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
			fetch(WEBHOOK_URL, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ embeds: joinData.embeds }),
			})
				.then((response) => response.text())
				.then((text) =>
					console.log("Sent join data with embed to webhook:", text),
				)
				.catch((error) => console.error("Error sending join data", error));
		}
	}
});

client.on("messageCreate", async (message) => {
	if (
		message.author.bot ||
		message.webhookId ||
		!message.guild ||
		!GUILD_IDS.includes(message.guild.id)
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
		message_link: `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`, // Ensure correct URL format
		userId: message.author.id,
	};

	io.emit("updateFilters", messageData);

	if (!disableWebhook && WEBHOOK_URL) {
		fetch(WEBHOOK_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(messageData),
		})
			.then((response) => response.text())
			.then((text) => console.log("Message sent to webhook:", text))
			.catch((error) => console.error("Error sending message", error));
	}
});

client.login(Bun.env.token);
