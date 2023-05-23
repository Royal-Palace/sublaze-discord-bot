import { ButtonStyle, EmbedBuilder, ButtonBuilder } from "discord.js";
import Button from "../../structures/Button";

export default class Loop extends Button {
	constructor(client) {
		super(client, {
			id: "LOOP_BUTTON",
		});
	}
	async run(client, interaction) {
		if (
			interaction.guild.members.me.voice.channel &&
			!interaction.guild.members.me.voice.channel.equals(interaction.member.voice.channel)
		)
			return interaction.reply({
				content: "You must be in the same voice channel as the bot to use this button.",
				ephemeral: true,
			});
		const player = client.music.players.get(interaction.guild.id);
		if (!player) return;

		let str;
		let style;
		let emoji;
		if (!player.queueRepeat && !player.trackRepeat) {
			player.setQueueRepeat(true);
			str = "Queue is now being looped.";
			style = ButtonStyle.Primary;
			emoji = client.config.emojis.loop;
		} else if (player.queueRepeat && !player.trackRepeat) {
			player.setQueueRepeat(false);
			player.setTrackRepeat(true);
			str = "Song is now being looped.";
			style = ButtonStyle.Primary;
			emoji = client.config.emojis.loopsong;
		} else if (player.trackRepeat) {
			player.setQueueRepeat(false);
			player.setTrackRepeat(false);
			str = "Song is no longer being looped.";
			style = ButtonStyle.Secondary;
			emoji = client.config.emojis.loop;
		}

		if (player.nowPlayingMessage) {
			const buttonRow = interaction.message.components[0];
			buttonRow.components[0] = new ButtonBuilder()
				.setCustomId("LOOP_BUTTON")
				.setStyle(style)
				.setEmoji(emoji);
			await player.nowPlayingMessage.edit({
				embeds: [player.nowPlayingMessage.embeds[0]],
				components: [buttonRow],
			});
		}

		const embed = new EmbedBuilder()
			.setColor(client.config.colors.default)
			.setAuthor({ name: str, iconURL: interaction.member.displayAvatarURL() });
		await interaction.reply({ embeds: [embed] });
	}
}
