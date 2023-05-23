import { Source, VoiceConnection } from "yasha";
import { Collection } from "discord.js";
import EventEmitter from "events";
import { TrackPlaylist } from "yasha/src/Track";

import Player from "./Player";
import { reduceThumbnails } from "../helpers/QueueHelper";
import { getDefaultVolume } from "../helpers/DatabaseHelper";
import Logger from "./Logger";

export default class Manager extends EventEmitter {
	constructor() {
		super();
		this.players = new Collection();

		this.logger = new Logger({
			displayTimestamp: true,
			displayDate: true,
		});
	}

	async newPlayer(guild, voiceChannel, textChannel, volume) {
		const dbVolume = await getDefaultVolume(guild);
		const player = new Player({
			manager: this,
			guild: guild,
			voiceChannel: voiceChannel,
			textChannel: textChannel,
			volume: dbVolume ? dbVolume : volume,
		});

		this.players.set(player.guild.id, player);

		player.on("ready", () => {
			this.trackStart(player);
		});

		player.on("finish", () => {
			this.trackEnd(player, true);
		});

		player.on(VoiceConnection.Status.Destroyed, () => {
			if (player) player.destroy(true);
		});

		player.on("error", (err) => {
			this.logger.error(`${player.queue.current.id} ${err} ${err.stack}`);
			player.skip();
		});

		return player;
	}

	trackStart(player) {
		player.playing = true;
		player.paused = false;

		const track = player.queue.current;
		this.emit("trackStart", player, track);
	}

	trackEnd(player, finished) {
		const track = player.queue.current;
		if (!track.duration) track.duration = player.getDuration();

		if (track && player.trackRepeat) {
			this.emit("trackEnd", player, track, finished);
			player.play();
			return;
		}

		if (track && player.queueRepeat) {
			player.queue.add(player.queue.current);
			player.queue.current = player.queue.shift();

			this.emit("trackEnd", player, track, finished);
			player.play();
			return;
		}

		if (player.queue.length > 0) {
			player.queue.current = player.queue.shift();

			this.emit("trackEnd", player, track, finished);
			player.play();
			return;
		}

		if (!player.queue.length && player.queue.current) {
			this.emit("trackEnd", player, track, finished);
			player.stop();
			player.queue.current = null;
			player.playing = false;
			return this.queueEnd(player, track);
		}
	}

	queueEnd(player, track) {
		this.emit("queueEnd", player, track);
	}

	get(guild) {
		return this.players.get(guild.id);
	}

	destroy(guild) {
		this.players.delete(guild.id);
	}

	async search(query, requester, s) {
		let track;
		let source = s;

		try {
			switch (source) {
				case "soundcloud":
					track = (await Source.Soundcloud.search(query))[0];
					break;
				case "spotify":
					track = (await Source.Spotify.search(query))[0];
					break;
				case "apple":
					track = (await Source.AppleMusic.search(query))[0];
					break;
				default:
					track = await Source.resolve(query);
					break;
			}

			if (!track || track.source == "youtube") {
				track = (await Source.Soundcloud.search(query))[0];
				source = "soundcloud";
			}

			if (!track) throw new Error("No track found");
			else {
				if (track instanceof TrackPlaylist) {
					track.forEach((t) => {
						t.requester = requester;
						t.icon = null;
						t.thumbnail = reduceThumbnails(t.thumbnails);
					});
				} else {
					track.requester = requester;
					track.icon = null;
					track.thumbnail = reduceThumbnails(track.thumbnails);
				}
				return track;
			}
		} catch (err) {
			throw new Error(err);
		}
	}

	getPlayingPlayers() {
		return this.players.filter((p) => p.playing);
	}
}
