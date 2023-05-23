import { PermissionsBitField } from "discord.js";

export default (permissions, channel, member) => {
	const missingPermissions = [];
	const ignoredPermissions = [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak];
	const perms = channel.permissionsFor(member);
	for (const perm of permissions) {
		if (!perms.has(perm) && !ignoredPermissions.includes(perm)) {
			missingPermissions.push(perm);
		}
	}

	return new PermissionsBitField(missingPermissions).toArray();
};
