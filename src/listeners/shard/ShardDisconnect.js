import Event from "../../structures/Event";

export default class ShardDisconnect extends Event {
	constructor(...args) {
		super(...args);
	}

	async run(closeEvent, shardID) {
		this.client.logger.offline("Shard %d disconnecting", shardID);
	}
};
