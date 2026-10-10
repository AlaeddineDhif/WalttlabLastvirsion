import mqtt from 'mqtt';
import { EventEmitter } from 'node:events';
import { config } from '../config.js';
import { extractValues, parsePayload } from '../payload.js';

export class MqttBroker extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = { ...config.mqtt, ...options };
    this.client = null;
    this.state = 'connecting';
    this.lastError = null;
    this.messageCount = 0;
    this.lastMessageAt = null;
    this.errorDetected = false;
  }

  connect() {
    const { url, clientId, username, password } = this.options;

    if (!url || !username || !password) {
      this.setState('unconfigured');
      console.warn(
        '[wattlab] MQTT not configured (MQTT_URL / MQTT_USERNAME / MQTT_PASSWORD). ' +
          'Running on the simulated telemetry feed only.'
      );
      return this;
    }

    this.client = mqtt.connect(url, {
      clientId,
      username,
      password,
      clean: true,
      reconnectPeriod: 4000,
      connectTimeout: 10000,
      keepalive: 30
    });

    this.client.on('connect', () => {
      this.errorDetected = false;
      const topics = this.options.topic
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      topics.forEach((t) => this.client.subscribe(t, { qos: 0 }));
      this.setState('connected');
    });

    this.client.on('reconnect', () => this.setState('reconnecting'));
    this.client.on('close', () => this.setState(this.errorDetected ? 'error' : 'offline'));
    this.client.on('offline', () => this.setState('offline'));

    this.client.on('error', (err) => {
      this.lastError = err;
      this.errorDetected = /unauth|not auth|connection refused|handshake|closed|EAI_AGAIN|ENOTFOUND/i.test(
        err?.message || ''
      );
      this.setState('error');
    });

    this.client.on('message', (topic, payload) => this.handleMessage(topic, payload));
    return this;
  }

  handleMessage(topic, payload) {
    const text = payload.toString();
    const { obj } = parsePayload(text);
    this.messageCount += 1;
    this.lastMessageAt = new Date().toISOString();

    const packet = {
      ts: this.lastMessageAt,
      topic,
      src: 'mqtt',
      raw: text,
      ...extractValues(obj)
    };
    this.emit('telemetry', packet);
  }

  setState(state) {
    if (this.state === state) return;
    this.state = state;
    this.emit('status', this.status);
  }

  get status() {
    return {
      state: this.state,
      error: this.lastError ? this.lastError.message : null,
      broker: this.options.url,
      clientId: this.options.clientId,
      topic: this.options.topic,
      messageCount: this.messageCount,
      lastMessageAt: this.lastMessageAt
    };
  }

  end() {
    if (this.client) {
      try {
        this.client.end(true);
      } catch {
        /* ignore */
      }
    }
  }
}