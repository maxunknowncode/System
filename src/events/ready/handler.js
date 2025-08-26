import ensureVerifyMessage from '../../features/verify/ensure.js';

export default {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`[events] Logged in as ${client.user.tag}`);
    try {
      await ensureVerifyMessage(client);
    } catch (err) {
      console.error('[verify] Failed to ensure verify message:', err);
    }
  },
};

