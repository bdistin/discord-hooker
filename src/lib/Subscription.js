const { WebhookClient } = require('discord.js');

class Subscription {

	constructor(client, key, id, token, options = {}) {
		this.client = client;
		this.key = key;
		this.hook = new WebhookClient(id, token);
		this.username = options.username || null;
		this.avatarURL = options.avatarURL || null;
		this.cursor = null;
		this._setup();
	}

	async _setup() {
		this.cursor = await this.client.exchange.subscribe(this.key);
		this.cursor.on('data', this.relay.bind(this));
		this.cursor.on('error', console.error);
	}

	relay({ payload }) {
		if (typeof payload === 'string') return this.hook.send({ content: payload, username: this.username, avatarURL: this.avatarURL });
		payload.username = payload.username || this.username;
		payload.avatarURL = payload.avatarURL || this.avatarURL;
		return this.hook.send(payload);
	}

	close() {
		if (this.cursor) this.cursor.close();
	}

}

module.exports = Subscription;
