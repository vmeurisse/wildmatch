/**
 * Tests extracted from bash
 * Version used for import:
 *   http://www.bashcookbook.com/bashinfo/source/bash-4.3/tests/extglob.tests
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

suite('extglob', function() {
	makeTest.match('/dev/udp/129.22.8.102/45', '/dev/@(tcp|udp)/*/*');
	
	suite('valid numbers', function() {
		makeTest.match('12' ,'[1-9]*([0-9])');
		makeTest.nomatch('12abc', '[1-9]*([0-9])');
		makeTest.match('1', '[1-9]*([0-9])');
	});
	
	suite('octal numbers', function() {
		makeTest.match('07', '+([0-7])');
		makeTest.match('0377', '+([0-7])');
		makeTest.nomatch('09', '+([0-7])');
	});
	
	suite('stuff from korn\'s book', function() {
		makeTest.match('paragraph', 'para@(chute|graph)');
		makeTest.nomatch('paramour', 'para@(chute|graph)');
		makeTest.match('para991', 'para?([345]|99)1');
		makeTest.nomatch('para381', 'para?([345]|99)1');
		makeTest.nomatch('paragraph', 'para*([0-9])');
		makeTest.match('para', 'para*([0-9])');
		makeTest.match('para13829383746592', 'para*([0-9])');
		makeTest.nomatch('paragraph', 'para*([0-9])');
		makeTest.nomatch('para', 'para+([0-9])');
		makeTest.match('para987346523', 'para+([0-9])');
		makeTest.match('paragraph', 'para!(*.[0-9])');
		makeTest.match('para.38', 'para!(*.[0-9])');
		makeTest.match('para.graph', 'para!(*.[0-9])');
		makeTest.match('para39', 'para!(*.[0-9])');
	});
	
	suite('tests derived from those in rosenblatt\'s korn shell book', function() {
		makeTest.match('', '*(0|1|3|5|7|9)');
		makeTest.match('137577991', '*(0|1|3|5|7|9)');
		makeTest.nomatch('2468', '*(0|1|3|5|7|9)');
		makeTest.match('file.c' , '*.c?(c)');
		makeTest.nomatch('file.C', '*.c?(c)');
		makeTest.match('file.cc', '*.c?(c)');
		makeTest.nomatch('file.ccc', '*.c?(c)');
		makeTest.match('parse.y' , '!(*.c|*.h|Makefile.in|config*|README)');
		makeTest.nomatch('shell.c', '!(*.c|*.h|Makefile.in|config*|README)');
		makeTest.match('Makefile', '!(*.c|*.h|Makefile.in|config*|README)');
		makeTest.match('VMS.FILE;1', '*\\;[1-9]*([0-9])');
		makeTest.nomatch('VMS.FILE;0', '*\\;[1-9]*([0-9])');
		makeTest.nomatch('VMS.FILE;', '*\\;[1-9]*([0-9])');
		makeTest.match('VMS.FILE;139', '*\\;[1-9]*([0-9])');
		makeTest.nomatch('VMS.FILE;1N', '*\\;[1-9]*([0-9])');
	});
	
	suite('tests derived from the pd-ksh test suite', function() {
		makeTest.nomatch(['abcx', 'abcz', 'bbc'], '!([*)*');
		makeTest.nomatch(['abcx', 'abcz', 'bbc'], '+(a|b[)*');
		makeTest.nomatch(['abcx', 'abcz', 'bbc'], '[a*(]*)z');

		makeTest.nomatch(['abc'], '+()c');
		makeTest.nomatch(['abc'], '+()x');
		makeTest.match(['abc'], '+(*)c');
		makeTest.nomatch(['abc'], '+(*)x');
		
		makeTest.nomatch(['abc'], 'no-file+(a|b)stuff');
		makeTest.nomatch(['abc'], 'no-file+(a*(c)|b)stuff');
		
		makeTest.match(['abd', 'acd'], 'a+(b|c)d');
		makeTest.nomatch(['abc'], 'a+(b|c)d');
		
		makeTest.match(['acd'], 'a!(@(b|B))d');
		makeTest.nomatch(['abc', 'abd'], 'a!(@(b|B))d');
		
		makeTest.match(['abd'], 'a[b*(foo|bar)]d');
		makeTest.nomatch(['abc', 'acd'], 'a[b*(foo|bar)]d');
	});
	
	suite('simple kleene star tests', function() {
		makeTest.nomatch('foo', '*(a|b[)');
		makeTest.match('*(a|b[)', '*(a|b[)');
	});
	
	suite('check extended globbing in pattern removal -- these don\'t work right yet', function() {
		makeTest.match(['a', 'abc'], '+(a|abc)');
		makeTest.nomatch(['abcd', 'abcde', 'abcedf'], '+(a|abc)');
		
		makeTest.match(['f'], '+(def|f)');
		
		makeTest.match(['def'], '+(f|def)');
		makeTest.nomatch(['cdef', 'bcdef', 'abcedf'], '+(f|def)');
		
		makeTest.match(['abcd'], '*(a|b)cd');
		makeTest.nomatch(['a', 'ab', 'abc'], '*(a|b)cd');
		
		makeTest.nomatch(['a', 'ab', 'abc', 'abcde', 'abcdef'], '"*(a|b)cd"');
		
		
	});
	
	suite('More tests derived from a bug report concerning extended glob patterns following a *', function() {
		makeTest.match(['ab', 'abef'], 'ab*(e|f)');
		makeTest.nomatch(['abcdef', 'abcfef'], 'ab*(e|f)');
		
		makeTest.match(['abcfef', 'abef'], 'ab?*(e|f)');
		makeTest.nomatch(['ab', 'abcdef'], 'ab?*(e|f)');
		
		makeTest.match(['abcdef'], 'ab*d+(e|f)');
		makeTest.nomatch(['ab', 'abef', 'abcfef'], 'ab*d+(e|f)');
		
		makeTest.match(['ab', 'abcdef', 'abcfef', 'abef'], 'ab**(e|f)');
		
		makeTest.match(['abcdef', 'abef', 'abcfef'], 'ab*+(e|f)');
		makeTest.nomatch(['ab'], 'ab*+(e|f)');
		
		makeTest.match('abcfefg', 'ab**(e|f)');
		makeTest.match('abcfefg', 'ab**(e|f)g');
		makeTest.nomatch('ab', 'ab*+(e|f)');
		makeTest.match('abef', 'ab***ef');
		makeTest.match('abef', 'ab**');
	});
	
	suite('bug in all versions up to and including bash-2.05b', function() {
		makeTest.match('123abc', '*?(a)bc');
	});
	
	suite('with char classes', function() {
		makeTest.match(['a.b', 'a,b', 'a:b', 'a-b', 'a;b', 'a b', 'a_b'], 'a[^[:alnum:]]b');
		makeTest.match(['a.b', 'a,b', 'a:b', 'a-b', 'a;b', 'a b', 'a_b'], 'a[-.,:\;\ _]b');
		makeTest.match(['a.b', 'a,b', 'a:b', 'a-b', 'a;b', 'a b', 'a_b'], 'a@([^[:alnum:]])b');
		makeTest.match(['a.b', 'a,b', 'a:b', 'a-b', 'a;b', 'a b', 'a_b'], 'a@([-.,:; _])b');
		
		makeTest.match(['a.b'], 'a@([.])b');
		makeTest.nomatch(['a,b', 'a:b', 'a-b', 'a;b', 'a b', 'a_b'], 'a@([.])b');
		
		makeTest.match(['a,b', 'a:b', 'a-b', 'a;b', 'a b', 'a_b'], 'a@([^.])b');
		makeTest.nomatch(['a.b'], 'a@([^.])b');
		
		makeTest.match(['a.b', 'a,b', 'a:b', 'a-b', 'a;b', 'a b', 'a_b'], 'a@([^x])b');
		makeTest.match(['a.b', 'a,b', 'a:b', 'a-b', 'a;b', 'a b', 'a_b'], 'a+([^[:alnum:]])b');
	});
});
