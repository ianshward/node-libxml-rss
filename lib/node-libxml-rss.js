var http = require('http'),
    libxml = require('libxmljs'),
    url = require('url');

/**
 * RSS.fetch
 *   check if already cached
 *   download the url
 *   cache it
 *   return a cache object
 * 
 * RSS.parse
 *   parse a cache result
 *   return a json object
 *
 * RSS.render
 *   way to generally render?
 *
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
  parser = new libxml.SaxParser(function(cb) {
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
  parser.parseString(xml);
}

Feed.prototype.clean = function(obj, callback) {
  // Loop through object, check for required elements, create simplified object.
  // Support RSS 2.0 and, eventually, Atom, for example.
  var rss2 = {};
  /* Channel information */
  if (typeof(obj.channel.title['#']) === 'string') {
    rss2.title = obj.channel.title['#'];
  }
  if (typeof(obj.channel.link['#']) === 'string') {
    rss2.link = obj.channel.link['#'];
  }
  rss2.description = obj.channel.description['#'];
  
  /* Items */
  rss2.items = [];
  if (obj.channel.item instanceof Array) {
    // for each item
    for (i in obj.channel.item) {
      if (obj.channel.item[i].title !== undefined || obj.channel.item[i].description !== undefined) {
        //rss2.items.push(items[i]);
        // for each element in item
        for (elem in obj.channel.item[i]) {
          //if (obj.channel.item[i][elem] instanceof Array) {
          //  // Iterate again
          //}
          //else {
            
            //console.log(rss2.items[i][elem]);
            //rss2.items[i][elem] = obj.channel.item[i][elem]['#'];
            //console.log(obj.channel.item[i][elem]['#']);
            
          //}
        }
      }
      else {
        // No title or description.  Invalid.
      }
    }
  }
  console.log(rss2);
}


exports.Feed = Feed;
