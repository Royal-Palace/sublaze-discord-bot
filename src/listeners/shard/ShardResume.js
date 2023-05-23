import Event from "../../structures/Event";

export default class ShardResume extends Event {
	constructor(...args) {
		super(...args);
	}

	async run(shardID) {
		this.client.logger.await("Shard %d resuming", shardID);
	}
};
