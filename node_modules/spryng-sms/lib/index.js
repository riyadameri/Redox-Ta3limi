'use strict';

var _SmsApiClient = require('./SmsApiClient');

var _SmsApiClient2 = _interopRequireDefault(_SmsApiClient);

var _ApiError = require('./errors/ApiError');

var _ApiError2 = _interopRequireDefault(_ApiError);

var _ArgumentError = require('./errors/ArgumentError');

var _ArgumentError2 = _interopRequireDefault(_ArgumentError);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = function (options) {
  return new _SmsApiClient2.default(options);
};

module.exports.SmsApiClient = _SmsApiClient2.default;
module.exports.ApiError = _ApiError2.default;
module.exports.ArgumentError = _ArgumentError2.default;