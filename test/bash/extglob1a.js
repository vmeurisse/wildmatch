/**
 * Tests extracted from bash
 * Version used for import:
 *   http://www.bashcookbook.com/bashinfo/source/bash-4.3/tests/extglob1a.sub
 */

var assert = require('assert');
var wildmatch = require('../../src/wildmatch');

var makeTest = {
	makeTest: function(name, text, pattern, options, nomatch) {
		if (!Array.isArray(text)) text = [text];
		text.forEach(function(text) {
			test(name + ' <' + text + '> <' + pattern + '>', function() {
				
				var res = wildmatch(text, pattern, options);
				assert.equal(res, !nomatch, 'Expected ' + (nomatch ? 'no ' : '') + 'match, got ' + res);
				
			});
		});
	},
	
	match: function(text, pattern) {
		makeTest.makeTest('match', text, pattern, { brace: true, extglob: true, nopathname: true });
	},
	nomatch: function(text, pattern) {
		makeTest.makeTest('nomatch', text, pattern, { brace: true, extglob: true, nopathname: true }, true);
	}
};

suite('extglob1a', function() {
	makeTest.match(['a', 'ab'], 'a*!(x)');
	makeTest.nomatch(['ba'], 'a*!(x)');
	
	makeTest.match(['a', 'ab'], 'a!(x)');
	makeTest.nomatch(['ba'], 'a!(x)');
	
	makeTest.match(['a', 'ab'], 'a*?(x)');
	makeTest.nomatch(['ba'], 'a*?(x)');
	
	makeTest.match(['a'], 'a?(x)');
	makeTest.nomatch(['ab', 'ba'], 'a?(x)');
	
});
