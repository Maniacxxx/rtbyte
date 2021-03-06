const { Command } = require('klasa');
const { MessageEmbed } = require('discord.js');
const { Colors, Emojis } = require('../../lib/util/constants');

module.exports = class extends Command {

	constructor(...args) {
		super(...args, {
			permissionLevel: 6,
			description: language => language.get('COMMAND_AUTORESPONDER_DESCRIPTION'),
			extendedHelp: language => language.get('COMMAND_AUTORESPONDER_EXTENDEDHELP', this.client.options.prefix),
			runIn: ['text'],
			subcommands: true,
			quotedStringSupport: true,
			usage: '<enable|disable|create|delete|update|set|remove|reset|show:default> [name:str] [value:channel|content:...str]',
			usageDelim: ' '
		});
	}

	async show(msg) {
		// Fetch required emojis and assiociate true or false with the corresponding one.
		const affirmEmoji = this.client.emojis.cache.get(Emojis.affirm);
		const rejectEmoji = this.client.emojis.cache.get(Emojis.reject);
		const status = {
			true: affirmEmoji,
			false: rejectEmoji
		};

		// Fetch autoresponder-related guild settings.
		const autoresponderEnabled = status[msg.guild.settings.get('autoresponder.autoresponderEnabled')];
		const autoresponses = msg.guild.settings.get('autoresponder.autoresponses').map(command => `• ${command.name}`).join('\n') || msg.language.get('NONE');
		// eslint-disable-next-line max-len
		const autoresponderIgnoredChannels = msg.guild.settings.get('autoresponder.autoresponderIgnoredChannels').map(channel => msg.guild.channels.cache.get(channel)).join(', ') || msg.language.get('NONE');


		// Build embed before sending.
		const embed = new MessageEmbed()
			.setAuthor(msg.language.get('COMMAND_AUTORESPONDER_SHOW_TITLE'), this.client.user.displayAvatarURL())
			.setColor(Colors.white)
			.addField(msg.language.get('ENABLED'), autoresponderEnabled, true)
			.addField(msg.language.get('COMMAND_AUTORESPONDER_SHOW_RESPONSES'), autoresponses)
			.addField(msg.language.get('COMMAND_MANAGEMENT_SHOW_IGNORED'), autoresponderIgnoredChannels)
			.setThumbnail(msg.guild.iconURL(), 50, 50)
			.setTimestamp()
			.setFooter(msg.language.get('COMMAND_REQUESTED_BY', msg), msg.author.displayAvatarURL());

		return msg.send('', { embed: embed });
	}

	async enable(msg) {
		// Fetch the autoresponder enabled boolean from the guild's settings.
		const autoresponderEnabled = msg.guild.settings.get('autoresponder.autoresponderEnabled');

		// If already enabled, stop process and inform the user.
		if (autoresponderEnabled) return msg.reject(msg.language.get('COMMAND_AUTORESPONDER_ENABLE_ALREADYENABLED'));

		// Set boolean to true and react with the affirm emoji to the user's message.
		await msg.guild.settings.update('autoresponder.autoresponderEnabled', true);
		return msg.affirm(msg.language.get('COMMAND_AUTORESPONDER_ENABLE_SUCCESS'));
	}

	async disable(msg) {
		// Fetch the autoresponder enabled boolean from the guild's settings.
		const autoresponderEnabled = msg.guild.settings.get('autoresponder.autoresponderEnabled');

		// If already disabled, stop process and inform the user.
		if (!autoresponderEnabled) return msg.reject(msg.language.get('COMMAND_AUTORESPONDER_DISABLE_ALREADYDISABLED'));

		// Set boolean to false and react with the affirm emoji to the user's message.
		await msg.guild.settings.update('autoresponder.autoresponderEnabled', false);
		return msg.affirm(msg.language.get('COMMAND_AUTORESPONDER_DISABLE_SUCCESS'));
	}

	async create(msg, [name, content]) {
		// Fetch the autoresponses array from the guild's settings.
		const autoresponses = msg.guild.settings.get('autoresponder.autoresponses');

		// If a autoresponder phrase (or word) or autoresponder response haven't been provided, stop process and inform user.
		if (!name) return msg.reject(msg.language.get('COMMAND_AUTORESPONDER_CREATE_NONAME'));
		if (!content) return msg.reject(msg.language.get('COMMAND_AUTORESPONDER_CREATE_NOCONTENT'));

		// Update the provided autoresponder phrase or word to be all lowercase.
		name = name.toLowerCase();

		// If the provided autoresponder phrase or word is already used in another autoresponse, stop process and inform user.
		const rspns = autoresponses.find(response => response.name.toLowerCase() === name);
		if (rspns) return msg.reject(msg.language.get('COMMAND_AUTORESPONDER_CREATE_ALREADYEXISTS', name));

		// Update the guild's autoresponses array and add the new autoresponse.
		await msg.guild.settings.update('autoresponder.autoresponses', { name: name, content: content });

		// Emit autoresponse created event, which shows up in a guild's log channel if the option is enabled.
		this.client.emit('autoresponseCreate', msg, name, content);

		return msg.affirm();
	}

	async delete(msg, [name]) {
		// Fetch the autoresponses array from the guild's settings.
		const autoresponses = msg.guild.settings.get('autoresponder.autoresponses');

		// If a If a autoresponder phrase or word hasn't been provided, stop process and inform user.
		if (!name) return msg.reject(msg.language.get('COMMAND_AUTORESPONDER_DELETE_NONAME'));

		// Update the provided autoresponder phrase or word name to be all lowercase.
		name = name.toLowerCase();

		// If the provided autoresponder phrase or word can't be found in any existing autoresponses, stop process and inform user.
		const rspns = autoresponses.find(response => response.name.toLowerCase() === name);
		if (!rspns) return msg.reject(msg.language.get('COMMAND_AUTORESPONDER_NOTEXIST', name));

		// Update the guild's autoresponses array and remove the specified autoresponse.
		await msg.guild.settings.update('autoresponder.autoresponses', rspns, { action: 'remove' });

		// Emit autoresponse deleted event, which shows up in a guild's log channel if the option is enabled.
		this.client.emit('autoresponseDelete', msg, name);

		return msg.affirm();
	}

	async update(msg, [name, content]) {
		// Fetch the autoresponses array from the guild's settings.
		const autoresponses = msg.guild.settings.get('autoresponder.autoresponses');

		// If a autoresponder phrase (or word) or autoresponder response haven't been provided, stop process and inform user.
		if (!name) return msg.reject(msg.language.get('COMMAND_AUTORESPONDER_UPDATE_NONAME'));
		if (!content) return msg.reject(msg.language.get('COMMAND_AUTORESPONDER_UPDATE_NOCONTENT'));

		// Update the provided autoresponder key phrase or word to be all lowercase.
		name = name.toLowerCase();

		// Find and fetch the specified autoresponse.
		const rspns = autoresponses.find(response => response.name.toLowerCase() === name);

		if (rspns) {
			// Remove old autoresponse, then re-add it with the updated autoresponse response.
			const remove = await msg.guild.settings.update('autoresponder.autoresponses', rspns, { action: 'remove' });
			const add = await msg.guild.settings.update('autoresponder.autoresponses', { name: rspns.name, content: content }, { action: 'add' });

			// If an error occurs during the removal or creation, stop process and inform user.
			if (add.errors.length || remove.errors.length) return msg.reject(msg.language.get('COMMAND_AUTORESPONDER_UPDATE_ERROR', name));

			// Emit autoresponse update event, which shows up in a guild's log channel if the option is enabled.
			this.client.emit('autoresponseUpdate', msg, name, content, rspns);

			return msg.affirm();
		} else {
			// If autoresponse was not found, stop process and inform user.
			return msg.reject(msg.language.get('COMMAND_AUTORESPONDER_NOTEXIST', name));
		}
	}

	async set(msg, [setting, value]) {
		if (!setting || setting !== 'ignored') return msg.reject(msg.language.get('COMMAND_AUTORESPONDER_NOSETTING'));

		setting = setting.toLowerCase();
		if (!value && setting === 'ignored') return msg.reject(msg.language.get('COMMAND_AUTORESPONDER_NOVALUE_CHANNEL'));

		const autoresponderIgnoredChannels = msg.guild.settings.get('autoresponder.autoresponderIgnoredChannels');

		if (setting === 'ignored') setting = 'autoresponderIgnoredChannels';

		if (setting === 'autoresponderIgnoredChannels' && autoresponderIgnoredChannels.includes(value.id)) return msg.reject(msg.language.get('COMMAND_AUTORESPONDER_SET_IGNORED_ALREADYADDED', value));

		await msg.guild.settings.update(`autoresponder.${setting}`, value);

		return msg.affirm();
	}

	async remove(msg, [setting, value]) {
		if (!setting || setting !== 'ignored') return msg.reject(msg.language.get('COMMAND_AUTORESPONDER_NOSETTING'));

		setting = setting.toLowerCase();
		if (!value && setting === 'ignored') return msg.reject(msg.language.get('COMMAND_AUTORESPONDER_REMOVE_ONLYIGNORED'));

		const autoresponderIgnoredChannels = msg.guild.settings.get('autoresponder.autoresponderIgnoredChannels');

		if (!autoresponderIgnoredChannels.find(channel => channel === value.id)) {
			return msg.reject(msg.language.get('COMMAND_AUTORESPONDER_REMOVE_NOTADDED', value));
		}

		await msg.guild.settings.update('autoresponder.autoresponderIgnoredChannels', value, { action: 'remove' });

		return msg.affirm();
	}

	async reset(msg, [setting]) {
		if (!setting || setting !== 'ignored') return msg.reject(msg.language.get('COMMAND_AUTORESPONDER_NOSETTING'));

		setting = setting.toLowerCase();

		const autoresponderIgnoredChannels = msg.guild.settings.get('autoresponder.autoresponderIgnoredChannels');

		if (setting === 'ignored') setting = 'autoresponderIgnoredChannels';

		if (setting === 'autoresponderIgnoredChannels' && !autoresponderIgnoredChannels.length) return msg.reject(msg.language.get('COMMAND_AUTORESPONDER_RESET_IGNORED_NOTSET'));

		await msg.guild.settings.reset(`autoresponder.${setting}`);

		return msg.affirm();
	}

};
