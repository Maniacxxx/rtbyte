const { Task } = require('klasa');
const { MessageEmbed } = require('discord.js');

module.exports = class extends Task {

	async run({ guildID, userID, userTag }) {
		const guild = this.client.guilds.get(guildID);
		if (!guild) return;

		const bans = await guild.fetchBans();
		if (!bans.has(userID)) return;

		await guild.members.unban(userID);

		if (guild.settings.logs.moderation.unban) await this.unBanLog(guild, userID, userTag);
	}

	async unBanLog(guild, userID, userTag) {
		const embed = new MessageEmbed()
			.setColor(this.client.settings.colors.yellow)
			.setTimestamp()
			.setFooter(guild.language.get('GUILD_LOG_GUILDMEMBERBANREMOVE'));

		let user = {};

		if (this.client.users.has(userID)) user = this.client.users.get(userID);

		embed.setAuthor(`${user.tag ? user.tag : userTag} (${user.id ? user.id : userID})`, user.id ? user.displayAvatarURL() : null);

		return;
	}

};
