const profileAssistant = require('./profileAssistant');
const contentAssistant = require('./contentAssistant');
const matching = require('./matching');
const recommendations = require('./recommendations');
const insights = require('./insights');
const provider = require('./provider');
const rateLimit = require('./rateLimit');

module.exports = {
  ...profileAssistant,
  ...contentAssistant,
  ...matching,
  ...recommendations,
  ...insights,
  provider,
  rateLimit,
};
