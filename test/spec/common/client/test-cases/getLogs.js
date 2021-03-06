var cloneDeep = require('lodash-compat/lang/cloneDeep');
var merge = require('lodash-compat/object/merge');
var sinon = require('sinon');

var baseTestCase = {
  object: 'client',
  methodName: 'getLogs',
  action: 'read',
  expectedRequest: {
    method: 'GET',
    URL: {
      pathname: '/1/logs'
    }
  }
};

module.exports = [
  merge(
    cloneDeep(baseTestCase), {
      testName: 'client.getLogs(cb)',
      expectedRequest: {
        URL: {
          query: {
            offset: '0',
            length: '10'
          }
        }
      }
    }
  ),
  merge(
    cloneDeep(baseTestCase), {
      testName: 'client.getLogs(cb, offset)',
      callArguments: [25, sinon.spy()],
      expectedRequest: {
        URL: {
          query: {
            offset: '25',
            length: '10'
          }
        }
      }
    }
  ),
  merge(
    cloneDeep(baseTestCase), {
      testName: 'client.getLogs(cb, offset, length)',
      callArguments: [30, 20, sinon.spy()],
      expectedRequest: {
        URL: {
          query: {
            offset: '30',
            length: '20'
          }
        }
      }
    }
  )
];
