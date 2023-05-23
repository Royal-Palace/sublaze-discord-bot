import {
	Client as _Client,
	Options,
	Sweepers,
	Partials,
	GatewayIntentBits,
	Collection,
} from "discord.js";
import { readdirSync } from "fs";
import { error } from "signale";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { PermissionsBitField, ApplicationCommandType } from "discord.js";
require("events").defaultMaxListeners = 15;
require("dotenv").config();

const commandsFolder = readdirSync("./src/commands/");
const listenersFolder = readdirSync("./src/listeners/");
import Logger from "./Logger.js";
import DatabaseHelper from "../helpers/DatabaseHelper.js";

export default class Client extends _Client {
	constructor() {
		super({
			allowedMentions: { parse: ["roles"], repliedUser: false },
			makeCache: Options.cacheWithLimits({
				...Options.defaultMakeCacheSettings,
				MessageManager: {
					sweepInterval: 300,
					sweepFilter: Sweepers.filterByLifetime({
						lifetime: 1800,
						getComparisonTimestamp: (e) => e.editedTimestamp || e.createdTimestamp,
					}),
					maxSize: 5,
				},
			}),
			partials: [Partials.Message, Partials.Channel, Partials.Reaction],
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.GuildVoiceStates,
				GatewayIntentBits.GuildMessageReactions,
			],
			restTimeOffset: 0,
		});

		this.commands = new Collection();
		this.buttons = new Collection();
		this.contextMenuCommands = new Collection();
		this.modals = new Collection();
		this.aliases = new Collection();

		this.statcordSongs = 0;

		this.logger = new Logger(
			{
				displayTimestamp: true,
				displayDate: true,
				displayFilename: true,
			},
			this
		);

		this.databaseHelper = new DatabaseHelper(this);

		this.config = require("../../config.json");
		this.earTensifiers = [
			"472714545723342848",
			"888267634687213669",
			"888268490199433236",
			"669256663995514900",
		];

		this.totalCommandsUsed = 0;
		this.totalSongsPlayed = 0;
		this.timesCommandsUsed = [];
		this.usersStats = [];
		this.lastUpdatedDatabase = Date.now();
	}

	loadCommands() {
		const commands = [];

		commandsFolder.forEach((category) => {
			const categories = readdirSync(`./src/commands/${category}/`).filter((file) =>
				file.endsWith(".js")
			);
			categories.forEach((command) => {
				const f = require(`../commands/${category}/${command}`);
				const cmd = new f(this, f);
				cmd.category = category;
				cmd.file = f;
				cmd.fileName = f.name;
				this.commands.set(cmd.name, cmd);
				if (cmd.aliases && Array.isArray(cmd.aliases)) {
					for (const alias of cmd.aliases) {
						this.aliases.set(alias, cmd);
					}
				}

				if (cmd.slashCommand) {
					const data = {
						name: cmd.name,
						description: cmd.description.content,
						options: cmd.options,
						type: ApplicationCommandType.ChatInput,
					};
					if (cmd.permissions.userPermissions.length > 0)
						data.default_member_permissions = cmd.permissions.userPermissions
							? PermissionsBitField.resolve(cmd.permissions.userPermissions).toString()
							: 0;
					commands.push(data);
					// if (debug) this.logger.debug(i + ': ' + JSON.stringify(data));
					// else this.logger.debug(`${i}. ${data.name}: ${data.description}`);
					// i++;
				}

				if (cmd.contextMenu != null) {
					const data = {
						name: cmd.contextMenu.name,
						type: cmd.contextMenu.type,
					};
					commands.push(data);
					this.contextMenuCommands.set(cmd.contextMenu.name, cmd);
				}
			});
		});

		const rest = new REST({ version: "9" }).setToken(process.env.DISCORD_TOKEN);

		// if (process.env.NODE_ENV === 'development') {
		//     rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, '473426453204172811'), { body: [] })
		//         .then(() => this.logger.success('Successfully registered application commands in guild.'))
		//         .catch((e) => signale.error(e));
		// }

		//     rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] })
		//         .then(() => this.logger.success('Successfully registered application commands.'))
		//         .catch((e) => signale.error(e));
		// }
		rest
			.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands })
			.then(() => this.logger.success("Successfully registered application commands."))
			.catch((e) => error(e));
	}

	loadListeners() {
		listenersFolder.forEach(async (eventFolder) => {
			const events = readdirSync(`./src/listeners/${eventFolder}`).filter(
				(c) => c.split(".").pop() === "js"
			);
			if (eventFolder != "player") {
				events.forEach(async (eventStr) => {
					if (!events.length) throw Error("No event files found!");
					const file = require(`../listeners/${eventFolder}/${eventStr}`);
					const event = new file(this, file);
					const eventName =
						eventStr.split(".")[0].charAt(0).toLowerCase() + eventStr.split(".")[0].slice(1);
					this.on(eventName, (...args) => event.run(...args));
				});
			}
		});
	}

	loadPlayerListeners() {
		const events = readdirSync("./src/listeners/player").filter((c) => c.split(".").pop() === "js");
		events.forEach(async (eventStr) => {
			if (!events.length) throw Error("No event files found!");
			const file = require(`../listeners/player/${eventStr}`);
			const event = new file(this, file);
			const eventName =
				eventStr.split(".")[0].charAt(0).toLowerCase() + eventStr.split(".")[0].slice(1);
			this.music.on(eventName, (...args) => event.run(...args));
		});
	}

	loadComponents() {
		const componentFolders = readdirSync("./src/components/");
		for (const component of componentFolders) {
			const componentFiles = readdirSync(`./src/components/${component}`);
			switch (component) {
				case "buttons":
					this.loadButtons(componentFiles);
					break;
				case "modals":
					this.loadModals(componentFiles);
					break;
				default:
					break;
			}
		}
	}

	loadButtons(buttonFolder) {
		for (const buttonFile of buttonFolder) {
			const f = require(`../components/buttons/${buttonFile}`);
			const button = new f(this, f);
			this.buttons.set(button.id, button);
		}
	}

	loadModals(modalFolder) {
		for (const modalFile of modalFolder) {
			const f = require(`../components/modals/${modalFile}`);
			const modal = new f(this, f);
			this.modals.set(modal.id, modal);
		}
	}

	shardMessage(channelId, message, isEmbed) {
		const channel = this.channels.cache.get(channelId);
		if (channel) {
			if (!isEmbed) {
				channel.send(message);
			} else {
				channel.send({ embeds: [message] });
			}
		}
	}

	reloadFile(fileToReload) {
		delete require.cache[require.resolve(fileToReload)];
		return require(fileToReload);
	}

	reloadCommands(commandsToReload) {
		if (commandsToReload.length > 0) {
			commandsToReload.forEach((c) => {
				if (c) {
					this.reloadFile(`${process.cwd()}/src/commands/${c.category}/${c.fileName}`);
					this.loadCommand(c.fileName, c.category);
					this.logger.info("Reloaded %s command", c.fileName);
				}
			});
		} else {
			this.commands.forEach((command) => {
				this.reloadFile(`${process.cwd()}/src/commands/${command.category}/${command.fileName}`);
				this.logger.info("Reloaded %s command", command.fileName);
			});
			this.loadCommands();
		}
	}

	async login(token) {
		super.login(token);

		this.loadCommands();
		this.loadListeners();
		this.loadComponents();
	}

	destroy() {
		this.logger.log("THIS SHOULD NOT HAPPEN!!!!", new Error().stack);
		process.exit(-1);
	}
}
