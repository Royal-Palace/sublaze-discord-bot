import Server, { findById } from "../models/Server.js";
import User, { findById as _findById, findOne } from "../models/User.js";
import { emojis } from "../../config.json";
import { ButtonStyle, ButtonBuilder, ActionRowBuilder } from "discord.js";

export default class MessageHelper {
	constructor(client, ctx) {
		this.client = client;
		this.ctx = ctx;
	}

	async createServer() {
		this.server = await findById(this.ctx.guild.id);
		if (!this.server) {
			const newServer = new Server({
				_id: this.ctx.guild.id,
			});
			await newServer.save();
			this.server = newServer;
		}
	}

	async createUser() {
		this.user = await _findById(this.ctx.author.id);
		if (!this.user) {
			const newUser = new User({
				_id: this.ctx.author.id,
				commandsUsed: 1,
			});
			await newUser.save().catch((e) => this.client.logger.error(e));
			this.user = await findOne({ authorID: this.ctx.author.id });
		}
	}

	async getPrefix() {
		this.server = await findById(this.ctx.guild.id);
		if (!this.server) await this.createServer();
		return this.server.prefix;
	}

	async getPrefixFromMessage(rawMessageContent, mentionPrefix) {
		if (rawMessageContent.indexOf(process.env.PREFIX) === 0) {
			return process.env.PREFIX;
		} else if (rawMessageContent.indexOf(this.server.prefix.toLowerCase()) === 0) {
			return this.server.prefix;
		} else if (rawMessageContent.split(" ")[0].match(mentionPrefix)) {
			return mentionPrefix;
		} else {
			return undefined;
		}
	}

	async isBlacklisted() {
		if (!this.user) return false;
		if (this.user.blacklisted == null) this.user.blacklisted = false;
		if (!this.user.blacklisted) {
			this.user.commandsUsed += 1;
			await this.user.updateOne({ commandsUsed: this.user.commandsUsed });
		}
		return this.user.blacklisted;
	}

	isIgnored() {
		return this.server.ignoredChannels.includes(this.ctx.channel.id);
	}

	sendResponse(type) {
		switch (type) {
			case "sameVoiceChannel": {
				this.ctx.sendEphemeralMessage("You are not in the same voice channel as the bot.");
				break;
			}
			case "noVoiceChannel": {
				this.ctx.sendEphemeralMessage("You need to be in a voice channel to use this command.");
				break;
			}
			case "noSongsPlaying": {
				this.ctx.sendEphemeralMessage(
					"There are no songs currently playing, please play a song to use the command."
				);
				break;
			}
			case "botVoiceChannel": {
				this.ctx.sendEphemeralMessage("The bot is not currently in a vc.");
				break;
			}
			case "noPermissionConnect": {
				this.ctx.sendEphemeralMessage("I do not have permission to join your voice channel.");
				break;
			}
			case "noPermissionSpeak": {
				this.ctx.sendEphemeralMessage("I do not have permission to speak in your voice channel.");
				break;
			}
			case "noUser": {
				this.ctx.sendEphemeralMessage("Please provide a valid user.");
				break;
			}
			default: {
				this.ctx.sendEphemeralMessage(this.client.error());
			}
		}
	}

	async paginate(pages, timeout, buttonRow) {
		if (pages.length < 2) return this.ctx.sendMessage({ embeds: pages });
		let page = 0;

		const buttons = buttonRow
			? buttonRow
			: new ActionRowBuilder().addComponents(
					new ButtonBuilder()
						.setCustomId("back")
						.setLabel("Back")
						.setStyle(ButtonStyle.Primary)
						.setEmoji(emojis.left),
					new ButtonBuilder()
						.setCustomId("next")
						.setLabel("Next")
						.setStyle(ButtonStyle.Primary)
						.setEmoji(emojis.right)
			  );

		const message = await this.ctx.sendMessage({
			embeds: [pages[page]],
			components: [buttons],
			fetchReply: true,
		});

		const interactionCollector = message.createMessageComponentCollector({ max: pages.length * 2 });

		interactionCollector.on("collect", async (interaction) => {
			if (interaction.component.customId === "back") {
				if (page == 0) page = pages.length - 1;
				else page--;
			} else if (interaction.component.customId === "next") {
				if (page == pages.length - 1) page = 0;
				else page++;
			}

			await interaction.update({
				embeds: [pages[page]],
			});
		});

		interactionCollector.on("end", async () => {
			await message.edit({ components: [] });
		});

		setTimeout(
			async () => {
				interactionCollector.stop("Timeout");
				await message.edit({ components: [] });
			},
			timeout ? timeout : 300000
		);
	}
};
