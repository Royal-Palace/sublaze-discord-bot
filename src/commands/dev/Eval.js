import { EmbedBuilder, MessageAttachment } from "discord.js";
import Discord from "discord.js";
import { inspect } from "util";

import Command from "../../structures/Command";

export default class Eval extends Command {
	constructor(client) {
		super(client, {
			name: "eval",
			description: {
				content: "Runs the code you give it.",
				usage: "<code>",
				examples: ["client.user", "9 + 10"],
			},
			args: true,
			aliases: ["ev", "evaluate"],
			permissions: {
				dev: true,
			},
		});
	}
	async run(client, ctx, args) {
		await ctx.sendDeferMessage(`${client.config.emojis.typing} Evaluating code...`);

		try {
			const code = args[0] == "-a" ? args.slice(1).join(" ") : args.join(" ");
			const fullCode = args[0] == "-a" ? "(async () => {\n{code}\n})()" : "{code}";
			const str = fullCode.replace("{code}", code);
			const output = inspect(await eval(str), { depth: 0 });

			if (output.includes(process.env.DISCORD_TOKEN))
				return ctx.editMessage("Cannot run command since the token will be leaked.");

			if (output.length < 1024 && code.length < 1024) {
				const embed = new EmbedBuilder()
					.addFields(
						{ name: "Input", value: `\`\`\`js\n${code}\`\`\`` },
						{ name: "Output", value: `\`\`\`js\n${output}\`\`\`` }
					)
					.setColor(client.config.colors.default);
				ctx.editMessage({ content: null, embeds: [embed] });
			} else {
				const attachmened = new MessageAttachment(Buffer.from(output), "output.txt");
				ctx.editMessage({ content: null, files: [attachmened] });
			}
		} catch (e) {
			ctx
				.editMessage(`An error occurred: \n\`\`\`js\n${e.message}\`\`\``)
				.catch((err) => client.logger.error(err));
		}
	}
}
