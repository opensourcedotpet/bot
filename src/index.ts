// src/index.ts

import { client } from "./bot.js";
import "./server.js";

client.login(process.env.TOKEN);
