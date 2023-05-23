require("dotenv").config();
import { AutoPoster } from "topgg-autoposter";
import { init } from "@sentry/node";
import { ShardingManager } from "discord.js";
import { textSync } from "figlet";
import { ShardingClient } from "statcord.js";

import Logger from "./structures/Logger";

const logger = new Logger({
	displayTimestamp: true,
	displayDate: true,
});

const manager = new ShardingManager("./src/eartensifier.js", {
	token: process.env.DISCORD_TOKEN,
	respawn: true,
});

console.log(textSync(process.env.CLIENT_USERNAME));

if (process.platform != "linux") {
	const alias = {
		darwin: "macOS",
		win32: "Windows",
	};
	logger.error(
		"You must be on linux to run this bot. You are currently using:",
		alias[process.platform] || process.platform
	);
}

if (process.env.NODE_ENV == "production") {
	if (process.env.TOPGG_TOKEN) {
		const poster = AutoPoster(process.env.TOPGG_TOKEN, manager);
		poster.on("posted", (stats) => {
			logger.complete(
				"Posted stats to Top.gg: %d servers, %d shards",
				stats.serverCount,
				stats.shardCount
			);
		});
	} else logger.warn("Top.gg token missing");
}

if (process.env.STATCORD_TOKEN) {
	manager.statcord = new ShardingClient({
		key: process.env.STATCORD_TOKEN,
		manager,
		postCpuStatistics: true,
		postMemStatistics: true,
		postNetworkStatistics: true,
		autopost: true,
	});

	manager.statcord.on("autopost-start", () => {
		logger.ready("Started autopost");
	});

	manager.statcord.on("post", (status) => {
		if (!status) logger.complete("Posted stats to statcord.com");
		else logger.error(status);
	});
} else logger.warn("Statcord token missing");

if (process.env.NODE_ENV != "development") {
	if (process.env.SENTRY_DSN) {
		init({
			dsn: process.env.SENTRY_DSN,
			environment: process.env.NODE_ENV,
			release: require("../package.json").version,
			tracesSampleRate: 0.5,
		});
		logger.complete("Connected to Sentry");
	} else logger.warn("Sentry dsn missing.");
}
manager.spawn().catch((err) => logger.error(err));
import ShardCreate from "./listeners/shard/ShardCreate";
manager.on("shardCreate", (shard) =>
	new ShardCreate(null, ShardCreate).run(shard, manager, logger)
);
