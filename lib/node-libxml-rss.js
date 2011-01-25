var http = require('http'),
    libxml = require('libxmljs'),
    url = require('url');

/**
 * General TODO
 *   - add error handling
 *   - switch to SaxPushParser
 *
 */

function Feed() {
  // Nothing here.
};

Feed.prototype.fetch = function(path, cache, callback) {
  // @TODO: check if in cache
  var feed = url.parse(path);
  var host = feed.hostname;
  var port = url.port;
  var client = http.createClient(port || '80', host);
  var request = client.request('GET', path, {'host': host});
  request.end();
  request.on('response', function (response) {
    var data = [];
    response.setEncoding('utf8');
    response.on('data', function (chunk) {
      data.push(chunk);
    });
    response.on('end', function() {
      return callback(data.join(''));
      // @TODO: return and cache
    });
  });
}

Feed.prototype.parse = function(xml, cache, callback) {
  // @TODO: check if in cache (parsed object)
  var stack = [];
  parser = new libxml.SaxPushParser(function(cb) {
    // Based on https://gist.github.com/416021 by @mscdex
    cb.onStartElementNS(function(elem, attrs, prefix, uri, namespaces) {
      var obj = {};
      obj['@'] = {};
      obj['#'] = "";
      for (var i=0,len=attrs.length; i<len; i++)
        obj['@'][attrs[i][0]] = attrs[i][3];
        stack.push(obj);
    });
    cb.onEndElementNS(function(elem, prefix, uri) {
      var obj = stack.pop();
      if (stack.length > 0) {
        if (typeof stack[stack.length-1][elem] === 'undefined')
          stack[stack.length-1][elem] = obj;
        else if (Array.isArray(stack[stack.length-1][elem]))
          stack[stack.length-1][elem].push(obj);
        else {
          var old = stack[stack.length-1][elem];
          stack[stack.length-1][elem] = [];
          stack[stack.length-1][elem].push(old);
        }
      } 
      else {
        // Done parsing element.
        return callback(obj);
      }
    });
    cb.onCharacters(function(chars) {
      chars = chars.trim();
      if (chars != "")
        stack[stack.length-1]['#'] += chars;
      });
    });
  // Run the parser
  //parser.parseString(xml);
  parser.push(xml);
}

Feed.prototype.clean = function(obj, callback) {
  // Loop through object, check for required elements, create simplified object.
  // Support RSS 2.0 and, eventually, Atom, for example.
  var rss2 = {};
  // Channel information
  if (typeof(obj.channel.title['#']) === 'string') {
    rss2.title = obj.channel.title['#'];
  }
  if (typeof(obj.channel.link['#']) === 'string') {
    rss2.link = obj.channel.link['#'];
  }
  rss2.description = obj.channel.description['#'];
  
  // Items
  rss2.items = [];
  if (obj.channel.item instanceof Array) {
    var items = obj.channel.item;
    for (i in items) {
      rss2.items[i] = {};
      if (items[i].title !== undefined || items[i].description !== undefined) {
        for (elem in items[i]) {
          // @TODO recurse instead.
          if (items[i][elem] instanceof Array) {
            rss2.items[i][elem] = [];
            for (j in items[i][elem]) {
              rss2.items[i][elem][j] = {};
              rss2.items[i][elem][j].namespace = items[i][elem][j]['@'];
              rss2.items[i][elem][j].val = items[i][elem][j]['#'];
            }
          }
          else {
            // Skip parser-specific additives.
            if (elem !== '#' && elem !== '@') {
              rss2.items[i][elem] = items[i][elem]['#'];
            }
          }
        }
      }
      else {
        // No title or description.  Invalid.
        // @TODO handle error.
      }
    }
  }
  return callback(rss2);
}


exports.Feed = Feed;
