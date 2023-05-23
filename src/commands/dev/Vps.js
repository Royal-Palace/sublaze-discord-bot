import Command from '../../structures/Command';

import { EmbedBuilder } from 'discord.js';
import { uptime, type, release, arch, cpus, totalmem, loadavg } from 'os';

export default class Vps extends Command {
    constructor(client) {
        super(client, {
            name: 'vps',
            description: {
                content: 'Displays the VPS\' info.',
            },
            aliases: ['vpsinfo', 'vpsstats'],
            cooldown: 5,
            args: false,
            permissions: {
                dev: true,
            },
        });
    }
    async run(client, ctx) {
        const totalSeconds = uptime();
        const realTotalSecs = Math.floor(totalSeconds % 60);
        const days = Math.floor((totalSeconds % (31536 * 100)) / 86400);
        const hours = Math.floor((totalSeconds / 3600) % 24);
        const mins = Math.floor((totalSeconds / 60) % 60);

        const statsEmbed = new EmbedBuilder()
            .setAuthor({ name: 'VPS' })
            .setColor(client.config.colors.default)
            .addFields(
                { name: 'Host', value: `${type()} ${release()} (${arch()})` },
                { name: 'CPU', value: `${cpus()[0].model}` },
                { name: 'Uptime', value: `${days} days, ${hours} hours, ${mins} minutes, and ${realTotalSecs} seconds` },
                { name: 'RAM', value: `${(totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB` },
                { name: 'Memory Usage', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB` },
                { name: 'CPU Load', value: `${(loadavg()[0]).toFixed(2)}%` },
                { name: 'CPU Cores', value: `${cpus().length}` },
            )
            .setFooter({ text: `Node Version: ${process.version}` })
            .setTimestamp();
        return ctx.sendMessage({ content: null, embeds: [statsEmbed] });
    }
};