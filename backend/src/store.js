import { EventEmitter } from 'node:events';
import { config } from './config.js';

export class TelemetryStore extends EventEmitter {
  constructor(limit = config.historyLimit) {
    super();
    this.limit = limit;
    this._items = [];
    this._latest = null;
  }

  push(packet) {
    this._items.push(packet);
    if (this._items.length > this.limit) this._items.shift();
    this._latest = packet;
    this.emit('push', packet);
    return packet;
  }

  get latest() {
    return this._latest;
  }

  get history() {
    return this._items;
  }

  get count() {
    return this._items.length;
  }
}

export const store = new TelemetryStore();