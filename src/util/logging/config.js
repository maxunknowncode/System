const DEFAULT_GENERAL_CHANNEL_ID = '1416432156770566184';
const DEFAULT_JOIN2CREATE_CHANNEL_ID = '1416432173690519562';

export const DEFAULT_LOG_CHANNEL_IDS = Object.freeze({
  generalChannelId: DEFAULT_GENERAL_CHANNEL_ID,
  joinToCreateChannelId: DEFAULT_JOIN2CREATE_CHANNEL_ID,
});

export function getLogChannelIds(env = process.env) {
  return {
    generalChannelId: env.LOG_CHANNEL_GENERAL_ID ?? DEFAULT_LOG_CHANNEL_IDS.generalChannelId,
    joinToCreateChannelId:
      env.LOG_CHANNEL_JOIN2CREATE_ID ?? DEFAULT_LOG_CHANNEL_IDS.joinToCreateChannelId,
  };
}
