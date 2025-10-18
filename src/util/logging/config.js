import { CHANNEL_IDS } from '../../config/ids.js';

const DEFAULT_GENERAL_CHANNEL_ID = CHANNEL_IDS.logsGeneral;
const DEFAULT_JOIN2CREATE_CHANNEL_ID = CHANNEL_IDS.logsJoinToCreate;

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
