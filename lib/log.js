var logEnabled = process.env.ENABLE_LOG;

module.exports = function log() {
  if (logEnabled) {
    console.log.apply(console, arguments);
  }
};
