import { Server } from 'socket.io';

const CLIENT_EVENTS = {
  telemetry: 'telemetry',
  brokerStatus: 'broker-status',
  demoStatus: 'demo-status'
};

export function attachSocket(server, options = {}) {
  const io = new Server(server, {
    cors: { origin: true, credentials: true },
    ...options
  });

  io.on('connection', (socket) => {
    socket.emit(CLIENT_EVENTS.brokerStatus, {
      state: 'connecting',
      messageCount: 0,
      lastMessageAt: null
    });
  });

  return io;
}

export { CLIENT_EVENTS };