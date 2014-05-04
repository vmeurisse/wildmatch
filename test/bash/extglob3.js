/**
 * Tests extracted from bash
 * Version used for import:
 *   http://www.bashcookbook.com/bashinfo/source/bash-4.3/tests/extglob3.tests
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
		makeTest.makeTest('match', text, pattern, { brace: true, extglob: true });
	},
	nomatch: function(text, pattern) {
		makeTest.makeTest('nomatch', text, pattern, { brace: true, extglob: true }, true);
	}
};

// Can be tested in bash with
// [[ ab/../ == @(ab|+([^/]))/..?(/) ]] && echo match || echo no match
suite('extglob3', function() {
	makeTest.match('ab/../', '@(ab|+([^/]))/..?(/)');
	makeTest.match('ab/../', '+([^/])/..?(/)');
	makeTest.match('ab/../', '@(ab|?b)/..?(/)');
	makeTest.match('ab/../', '+([^/])/../');
	makeTest.match('ab/../', '+([!/])/..?(/)');
	makeTest.match('ab/../', '@(ab|+([!/]))/..?(/)');
	makeTest.match('ab/../', '+([!/])/../');
	makeTest.match('ab/../', '+([!/])/..?(/)');
	makeTest.match('ab/../', '+([!/])/..@(/)');
	makeTest.match('ab/../', '+(ab)/..?(/)');
	makeTest.match('ab/../', '[!/][!/]/../');
	makeTest.match('ab/../', '@(ab|?b)/..?(/)');
	makeTest.match('ab/../', '[^/][^/]/../');
	makeTest.match('ab/../', '?b/..?(/)');
	makeTest.match('ab/../', '+(?b)/..?(/)');
	makeTest.match('ab/../', '+(?b|?b)/..?(/)');
	makeTest.match('ab/../', '@(?b|?b)/..?(/)');
	makeTest.match('ab/../', '@(a?|?b)/..?(/)');
	makeTest.match('ab/../', '?(ab)/..?(/)');
	makeTest.match('ab/../', '?(ab|??)/..?(/)');
	makeTest.match('ab/../', '@(??)/..?(/)');
	makeTest.match('ab/../', '@(??|a*)/..?(/)');
	makeTest.match('ab/../', '@(a*)/..?(/)');
	makeTest.match('ab/../', '+(??)/..?(/)');
	makeTest.match('ab/../', '+(??|a*)/..?(/)');
	makeTest.match('ab/../', '+(a*)/..?(/)');
	var j = '@(x)';
	makeTest.match('x', j);
});
