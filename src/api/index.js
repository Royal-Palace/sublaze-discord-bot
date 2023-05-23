import express, { urlencoded, json } from "express";
import cors from "cors";

import { findById } from "../models/Bot";
import { PermissionsBitField } from "discord.js";

const app = express();
const port = 2872;

export default (client) => {
	app.use(cors());
	app.use(urlencoded({ extended: false }));
	app.use(json());

	app.get("/commands", (req, res) => {
		client.logger.api("Received get request for /commands");
		const commands = [];
		client.commands.forEach((command) => {
			const permissions = {
				userPermissions: new PermissionsBitField(command.permissions.userPermissions).toArray(),
				botPermissions: new PermissionsBitField(command.permissions.botPermissions).toArray(),
			};
			commands.push({
				name: command.name,
				description: command.description,
				args: command.args,
				aliases: command.aliases,
				isEnabled: command.isEnabled,
				hide: command.hide,
				cooldown: command.cooldown,
				voiceRequirements: command.voiceRequirements,
				permissions: permissions,
				options: command.options,
				slashCommand: command.slashCommand,
				guildOnly: command.guildOnly,
				category: command.category,
			});
		});
		res.send(commands);
	});

	app.get("/statistics", async (req, res) => {
		client.logger.api("Received get request for /statistics");
		const bot = await findById(client.user.id);

		const stats = {
			guilds: bot.websiteData.guilds,
			users: bot.websiteData.users,
			players: bot.websiteData.players,
			commandsUsed: bot.commandsUsed,
			songsPlayed: bot.songsPlayed,
		};

		res.send(stats);
	});

	app.listen(port, () => {
		client.logger.api(`API listening at http://localhost:${port}`);
	});
};
