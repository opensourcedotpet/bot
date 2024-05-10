// src/server.ts

import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { Server as SocketIO } from "socket.io";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs, { promises as fsPromises } from "node:fs";
import { client, updateStats, latestStats } from "./bot.js";

const PORT = 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fastify = Fastify({ logger: true });
const publicPath = path.join(__dirname, "..", "frontend", "dist");

if (!fs.existsSync(publicPath)) {
	console.error(`The directory ${publicPath} does not exist!`);
	process.exit(1);
}

fastify.register(fastifyStatic, {
	root: publicPath,
	prefix: "/",
});

const reactRoutes = ["/servers", "/users", "/emojis", "/bans"];
for (const route of reactRoutes) {
	fastify.get(route, async (request, reply) => {
		return reply.sendFile("index.html", publicPath);
	});
}

// Handle root separately if needed, or include it in reactRoutes.
fastify.get("/", async (request, reply) =>
	reply.sendFile("index.html", publicPath),
);

fastify.setNotFoundHandler((request, reply) => {
	if (request.raw.method === "GET" && !request.url.startsWith("/api")) {
		return reply.sendFile("index.html", publicPath);
	}

	reply.status(404).send({ error: "Not Found" });
});

fastify.register(import("@fastify/cors"), { origin: "*" });
const httpServer = fastify.server;
const io = new SocketIO(httpServer, {
	cors: { origin: "*", methods: ["GET", "POST"] },
});

// Function to load JSON data
async function loadStats() {
	const statsFilePath = path.join(
		__dirname,
		"..",
		"frontend",
		"src",
		"api",
		"etc",
		"stats.json",
	);

	// Use the synchronous existsSync to check if the file exists
	if (!fs.existsSync(statsFilePath)) {
		throw new Error(`File does not exist: ${statsFilePath}`);
	}

	try {
		const data = await fsPromises.readFile(statsFilePath, "utf-8"); // Use fsPromises here
		return JSON.parse(data);
	} catch (error) {
		console.error("Error reading stats file:", error);
		throw error;
	}
}

// API route to serve stats
fastify.get("/api/etc/stats", async (request, reply) => {
	try {
		const stats = await loadStats();
		reply.send(stats);
	} catch (error) {
		console.error("Failed to load stats:", error);
		reply.status(500).send({ error: "Failed to load stats" });
	}
});

io.on("connection", (socket) => {
	console.log(`New client connected: ${socket.id}`);
	socket.emit("updateStats", latestStats);
});

client.on("ready", async () => {
	await updateStats();
	io.emit("updateStats", latestStats);
});

fastify
	.listen({ port: PORT })
	.then((address) => {
		console.log(`HTTP and WebSocket server is now listening on ${address}`);
	})
	.catch((err) => {
		console.error("Error starting server:", err);
		process.exit(1);
	});

export { io };
