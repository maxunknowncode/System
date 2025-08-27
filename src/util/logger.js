const levels = ['debug', 'info', 'warn', 'error'];
const current = process.env.LOG_LEVEL?.toLowerCase() || 'info';
const currentIndex = levels.indexOf(current);
function log(level, ...args) {
  if (levels.indexOf(level) >= currentIndex) {
    console[level](...args);
  }
}
export const logger = {
  debug: (...args) => log('debug', ...args),
  info: (...args) => log('info', ...args),
  warn: (...args) => log('warn', ...args),
  error: (...args) => log('error', ...args),
};
