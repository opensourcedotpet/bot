const socket = io("http://localhost:3000");
const messagesContainer = document.getElementById("messages");
const guildFilter = document.getElementById("guildFilter");
const userFilter = document.getElementById("userFilter");
const userIdFilter = document.getElementById("userIdFilter");
const messages = [];

socket.on("updateFilters", handleData);
socket.on("newMessage", handleData);
socket.on("updateStats", handleStatsUpdate);

let currentPage = 0;
const pageSize = 1000;
let allMessagesLoaded = false;

window.addEventListener("scroll", throttle(handleScroll, 100));

function throttle(fn, wait) {
	let isThrottling = false;
	return function (...args) {
		if (!isThrottling) {
			fn.apply(this, args);
			isThrottling = true;
			// biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
			setTimeout(() => (isThrottling = false), wait);
		}
	};
}

function handleScroll() {
	if (
		allMessagesLoaded ||
		window.innerHeight + window.scrollY < document.body.offsetHeight - 100
	) {
		return;
	}
	loadMoreMessages(++currentPage);
}

function handleData(data) {
	if (!data || typeof data !== "object") {
		console.error("Invalid message data received:", data);
		return;
	}
	// Add the new message at the start of your messages array.
	messages.unshift(data);
	displayMessages();

	// Update the users filter with new data
	updateFilters();
}

function handleStatsUpdate(stats) {
	try {
		if (!stats || typeof stats !== "object")
			throw new Error("Invalid stats data received");
		document.getElementById("guild-count").textContent =
			stats.guildCount.toLocaleString();
		document.getElementById("user-count").textContent =
			stats.userCount.toLocaleString();
	} catch (error) {
		console.error("Failed to update stats:", error);
	}
}

function loadMoreMessages(page) {
	const startIndex = page * pageSize;
	const endIndex = Math.min(startIndex + pageSize, messages.length);
	const messagesToLoad = messages.slice(startIndex, endIndex);

	if (messagesToLoad.length === 0) {
		allMessagesLoaded = true;
		return;
	}
	for (const message of messagesToLoad) {
		messagesContainer.appendChild(createMessageElement(message));
	}
}

function displayMessages() {
	// Re-use applyFilters to maintain filter settings on new messages
	applyFilters();
}

// This function is called when filters are changed.
function applyFilters() {
	// First, clear all current messages.
	messagesContainer.innerHTML = "";

	// Filter messages based on the current selection of the filters.
	const filteredMessages = messages.filter(messageMatchesFilters);

	// Display filtered messages.
	for (const message of filteredMessages) {
		messagesContainer.prepend(createMessageElement(message));
	}
}

// Call applyFilters when a change happens in any of the filters.
guildFilter.addEventListener("change", applyFilters);
userFilter.addEventListener("change", applyFilters);
userIdFilter.addEventListener("input", () => {
	const sanitizedInput = sanitizeInput(userIdFilter.value);
	userIdFilter.value = sanitizedInput; // Update the input value with sanitized input
	applyFilters();
});

function messageMatchesFilters(message) {
	const guildValue = guildFilter.value;
	const userValue = userFilter.value.toLowerCase();
	const userIdValue = userIdFilter.value.trim().toLowerCase();

	// Make sure undefined values are handled.
	const messageGuildId = message.guildId || "";
	const messageUsername = message.username || "";
	const messageUserId = message.userId || "";

	const guildMatch = !guildValue || messageGuildId === guildValue;
	const userMatch =
		!userValue || messageUsername.toLowerCase().includes(userValue);
	const userIdMatch =
		!userIdValue || messageUserId.toLowerCase().includes(userIdValue);

	return guildMatch && userMatch && userIdMatch;
}

function updateFilters() {
	updateFilterOptions(
		userFilter,
		messages.map((m) => m.username),
	);
}

function updateFilterOptions(filterElement, options) {
	// Get unique options
	const uniqueOptions = [...new Set(options)].filter(Boolean);

	// Clear existing options
	filterElement.innerHTML = `<option value="">Select ${filterElement.id.replace(
		"Filter",
		"",
	)}</option>`;

	// Create and append new options
	for (const option of uniqueOptions) {
		const optionElement = document.createElement("option");
		optionElement.textContent = option;
		optionElement.value = option;
		filterElement.appendChild(optionElement);
	}
}

window.addEventListener("load", async () => {
	try {
		// Send a request to fetch all available guilds from the server
		const response = await fetch("/api/guilds.json");
		const guilds = await response.json();

		for (const guild of guilds) {
			const optionElement = document.createElement("option");
			optionElement.textContent = guild.name;
			optionElement.value = guild.id;
			guildFilter.appendChild(optionElement);
		}
	} catch (error) {
		console.error("Failed to fetch guilds:", error);
	}
});

function createMessageElement(message) {
	const messageElement = document.createElement("div");
	messageElement.className = "message";

	const avatar = document.createElement("img");
	avatar.src = message.avatar_url;
	avatar.className = "avatar";
	avatar.alt = `${message.username}'s Avatar`;

	const messageContent = document.createElement("div");
	messageContent.className = "message-content";

	const messageTop = document.createElement("div");
	messageTop.className = "message-top";

	const username = document.createElement("strong");
	username.textContent = message.username;
	messageTop.appendChild(username);

	const serverName = document.createElement("sup");
	serverName.textContent = ` ${message.guildName}`;
	messageTop.appendChild(serverName);

	const serverId = document.createElement("sup");
	serverId.textContent = `(${message.guildId}) `;
	messageTop.appendChild(serverId);

	const textContent = document.createElement("div");
	textContent.innerHTML = DOMPurify.sanitize(message.content);
	textContent.innerHTML = linkifyContent(message.content);

	messageContent.appendChild(messageTop);
	messageContent.appendChild(textContent);

	messageElement.appendChild(avatar);
	messageElement.appendChild(messageContent);

	return messageElement;
}

function linkifyContent(content) {
	// Replace Tenor links with GIFs
	content = content.replace(
		/https:\/\/tenor\.com\/view\/[^\s]+/g,
		(match) => `<img src="${match}.gif" class="gif">`,
	);

	// Replace custom emojis with images
	content = content.replace(
		/<:(\w+):(\d+)>/g,
		(match, name, id) =>
			`<img src="https://cdn.discordapp.com/emojis/${id}.png" alt="${name}" class="emoji">`,
	);

	return content;
}

function sanitizeInput(input) {
	// Use a regular expression to allow only alphanumeric characters
	return input.replace(/[^\w]/g, "");
}

const modal = document.getElementById("optoutModal");
document
	.querySelector('a[href="#optout"]')
	.addEventListener("click", (event) => {
		event.preventDefault();
		modal.style.display = "block";
	});

document.getElementsByClassName("close")[0].addEventListener("click", () => {
	modal.style.display = "none";
});

window.addEventListener("click", (event) => {
	if (event.target === modal) {
		modal.style.display = "none";
	}
});
