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
	subscriptions = [];
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
		for (const subscription of subscriptions) this.subscribe(subscription);
		this.commandSubscription = await this.exchange.subscribe(id => id.match('^hooker\\.'));
		this.commandSubscription.on('data', ({ id: key, payload }) => {
			const command = key.slice(7);
			if (command in this) this[command](payload);
		});
		this.commandSubscription.on('error', console.error);
	}

	subscribe({ key, id, token, options = {} }) {
		const sub = new Subscription(this, key, id, token, options);
		this.subscriptions.set(key, sub);
	}

	unsubscribe(key) {
		const sub = this.subscriptions.get(key);
		if (!sub) return;
		sub.close();
		this.subscriptions.delete(key);
	}

	async createSubscription(payload) {
		if (!payload.key || !payload.id || !payload.token) return;
		subscriptions.push(payload);
		await this.sync();
		this.subscribe(payload);
	}

	async removeSubscription(payload) {
		const index = subscriptions.findIndex(element => element.key === payload);
		if (index === -1) return;
		subscriptions.splice(index, 1);
		await this.sync();
		this.unsubscribe(payload);
	}

	sync() {
		return writeJSONAtomic(resolve(process.cwd(), 'subs.json'), subscriptions);
	}

}

module.exports = Client;
