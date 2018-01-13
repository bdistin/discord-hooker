const { WebhookClient, Collection } = require('discord.js');

class Subscription {

	constructor(client, key, { username, avatarURL, subs = [] } = {}) {
		this.client = client;
		this.key = key;
		this.hooks = new Collection();
		this.username = username || null;
		this.avatarURL = avatarURL || null;
		this.cursor = null;
		this._setup(subs);
	}

	async _setup(subs) {
		this.cursor = await this.client.exchange.subscribe(this.key);
		this.cursor.on('data', this.relay.bind(this));
		this.cursor.on('error', console.error);
		for (const sub of subs) this.add(sub.id, sub.token);
	}

	add(id, token) {
		const hook = new WebhookClient(id, token);
		this.hooks.set(id, hook);
		return hook;
	}

	relay({ payload }) {
		if (typeof payload === 'string') return this.send({ content: payload, username: this.username, avatarURL: this.avatarURL });
		payload.username = payload.username || this.username;
		payload.avatarURL = payload.avatarURL || this.avatarURL;
		return this.send(payload);
	}

	send(payload) {
		return Promise.all(this.hooks.map(hook => hook.send(payload).catch(console.error)));
	}

	close() {
		if (this.cursor) this.cursor.close();
	}

}

module.exports = Subscription;
