const socket = io("http://localhost:3000");
const messagesContainer = document.getElementById("messages");
const guildFilter = document.getElementById("guildFilter");
const userFilter = document.getElementById("userFilter");
const userIdFilter = document.getElementById("userIdFilter");

let messages = [];

socket.on("updateFilters", function (data) {
  // You might want to pass data to updateFilters if it needs to use this data directly
  updateFilters();
  messages.unshift(data); // prepend new messages to the array
  displayMessages(); // call to update the message display
});

let currentPage = 0;
const pageSize = 50; // Number of messages to load per page
let allMessagesLoaded = false;

window.addEventListener("scroll", () => {
  if (nearBottomOfPage() && !allMessagesLoaded) {
    currentPage++;
    loadMoreMessages(currentPage);
  }
});

function nearBottomOfPage() {
  return (
    window.innerHeight + window.scrollY >= document.body.offsetHeight - 100
  );
}

function loadMoreMessages(page) {
  // Assuming `messages` is a globally stored array of all messages
  const startIndex = page * pageSize;
  const endIndex = startIndex + pageSize;
  const messagesToLoad = messages.slice(startIndex, endIndex);

  if (messagesToLoad.length === 0) {
    allMessagesLoaded = true;
    return;
  }

  messagesToLoad.forEach((message) => {
    const messageElement = createMessageElement(message);
    messagesContainer.appendChild(messageElement); // Append new messages at the end
  });
}

guildFilter.addEventListener("change", displayFilteredMessages);
userFilter.addEventListener("change", displayFilteredMessages);
userIdFilter.addEventListener("input", displayFilteredMessages);

function displayMessages() {
  messagesContainer.innerHTML = ""; // Clear the message container
  messages.forEach((message) => {
    const messageElement = createMessageElement(message);
    messagesContainer.prepend(messageElement); // Show new messages on top
  });
}

function formatCodeBlocks(content) {
  console.log("Original Content: ", content);
  const formattedContent = content.replace(
    /```(\w*)\n?([\s\S]*?)```/g,
    (match, lang, code) => {
      const escapedCode = escapeHTML(code);
      console.log("Code Block: ", escapedCode);
      return `<pre><code class='${lang || ""}'>${escapedCode}</code></pre>`;
    }
  );
  console.log("Formatted Content: ", formattedContent);
  return formattedContent;
}

function escapeHTML(code) {
  // Escaping HTML to prevent XSS and correctly display special characters
  return code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createMessageElement(message) {
  const messageElement = document.createElement("div");
  messageElement.className = "message";

  // Avatar
  const avatarElement = document.createElement("img");
  avatarElement.src = message.avatar_url || "default-avatar.png";
  avatarElement.alt = "User avatar";
  avatarElement.className = "avatar";
  messageElement.appendChild(avatarElement);

  // Content container
  const contentContainer = document.createElement("div");
  contentContainer.className = "message-content";

  // Username and channel info
  const userInfoElement = document.createElement("div");
  userInfoElement.className = "message-user-info";

  const usernameElement = document.createElement("strong");
  usernameElement.textContent = message.username;
  userInfoElement.appendChild(usernameElement);

  if (message.guildName && message.channelName) {
    const channelInfoElement = document.createElement("span");
    channelInfoElement.textContent = ` (Guild: ${message.guildName}, Channel: ${message.channelName})`;
    userInfoElement.appendChild(channelInfoElement);
  }

  contentContainer.appendChild(userInfoElement);

  // New line for message text
  const textElement = document.createElement("div");
  textElement.className = "message-text";
  // Process and set the formatted content with code blocks
  textElement.innerHTML = formatCodeBlocks(message.content);
  contentContainer.appendChild(textElement);

  // Handling custom emojis and Tenor GIFs within the message content
  replaceCustomContent(textElement);

  contentContainer.appendChild(textElement);

  // Attachments
  message.attachments.forEach((attachment) => {
    const attachmentElement = document.createElement("img");
    attachmentElement.src = attachment;
    attachmentElement.className = "attachment-image";
    contentContainer.appendChild(attachmentElement);
  });

  messageElement.appendChild(contentContainer);

  // Discord message link
  const linkElement = document.createElement("a");
  linkElement.href = message.message_link;
  linkElement.textContent = "↖";
  linkElement.target = "_blank";
  linkElement.className = "message-link";
  messageElement.appendChild(linkElement);

  return messageElement;
}

function replaceCustomContent(textElement) {
  textElement.innerHTML = textElement.innerHTML
    .replace(
      /<:([\w]+):(\d+)>/g,
      (match, name, id) =>
        `<img src="https://cdn.discordapp.com/emojis/${id}.png" alt="${name}" class="custom-emoji">`
    )
    .replace(
      /https:\/\/tenor\.com\/view\/([\w-]+)-(\d+)/g,
      (url) => `<img src="${url}.gif" alt="GIF" class="embedded-gif">`
    );
}

function displayFilteredMessages() {
  const guildValue = guildFilter.value; // This should match the exact guild names or be empty for 'no filter'
  const userValue = userFilter.value.toLowerCase();
  const userIdValue = userIdFilter.value.trim().toLowerCase();

  messagesContainer.innerHTML = ""; // Clear current messages

  const filteredMessages = messages.filter((message) => {
    const matchesGuild = !guildValue || message.guildName === guildValue;
    const matchesUser =
      !userValue || message.username.toLowerCase().includes(userValue);
    const matchesUserId =
      !userIdValue || (message.userId && message.userId.includes(userIdValue));
    return matchesGuild && matchesUser && matchesUserId;
  });

  filteredMessages.forEach((message) => {
    const messageElement = createMessageElement(message);
    messagesContainer.prepend(messageElement); // Show new messages on top
  });

  // Debug to see if any messages are being filtered
  console.log("Filtered Messages:", filteredMessages.length);
}

function updateFilters() {
  const guildSet = new Set();
  const userSet = new Set();

  messages.forEach((message) => {
    if (message.guildName) {
      guildSet.add(message.guildName); // Make sure the guild names are correct
    }
    if (message.username) {
      userSet.add(message.username);
    }
  });

  guildFilter.innerHTML = '<option value="">Guild</option>';
  guildSet.forEach((guild) => {
    const option = document.createElement("option");
    option.textContent = guild;
    option.value = guild; // Ensure this value matches what's used in the filter
    guildFilter.appendChild(option);
  });

  userFilter.innerHTML = '<option value="">User</option>';
  userSet.forEach((user) => {
    const option = document.createElement("option");
    option.textContent = user;
    option.value = user.toLowerCase();
    userFilter.appendChild(option);
  });
}

// Get the modal
var modal = document.getElementById("optoutModal");

// Get the button that opens the modal
var btn = document.querySelector('a[href="#optout"]');

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

// When the user clicks the button, open the modal
btn.onclick = function (event) {
  event.preventDefault();
  modal.style.display = "block";
};

// When the user clicks on <span> (x), close the modal
span.onclick = function () {
  modal.style.display = "none";
};

// When the user clicks anywhere outside of the modal, close it
window.onclick = function (event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
};
