const { Collection } = require('discord.js');
const { Exchange } = require('redash-pubsub');
const { writeJSONAtomic } = require('fs-nextra');
const { resolve } = require('path');
const Subscription = require('./Subscription');
let config;
try {
	config = require(resolve(process.cwd(), 'config.json'));
} catch (err) {
	config = {};
}
let subscriptions;
try {
	subscriptions = require(resolve(process.cwd(), 'subs.json'));
} catch (err) {
	subscriptions = {};
	writeJSONAtomic(resolve(process.cwd(), 'subs.json'), subscriptions);
}

class Client {

	constructor() {
		this.exchange = new Exchange('myPubSub', config);
		this.subscriptions = new Collection();
		this.commandSubscription = null;
		this._setup();
	}

	async _setup() {
		for (const key in subscriptions) this.subscribe(key, subscriptions[key]);
		this.commandSubscription = await this.exchange.subscribe(id => id.match('^hooker\\.'));
		this.commandSubscription.on('data', ({ id: key, payload }) => {
			const command = key.slice(7);
			if (command in this) this[command](payload);
		});
		this.commandSubscription.on('error', console.error);
	}

	subscribe(key, options = {}) {
		const subscription = this.subscriptions.get(key);
		if (subscription) return options.subs.map(sub => subscription.add(sub.id, sub.token));
		const sub = new Subscription(this, key, options);
		return this.subscriptions.set(key, sub);
	}

	unsubscribe(key) {
		const sub = this.subscriptions.get(key);
		if (!sub) return;
		sub.close();
		this.subscriptions.delete(key);
	}

	async createSubscription(payload) {
		if (!payload.key || !payload.id || !payload.token) return;
		if (payload.key in subscriptions) subscriptions[payload.key].subs.push({ id: payload.id, token: payload.token });
		else subscriptions[payload.key] = { username: payload.username, avatarURL: payload.avatarURL, subs: [{ id: payload.id, token: payload.token }] };
		await this.sync();
		this.subscribe(payload.key, payload);
	}

	async removeSubscription(payload) {
		const index = subscriptions[payload.key].subs.findIndex(element => element.id === payload.id);
		if (index === -1) return;
		subscriptions[payload.key].subs.splice(index, 1);
		if (subscriptions[payload.key].subs.length === 0) {
			delete subscriptions[payload.key];
			this.unsubscribe(payload);
		}
		await this.sync();
	}

	sync() {
		return writeJSONAtomic(resolve(process.cwd(), 'subs.json'), subscriptions);
	}

}

module.exports = Client;
