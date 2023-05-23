import Command from "../../structures/Command";

export default class Ping extends Command {
	constructor(client) {
		super(client, {
			name: "ping",
			description: {
				content: "Displays the bot's latency.",
			},
			aliases: ["latency"],
			args: false,
			slashCommand: true,
		});
	}

	async run(client, ctx) {
		const msg = await ctx.sendDeferMessage(`${client.config.emojis.typing} Pinging...`);

		return ctx.editMessage(
			`Pong! (Latency: ${msg.createdTimestamp - ctx.createdTimestamp}ms. API Latency: ${Math.round(
				client.ws.ping
			)}ms.)`
		);
	}
}
