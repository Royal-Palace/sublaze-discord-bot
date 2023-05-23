import { EmbedBuilder } from "discord.js";

import Command from "../../structures/Command";

export default class Shards extends Command {
	constructor(client) {
		super(client, {
			name: "shards",
			description: {
				content: "Displays the bot's shards.",
			},
			cooldown: "4",
			aliases: ["shardstats", "shardinfo"],
			enabled: true,
			args: false,
			hide: true,
			slashCommand: false,
		});
	}
	async run(client, ctx) {
		const embeds = [];
		const promises = [
			client.shard.fetchClientValues("guilds.cache.size"),
			client.shard.broadcastEval((c) =>
				c.guilds.cache.reduce((prev, guild) => prev + guild.memberCount, 0)
			),
		];

		const shardInfo = await client.shard.broadcastEval((c) => ({
			id: c.shard.ids,
			shards: c.shard.shards,
			status: c.shard.client.presence.status,
			guilds: c.guilds.cache.size,
			channels: c.channels.cache.size,
			members: c.guilds.cache.reduce((prev, guild) => prev + guild.memberCount, 0),
			memoryUsage: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
			players: c.music.players.size,
			playingPlayers: c.music.getPlayingPlayers().size,
			ping: c.ws.ping,
		}));

		let totalPlayers = 0;
		let totalPlayingPlayers = 0;
		for (let n = 0; n < shardInfo.length / 15; n++) {
			const shardArray = shardInfo.slice(n * 15, n * 15 + 15);

			const embed = new EmbedBuilder()
				.setColor(client.config.colors.default)
				.setAuthor({ name: "Ear Tensifier", iconURL: client.user.displayAvatarURL() });

			shardArray.forEach((i) => {
				const status =
					i.status === "online" ? client.config.emojis.online : client.config.emojis.offline;
				embed.addFields({
					name: `${status} Shard ${parseInt(i.id).toString()}`,
					value: `\`\`\`js\nServers: ${i.guilds.toLocaleString()}\nChannels: ${i.channels.toLocaleString()}\nUsers: ${i.members.toLocaleString()}\nMemory: ${Number(
						i.memoryUsage
					).toLocaleString()} MB\nAPI: ${i.ping.toLocaleString()} ms\nPlayers: ${i.playingPlayers.toLocaleString()}/${i.players.toLocaleString()}\`\`\``,
					inline: true,
				});
				totalPlayers += i.players;
				totalPlayingPlayers += i.playingPlayers;
			});

			Promise.all(promises).then(async (results) => {
				let totalMemory = 0;
				shardArray.forEach((s) => (totalMemory += parseInt(s.memoryUsage)));
				let totalChannels = 0;
				shardArray.forEach((s) => (totalChannels += parseInt(s.channels)));
				let avgLatency = 0;
				shardArray.forEach((s) => (avgLatency += s.ping));
				avgLatency = avgLatency / shardArray.length;
				avgLatency = Math.round(avgLatency);
				const totalGuilds = results[0].reduce((prev, guildCount) => prev + guildCount, 0);
				const totalMembers = results[1].reduce((prev, memberCount) => prev + memberCount, 0);

				embed.setDescription(`This guild is currently on **Shard ${client.shard.ids}**.`);
				embed.addFields({
					name: client.config.emojis.online + " Total Stats",
					value: `\`\`\`js\nTotal Servers: ${totalGuilds.toLocaleString()}\nTotal Channels: ${totalChannels.toLocaleString()}\nTotal Users: ${totalMembers.toLocaleString()}\nTotal Memory: ${totalMemory.toFixed(
						2
					)} MB\nAvg API Latency: ${avgLatency} ms\nTotal Players: ${totalPlayingPlayers}/${totalPlayers}\`\`\``,
				});
				embed.setTimestamp();
				embeds.push(embed);
				if (embeds.length == Math.ceil(shardInfo.length / 15)) {
					await ctx.messageHelper.paginate(embeds);
				}
			});
		}
	}
}
