// This is the standalone browser build entry point
// Browser implementation of the Algolia Search JavaScript client,
// using XMLHttpRequest, XDomainRequest and JSONP as fallback
module.exports = algoliasearch;

var inherits = require('inherits');
var Promise = global.Promise || require('es6-promise').Promise;

var AlgoliaSearch = require('../../AlgoliaSearch');
var inlineHeaders = require('../inline-headers');
var JSONPRequest = require('../JSONP-request');

function algoliasearch(applicationID, apiKey, opts) {
  var extend = require('extend');

  var getDocumentProtocol = require('../get-document-protocol');

  opts = extend(true, {}, opts) || {};

  if (opts.protocol === undefined) {
    opts.protocol = getDocumentProtocol();
  }

  opts._ua = algoliasearch.ua;

  return new AlgoliaSearchBrowser(applicationID, apiKey, opts);
}

algoliasearch.version = require('../../version.json');
algoliasearch.ua = 'Algolia for vanilla JavaScript ' + algoliasearch.version;

var support = {
  hasXMLHttpRequest: 'XMLHttpRequest' in window,
  hasXDomainRequest: 'XDomainRequest' in window,
  cors: 'withCredentials' in new XMLHttpRequest(),
  timeout: 'timeout' in new XMLHttpRequest()
};

function AlgoliaSearchBrowser() {
  // call AlgoliaSearch constructor
  AlgoliaSearch.apply(this, arguments);
}

inherits(AlgoliaSearchBrowser, AlgoliaSearch);

AlgoliaSearchBrowser.prototype._request = function(url, opts) {
  return new Promise(function(resolve, reject) {
    // no cors or XDomainRequest, no request
    if (!support.cors && !support.hasXDomainRequest) {
      // very old browser, not supported
      reject(new Error('CORS not supported'));
      return;
    }

    url = inlineHeaders(url, opts.headers);

    var body = null;
    var req = support.cors ? new XMLHttpRequest() : new XDomainRequest();
    var ontimeout;
    var timedOut;

    if (opts.body !== undefined) {
      body = JSON.stringify(opts.body);
    }

    // do not rely on default XHR async flag, as some analytics code like hotjar
    // breaks it and set it to false by default
    if (req instanceof XMLHttpRequest) {
      req.open(opts.method, url, true);
    } else {
      req.open(opts.method, url);
    }

    if (support.cors && body !== null && opts.method !== 'GET') {
      req.setRequestHeader('content-type', 'application/x-www-form-urlencoded');
    }

    // we set an empty onprogress listener
    // so that XDomainRequest on IE9 is not aborted
    // refs:
    //  - https://github.com/algolia/algoliasearch-client-js/issues/76
    //  - https://social.msdn.microsoft.com/Forums/ie/en-US/30ef3add-767c-4436-b8a9-f1ca19b4812e/ie9-rtm-xdomainrequest-issued-requests-may-abort-if-all-event-handlers-not-specified?forum=iewebdevelopment
    req.onprogress = function noop() {};

    req.onload = load;
    req.onerror = error;

    if (support.timeout) {
      // .timeout supported by both XHR and XDR,
      // we do receive timeout event, tested
      req.timeout = opts.timeout;

      req.ontimeout = timeout;
    } else {
      ontimeout = setTimeout(timeout, opts.timeout);
    }

    req.send(body);

    // event object not received in IE8, at least
    // but we do not use it, still important to note
    function load(/*event*/) {
      // When browser does not supports req.timeout, we can
      // have both a load and timeout event, since handled by a dumb setTimeout
      if (timedOut) {
        return;
      }

      if (!support.timeout) {
        clearTimeout(ontimeout);
      }

      var response = null;

      try {
        response = JSON.parse(req.responseText);
      } catch(e) {}

      resolve({
        body: response,
        statusCode: req.status
      });
    }

    function error(event) {
      if (timedOut) {
        return;
      }

      if (!support.timeout) {
        clearTimeout(ontimeout);
      }

      // error event is trigerred both with XDR/XHR on:
      //   - DNS error
      //   - unallowed cross domain request
      reject(new Error('Could not connect to host, error was:' + event));
    }

    function timeout() {
      if (!support.timeout) {
        timedOut = true;
        req.abort();
      }

      resolve(new Error('Timeout - Could not connect to endpoint ' + url));
    }

  });
};

AlgoliaSearchBrowser.prototype._request.fallback = function(url, opts) {
  url = inlineHeaders(url, opts.headers);

  return new Promise(function(resolve, reject) {
    JSONPRequest(url, opts, function JSONPRequestDone(err, content) {
      if (err) {
        reject(err);
        return;
      }

      resolve(content);
    });
  });
};

AlgoliaSearchBrowser.prototype._promise = {
  reject: function(val) {
    return Promise.reject(val);
  },
  resolve: function(val) {
    return Promise.resolve(val);
  },
  delay: function(ms) {
    return new Promise(function(resolve/*, reject*/) {
      setTimeout(resolve, ms);
    });
  }
};
