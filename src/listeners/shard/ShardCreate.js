import Event from "../../structures/Event";
import ShardMessage from "./ShardMessage";

export default class ShardCreate extends Event {
	constructor(...args) {
		super(...args);
	}

	async run(shard, manager, logger) {
		logger.ready("Shard %d created", shard.id);
		shard.on("message", (message) =>
			new ShardMessage(null, ShardMessage).run(shard, message, manager, logger)
		);
	}
}
