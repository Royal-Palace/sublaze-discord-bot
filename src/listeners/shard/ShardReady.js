import Event from "../../structures/Event";

export default class ShardReady extends Event {
	constructor(...args) {
		super(...args);
	}

	async run(shardID) {
		this.client.logger.ready("Shard %d ready", shardID);
	}
};
