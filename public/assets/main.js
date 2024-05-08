const socket = io("http://localhost:3000");
const messagesContainer = document.getElementById("messages");
const guildFilter = document.getElementById("guildFilter");
const userFilter = document.getElementById("userFilter");
const userIdFilter = document.getElementById("userIdFilter");
const userProfileContainer = document.getElementById("userProfile");
const messages = [];
let currentPage = 0;
const pageSize = 1000;
let allMessagesLoaded = false;

socket.on("updateFilters", handleData);
socket.on("newMessage", handleData);
socket.on("updateStats", handleStatsUpdate);

window.addEventListener("scroll", throttle(handleScroll, 100));
window.addEventListener("load", loadGuilds);
guildFilter.addEventListener("change", applyFilters);
userFilter.addEventListener("change", applyFilters);
userIdFilter.addEventListener("input", handleUserIdInput);

const modal = document.getElementById("optoutModal");
document
	.querySelector('a[href="#optout"]')
	.addEventListener("click", openModal);
document
	.getElementsByClassName("close")[0]
	.addEventListener("click", closeModal);
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
	updateFilters();
	displayMessages();
}

function handleStatsUpdate(stats) {
	if (!stats || typeof stats !== "object") {
		console.error("Invalid stats data received");
		return;
	}

	document.getElementById("guild-count").textContent =
		stats.guildCount.toLocaleString();
	document.getElementById("user-count").textContent =
		stats.userCount.toLocaleString();
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
		messagesContainer.prepend(createMessageElement(message));
	}
}

function displayMessages() {
	messagesContainer.innerHTML = "";
	const filteredMessages = messages.filter(messageMatchesFilters);

	for (const message of filteredMessages) {
		messagesContainer.prepend(createMessageElement(message));
	}
}

function applyFilters() {
	const filteredMessages = messages.filter(messageMatchesFilters);

	messagesContainer.innerHTML = "";
	for (const message of filteredMessages) {
		messagesContainer.prepend(createMessageElement(message));
	}

	const selectedUserId = userIdFilter.value.trim().toLowerCase();
	if (selectedUserId) {
		const selectedUser = messages.find((m) => m.userId === selectedUserId);
		if (selectedUser) {
			displayUserProfile(selectedUser);
		}
	} else {
		userProfileContainer.innerHTML = "";
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
	const userMatch =
		!userValue || messageUsername.toLowerCase().includes(userValue);
	const userIdMatch =
		!userIdValue || messageUserId.toLowerCase().includes(userIdValue);

	return guildMatch && userMatch && userIdMatch;
}

function updateFilters() {
	const uniqueUsernames = [...new Set(messages.map((m) => m.username))].filter(
		Boolean,
	);
	updateFilterOptions(userFilter, uniqueUsernames);
}

function updateFilterOptions(filterElement, options) {
	const currentValue = filterElement.value;
	filterElement.innerHTML = `<option value="">Select ${filterElement.id.replace(
		"Filter",
		"",
	)}</option>`;

	for (const option of options) {
		const optionElement = document.createElement("option");
		optionElement.textContent = option;
		optionElement.value = option;
		filterElement.appendChild(optionElement);
	}

	if (options.includes(currentValue)) {
		filterElement.value = currentValue;
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
	username.className = "username-link";
	username.dataset.userId = message.userId;
	username.addEventListener("click", () => {
		userIdFilter.value = message.userId;
		applyFilters();
	});

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
	// Replace mentions like <@USERID> with the username
	content = content.replace(/<@(\d+)>/g, (match, userId) => {
		const user = messages.find((m) => m.userId === userId);
		return user ? `@${user.username}` : match;
	});

	// Replace tenor GIF links
	content = content.replace(
		/https:\/\/tenor\.com\/view\/[^\s]+/g,
		(match) => `<img src="${match}.gif" class="gif">`,
	);

	// Replace custom emojis like <:emojiName:emojiId>
	content = content.replace(
		/<:(\w+):(\d+)>/g,
		(match, name, id) =>
			`<img src="https://cdn.discordapp.com/emojis/${id}.png" alt="${name}" class="emoji">`,
	);

	return content;
}

function sanitizeInput(input) {
	return input.replace(/[^\w]/g, "");
}

function displayUserProfile(user) {
	const mutualServers = [
		...new Set(
			messages.filter((m) => m.userId === user.userId).map((m) => m.guildName),
		),
	];

	userProfileContainer.innerHTML = `
                <div class="user-profile">
                        <img src="${user.avatar_url}" alt="${user.username}'s Avatar" class="profile-avatar">
                        <div class="profile-info">
                                <p><strong>Username:</strong> ${user.username}</p>
                                <p><strong>User ID:</strong> ${user.userId}</p>
                                <p><strong>Mutual Servers:</strong> ${mutualServers.join(
																	", ",
																)}</p>
                                <p><strong>Latest Messages:</strong></p>
                                <ul class="latest-messages">
                                        ${messages
																					.filter(
																						(m) => m.userId === user.userId,
																					)
																					.slice(0, 5)
																					.map(
																						(m) =>
																							`<li>${linkifyContent(
																								m.content,
																							)}</li>`,
																					)
																					.join("")}
                                </ul>
                        </div>
                </div>
        `;
}

function openModal(event) {
	event.preventDefault();
	modal.style.display = "block";
}

function closeModal() {
	modal.style.display = "none";
}
