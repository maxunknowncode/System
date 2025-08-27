import ensureVerifyMessage from '../../features/verify/ensure.js';
import { logger } from '../../util/logger.js';

export default {
  name: 'ready',
  once: true,
  async execute(client) {
    logger.info(`[READY] Logged in as ${client.user.tag}`);
    try {
      await ensureVerifyMessage(client);
    } catch (err) {
      logger.error('[verify] Failed to ensure verify message:', err);
    }
  },
};

