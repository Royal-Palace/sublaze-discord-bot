require("events").defaultMaxListeners = 30;
import Blzer from "./structures/Client";
const client = new Blzer();

process.on("uncaughtException", (e) => {
	client.logger.error(e);
});

process.on("unhandledRejection", (e) => {
	client.logger.error(e);
});

client.login(process.env.DISCORD_TOKEN);
