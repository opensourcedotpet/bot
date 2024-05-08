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
window.addEventListener("load", loadGuilds);
guildFilter.addEventListener("change", applyFilters);
userFilter.addEventListener("change", applyFilters);
userIdFilter.addEventListener("input", handleUserIdInput);

const modal = document.getElementById("optoutModal");
document.querySelector('a[href="#optout"]').addEventListener("click", openModal);
document.getElementsByClassName("close")[0].addEventListener("click", closeModal);
window.addEventListener("click", (event) => {
	if (event.target === modal) closeModal();
});

function throttle(fn, wait) {
	let isThrottling = false;
	return function (...args) {
		if (!isThrottling) {
			fn.apply(this, args);
			isThrottling = true;
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
	messages.unshift(data);
	displayMessages();
	updateFilters();
}

function handleStatsUpdate(stats) {
	if (!stats || typeof stats !== "object") {
		console.error("Invalid stats data received");
		return;
	}

	document.getElementById("guild-count").textContent = stats.guildCount.toLocaleString();
	document.getElementById("user-count").textContent = stats.userCount.toLocaleString();
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
	applyFilters();
}

function applyFilters() {
	messagesContainer.innerHTML = "";
	const filteredMessages = messages.filter(messageMatchesFilters);

	for (const message of filteredMessages) {
		messagesContainer.prepend(createMessageElement(message));
	}
}

function handleUserIdInput() {
	const sanitizedInput = sanitizeInput(userIdFilter.value);
	userIdFilter.value = sanitizedInput;
	applyFilters();
}

function messageMatchesFilters(message) {
	const guildValue = guildFilter.value;
	const userValue = userFilter.value.toLowerCase();
	const userIdValue = userIdFilter.value.trim().toLowerCase();

	const messageGuildId = message.guildId || "";
	const messageUsername = message.username || "";
	const messageUserId = message.userId || "";

	const guildMatch = !guildValue || messageGuildId === guildValue;
	const userMatch = !userValue || messageUsername.toLowerCase().includes(userValue);
	const userIdMatch = !userIdValue || messageUserId.toLowerCase().includes(userIdValue);

	return guildMatch && userMatch && userIdMatch;
}

function updateFilters() {
	updateFilterOptions(userFilter, messages.map((m) => m.username));
}

function updateFilterOptions(filterElement, options) {
	const uniqueOptions = [...new Set(options)].filter(Boolean);

	filterElement.innerHTML = `<option value="">Select ${filterElement.id.replace("Filter", "")}</option>`;

	for (const option of uniqueOptions) {
		const optionElement = document.createElement("option");
		optionElement.textContent = option;
		optionElement.value = option;
		filterElement.appendChild(optionElement);
	}
}

async function loadGuilds() {
	try {
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
}

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
	textContent.innerHTML = DOMPurify.sanitize(linkifyContent(message.content));

	messageContent.appendChild(messageTop);
	messageContent.appendChild(textContent);

	messageElement.appendChild(avatar);
	messageElement.appendChild(messageContent);

	return messageElement;
}

function linkifyContent(content) {
	content = content.replace(
		/https:\/\/tenor\.com\/view\/[^\s]+/g,
		(match) => `<img src="${match}.gif" class="gif">`
	);

	content = content.replace(
		/<:(\w+):(\d+)>/g,
		(match, name, id) =>
			`<img src="https://cdn.discordapp.com/emojis/${id}.png" alt="${name}" class="emoji">`
	);

	return content;
}

function sanitizeInput(input) {
	return input.replace(/[^\w]/g, "");
}

function openModal(event) {
	event.preventDefault();
	modal.style.display = "block";
}

function closeModal() {
	modal.style.display = "none";
}