var assert = require('assert');
var wildmatch = require('../src/wildmatch');

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
		makeTest.makeTest('match', text, pattern, { brace: true });
	},
	nomatch: function(text, pattern) {
		makeTest.makeTest('nomatch', text, pattern, { brace: true }, true);
	},

};

// brace expansion pattern can be tested in bash
// $echo {1..4}a
// 1a 2a 3a 4a
suite('braces', function() {
	suite('Basic braces', function() {
		makeTest.match(['abc', 'zbc'], '{a,z}bc');
		makeTest.nomatch('bbc', '{a,z}bc');
		makeTest.match(['bca', 'bcz'], 'bc{a,z}');
	});
	
	suite('sequence', function() {
		// normal sequence
		makeTest.match(['1', '2'], '{1..2}');
		makeTest.nomatch(['0', '3'], '{1..2}');
		
		// backward counting
		makeTest.match(['1023', '1022', '1021'], '{1023..1021}');
		makeTest.nomatch(['1024', '1020'], '{1023..1021}');
		
		// forced step
		makeTest.match(['1', '4', '10'], '{1..10..3}');
		makeTest.nomatch(['0', '2', '3', '13'], '{1..10..3}');
		
		// forced step, last number is not in the result
		makeTest.match(['1', '5', '9'], '{1..10..4}');
		makeTest.nomatch(['0', '4', '10', '13'], '{1..10..4}');
		
		// negative start
		makeTest.match(['-1', '0', '1', '2'], '{-1..2}');
		makeTest.nomatch(['-2', '3', 'a'], '{-1..2}');
		
		// negative steps
		makeTest.match(['5', '2', '-1'], '{5..-2..-3}');
		makeTest.nomatch(['6', '4', '-2'], '{5..-2..-3}');
		
		// start equal end
		makeTest.match(['1'], '{1..1}');
		makeTest.nomatch(['0', '2', '-1'], '{1..1}');
		
		// invalid steps: wrong sign
		makeTest.match(['5', '6', '7'], '{5..7..-3}');
		makeTest.nomatch(['2'], '{5..7..-3}');
		
		// invalid steps: 0
		makeTest.match(['5', '6', '7'], '{5..7..0}');
		makeTest.nomatch(['4', '8'], '{5..7..0}');
	});
	
	suite('letter sequences', function() {
		// normal sequence
		makeTest.match(['a', 'b', 'c'], '{a..c}');
		makeTest.nomatch(['d', 'a..c'], '{a..c}');
		
		makeTest.match(['A', 'B', 'C'], '{C..A}');
		makeTest.nomatch(['a', 'D'], '{C..A}');
		
		makeTest.match(['a', 'c'], '{a..c..2}');
		makeTest.nomatch(['b'], '{a..c..2}');
	});
	
	suite('nested', function() {
		makeTest.match(['abc', '1bc', '2bc'], '{a,{1..2}}bc');
		makeTest.nomatch(['bc', '{1..2}bc', '{a,{1..2}}bc'], '{a,{1..2}}bc');
		
		makeTest.match(['br1', 'br2', 'brab', 'bracd', 'brace'], 'br{{1..2},a{b,c{d,e}}}');
		makeTest.nomatch(['brace1'], 'br{{1..2},a{b,c{d,e}}}');
	});
	
	suite('escape', function() {
		makeTest.match(['a','b}'], '{a,b\\}}');
		makeTest.nomatch(['b'], '{a,b\\}}');
		
		makeTest.match(['a,b','c'], '{a\\,b,c}');
		makeTest.nomatch(['a', 'b'], '{a\\,b,c}');
	});
	
	
	suite('invalid', function() {
		makeTest.match(['{a}'], '{a}');
		makeTest.nomatch(['a'], '{a}');
		
		makeTest.match(['{a,b'], '{a,b');
		makeTest.nomatch(['a', 'b'], '{a,b');
		
		makeTest.match(['{a,b}'], '{a,b\\}');
		makeTest.nomatch(['a', 'b}', '{a,b\\}'], '{a,b\\}');
		
		makeTest.match(['a', '{b}'], '{a,{b}}');
		makeTest.nomatch(['{a,{b}}', 'b'], '{a,{b}}');
		
		makeTest.match(['a', '{b}'], '{a,{b}}');
		makeTest.nomatch(['{a,{b}}', 'b'], '{a,{b}}');
		
		makeTest.match(['a}', '{b}'], '{a,\\{b}}');
		makeTest.nomatch(['a'], '{a,\\{b}}');
		
		makeTest.match(['{a,b', '{a,c'], '{a,{b,c}');
		makeTest.nomatch(['a', '{b', '{b,c'], '{a,{b,c}');
		
		makeTest.match(['{a..C}'], '{a..C}');
		makeTest.nomatch(['a', 'C'], '{a..C}');
		
		makeTest.match(['{a..1}'], '{a..1}');
		makeTest.nomatch(['a', '1'], '{a..1}');
		
		makeTest.match(['{1.1..2.1}'], '{1.1..2.1}');
		makeTest.nomatch(['1.1', '2.1'], '{1.1..2.1}');
		
		makeTest.match(['{1..2..1..2}'], '{1..2..1..2}');
		makeTest.nomatch(['1', '2'], '{1.1..2.1}');
	
		makeTest.match(['{a..b..a}'], '{a..b..a}');
		makeTest.nomatch(['a', 'b'], '{1.1..2.1}');
		
	});
});
