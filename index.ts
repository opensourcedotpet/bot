import {
  Client,
  MessageEmbed,
  Message,
  Guild,
  type PartialMessage,
} from "discord.js-selfbot-v13";
import ioClient from "socket.io-client";

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const client = new Client();
const webhookURL = Bun.env.webhook as string;
const guildIDs = process.argv.slice(2);

const app = express();
app.use(express.static("public")); // Serve static files from 'public' directory

// Setting up the WebSocket server
const httpServer = http.createServer(app);
const io = socketIo(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

httpServer.listen(3000, () => {
  console.log("WebSocket server listening on *:3000");
});

// Setting up the WebSocket client (this might be unnecessary in this context)
const clientSocket = ioClient("http://localhost:3000"); // Renamed variable to clarify role

clientSocket.on("connect", () => {
  console.log("Connected to WebSocket server as client");
});

clientSocket.on("connect_error", (error: any) => {
  console.error("Connection error:", error);
});

let latestStats = { guildCount: 0, userCount: 0 };

// When a new client connects, send them the latest stats
io.on(
  "connection",
  (socket: {
    emit: (
      arg0: string,
      arg1: { guildCount: number; userCount: number }
    ) => void;
  }) => {
    console.log("A client connected, sending latest stats:", latestStats);
    socket.emit("updateStats", latestStats);
  }
);

client.on("ready", async () => {
  console.log(`Logged in as ${client.user?.tag}!`);

  const totalUsers = await calculateTotalUsers(client, guildIDs);
  latestStats = {
    guildCount: guildIDs.length,
    userCount: totalUsers,
  };

  // Emit the updated stats to all connected clients
  io.emit("updateStats", latestStats);
  console.log(`Updated stats emitted: ${JSON.stringify(latestStats)}`);
});

// Fetching reply content with error handling
async function fetchReplyContent(message: Message | PartialMessage) {
  let replyContent = "";
  if (message.reference && message.reference.messageId) {
    try {
      const reply = await message.channel.messages.fetch(
        message.reference.messageId
      );
      replyContent = [
        `**Replying to ${reply.author.username}**`,
        ...reply.content.split("\n").map((line: string) => `> ${line}`),
        " ",
      ].join("\n");
    } catch {
      replyContent = "**Replying to a message that could not be fetched**\n";
    }
  }
  return replyContent;
}

// Fetching attachments content
function fetchAttachmentContent(message: Message | PartialMessage) {
  const attachmentUrls = message.attachments.map((a) => a.url).join("\n");
  return message.attachments.size > 0
    ? "**Attachments:**\n" + attachmentUrls
    : "";
}

// This function calculates the total number of users across all guilds
async function calculateTotalUsers(
  client: Client,
  guildIDs: string[]
): Promise<number> {
  let totalUsers = 0;

  // Loop through supplied guild IDs.
  for (const guildId of guildIDs) {
    // Check if the client is in the guild with the given ID.
    const guild = client.guilds.cache.get(guildId);
    if (guild) {
      try {
        // Fetch the latest guild information to get the current member count.
        const fetchedGuild = await guild.fetch();
        totalUsers += fetchedGuild.memberCount;
      } catch (error) {
        console.error(`Failed to fetch guild ${guildId}:`, error);
      }
    } else {
      console.log(`Guild with ID ${guildId} not found.`);
    }
  }

  return totalUsers;
}

client.on("guildMemberAdd", (member) => {
  if (guildIDs.includes(member.guild.id)) {
    // Handling possible null values with a fallback to "Unknown join date"
    const joinDate = member.joinedTimestamp
      ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`
      : "Unknown join date";

    const creationDate = `<t:${Math.floor(
      member.user.createdTimestamp / 1000
    )}:F>`;
    const avatarURL = member.user.displayAvatarURL();

    const joinEmbed = new MessageEmbed()
      .setTitle(`${member.user.username}`)
      .setDescription(
        `${member.user.username} has joined ${member.guild.name}.`
      )
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
      content: `${member.user.username} has joined the guild.`,
      timestamp: joinDate,
      guildId: member.guild.id,
      guildName: member.guild.name,
      embeds: [joinEmbed.toJSON()], // For webhook
    };

    // Emit to WebSocket
    io.emit("updateFilters", joinData);

    // Send to webhook
    fetch(webhookURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: joinData.embeds }), // Sending the embeds
    })
      .then((response) => response.text())
      .then((text) =>
        console.log("Sent join data with embed to webhook:", text)
      )
      .catch((error) => console.error("Error sending join data", error));
  }
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || message.webhookId || !message.guild) return;

  if (guildIDs.includes(message.guild.id)) {
    const messageData = {
      username: message.author.username,
      avatar_url: message.author.displayAvatarURL({
        format: "png",
        size: 4096,
      }),
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

    fetch(webhookURL, {
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
