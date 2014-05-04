/**
 * Tests extracted from bash
 * Version used for import:
 *   http://www.bashcookbook.com/bashinfo/source/bash-4.3/tests/extglob2.tests
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
suite('extglob2', function() {
	makeTest.match('fofo', '*(f*(o))');
	makeTest.match('ffo', '*(f*(o))');
	makeTest.match('foooofo', '*(f*(o))');
	makeTest.match('foooofof', '*(f*(o))');
	makeTest.match('fooofoofofooo', '*(f*(o))');
	makeTest.nomatch('foooofof', '*(f+(o))');
	makeTest.nomatch('xfoooofof', '*(f*(o))');
	makeTest.nomatch('foooofofx', '*(f*(o))');
	makeTest.match('ofxoofxo', '*(*(of*(o)x)o)');
	makeTest.nomatch('ofooofoofofooo', '*(f*(o))');
	makeTest.match('foooxfooxfoxfooox', '*(f*(o)x)');
	makeTest.nomatch('foooxfooxofoxfooox', '*(f*(o)x)');
	makeTest.match('foooxfooxfxfooox', '*(f*(o)x)');
	makeTest.match('ofxoofxo', '*(*(of*(o)x)o)');
	makeTest.match('ofoooxoofxo', '*(*(of*(o)x)o)');
	makeTest.match('ofoooxoofxoofoooxoofxo', '*(*(of*(o)x)o)');
	makeTest.match('ofoooxoofxoofoooxoofxoo', '*(*(of*(o)x)o)');
	makeTest.nomatch('ofoooxoofxoofoooxoofxofo', '*(*(of*(o)x)o)');
	makeTest.match('ofoooxoofxoofoooxoofxooofxofxo', '*(*(of*(o)x)o)');
	makeTest.match('aac', '*(@(a))a@(c)');
	makeTest.match('ac', '*(@(a))a@(c)');
	makeTest.nomatch('c', '*(@(a))a@(c)');
	makeTest.match('aaac', '*(@(a))a@(c)');
	makeTest.nomatch('baaac', '*(@(a))a@(c)');
	makeTest.match('abcd', '?@(a|b)*@(c)d');
	makeTest.match('abcd', '@(ab|a*@(b))*(c)d');
	makeTest.match('acd', '@(ab|a*(b))*(c)d');
	makeTest.match('abbcd', '@(ab|a*(b))*(c)d');
	makeTest.match('effgz', '@(b+(c)d|e*(f)g?|?(h)i@(j|k))');
	makeTest.match('efgz', '@(b+(c)d|e*(f)g?|?(h)i@(j|k))');
	makeTest.match('egz', '@(b+(c)d|e*(f)g?|?(h)i@(j|k))');
	makeTest.match('egzefffgzbcdij', '*(b+(c)d|e*(f)g?|?(h)i@(j|k))');
	makeTest.nomatch('egz', '@(b+(c)d|e+(f)g?|?(h)i@(j|k))');
	makeTest.match('ofoofo', '*(of+(o))');
	makeTest.match('oxfoxoxfox', '*(oxf+(ox))');
	makeTest.nomatch('oxfoxfox', '*(oxf+(ox))');
	makeTest.match('ofoofo', '*(of+(o)|f)');
	// The following is supposed to match only as fo+ofo+ofo
	makeTest.match('foofoofo', '@(foo|f|fo)*(f|of+(o))');
	makeTest.match('oofooofo', '*(of|oof+(o))');
	makeTest.match('fffooofoooooffoofffooofff', '*(*(f)*(o))');
	// The following tests backtracking in alternation matches
	makeTest.match('fofoofoofofoo', '*(fo|foo)');
	// Exclusion
	makeTest.match('foo', '!(x)');
	makeTest.match('foo', '!(x)*');
	makeTest.nomatch('foo', '!(foo)');
	makeTest.match('foo', '!(foo)*');
	makeTest.match('foobar', '!(foo)');
	makeTest.match('foobar', '!(foo)*');
	makeTest.match('moo.cow', '!(*.*).!(*.*)');
	makeTest.nomatch('mad.moo.cow', '!(*.*).!(*.*)');
	makeTest.nomatch('mucca.pazza', 'mu!(*(c))?.pa!(*(z))?');
	makeTest.match('fff', '!(f)');
	makeTest.match('fff', '*(!(f))');
	makeTest.match('fff', '+(!(f))');
	makeTest.match('ooo', '!(f)');
	makeTest.match('ooo', '*(!(f))');
	makeTest.match('ooo', '+(!(f))');
	makeTest.match('foo', '!(f)');
	makeTest.match('foo', '*(!(f))');
	makeTest.match('foo', '+(!(f))');
	makeTest.nomatch('f', '!(f)');
	makeTest.nomatch('f', '*(!(f))');
	makeTest.nomatch('f', '+(!(f))');
	makeTest.match('foot', '@(!(z*)|*x)');
	makeTest.nomatch('zoot', '@(!(z*)|*x)');
	makeTest.match('foox', '@(!(z*)|*x)');
	makeTest.match('zoox', '@(!(z*)|*x)');
	makeTest.match('foo', '*(!(foo))');
	makeTest.nomatch('foob', '!(foo)b*');
	makeTest.match('foobb', '!(foo)b*');
});
