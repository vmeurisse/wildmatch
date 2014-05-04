function charMap (chars) {
	var map = [];
	chars = chars.split('');
	for (var i = 0, l = chars.length; i < l; i++) map[chars[i]] = true;
	return map;
}

var NEGATED_CLASS_CHAR = charMap('!^');
var EXTGLOB_START_CHAR = charMap('?*+@!');

var CHAR_CLASS = {
	alnum: /[a-zA-Z0-9]/,
	alpha: /[a-zA-Z]/,
	blank: /[ \t]/,
	cntrl: /[\x00-\x1F\x7F]/,
	digit: /[0-9]/,
	graph: /[\x21-\x7E]/,
	lower: /[a-z]/,
	print: /[\x20-\x7E]/,
	punct: /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/,
	space: /[ \t\r\n\v\f]/,
	upper: /[A-Z]/,
	xdigit: /[A-Fa-f0-9]/
};

var DEFAULT_OPTS = {
	case: true,
	pathname: false,
	extglob: true,
	brace: true,
	matchBase: false
};

var C_DEFAULT_OPTS = {
	case: true,
	pathname: false,
	extglob: false,
	brace: false,
	matchBase: false
};

/**
 * Match a ksh-style exglob pattern
 * ?(...) match zero or one time the given patterns
 * *(...) match zero or more time the given patterns
 * +(...) match one or more time the given patterns
 * @(...) match once the given patterns
 * !(...) match anything not in the given patterns
 */
function matchExtGlob(pattern, text, options, casePattern, patternPos, textPos) {
//console.log('matchExtGlob', pattern, text, options, casePattern, patternPos, textPos);
//console.log('             ' + pattern.slice(patternPos || 0), text.slice(textPos || 0));
	var extglob = parseList(pattern, patternPos + 1, '|', '(', ')', true);
	if (!extglob) {
		// The parenthesis not correctly closed. Treat the end of the pattern as a literal
		if (pattern.slice(patternPos) === text.slice(textPos)) return wildmatch.WM_MATCH;
		return wildmatch.WM_NOMATCH;
	}
	
	var extGlobType = pattern[patternPos];
	var initialPos = patternPos;
	patternPos = extglob.patternPos + 1;
	
	/**
	 * These can match 0 time. Directly try this before more complex options
	 */
	if (extGlobType === '*' || extGlobType === '?' || extGlobType === '!') {
		if (imatch(pattern, text, options, casePattern, patternPos, textPos) === wildmatch.WM_MATCH) {
			return wildmatch.WM_MATCH;
		}
	}
	
	var extglobs = extglob.items;
	var extglobsCase = parseList(casePattern, initialPos + 1, '|', '(', ')', true).items;
	var extglobsLength = extglobs.length;
	
// 	var specialChars = {
// 		'[': true,
// 		'?': true,
// 		'*': true,
// 		'+': true,
// 		'@': true,
// 		'!': true
// 	};
// 	if (options.brace) specialChars['{'] = true;
// 	
// 	if (!(pattern[patternPos] in specialChars)) {
// 		// If the next char in the pattern is a literal, we can skip all the char in the text until we found it
// 		var nextLiteral = (pattern[patternPos] === '\\') ? pattern[patternPos + 1] : pattern[patternPos];
// 	}
	
	var textPosStart = textPos;
	textPos++;
	
//	if (!pattern[patternPos]) textPos = text.length;
	
	for (var textLength = text.length; textPos <= textLength; ++textPos) {
// 		if (nextLiteral) {
// 			var pos = text.indexOf(nextLiteral, textPos);
// 			if (pos === -1) {
// 				return wildmatch.WM_NOMATCH;
// 			}
// 			textPos = pos;
// 		}
		
		var extGlobText = text.slice(textPosStart, textPos);
		
		var match;
		for (var i = 0; i < extglobsLength; ++i) {
			var extGlobPattern = extglobs[i];
			var extGlobCasePattern = extglobsCase[i];
			match = imatch(extGlobPattern, extGlobText, options, extGlobCasePattern);
			if (match === wildmatch.WM_MATCH) break;
		}
		if ((extGlobType === '!') === (match === wildmatch.WM_MATCH)) continue;
		
		match = imatch(pattern, text, options, casePattern, patternPos, textPos);
		if (match === wildmatch.WM_MATCH) return match;
		
		if (extGlobType === '*' || extGlobType === '+') {
			if (imatch(pattern, text, options, casePattern, initialPos, textPos) === wildmatch.WM_MATCH) {
				return wildmatch.WM_MATCH;
			}
		}
	}
	
	return wildmatch.WM_NOMATCH;
}

/**
 * Read a sequence inside the pattern and parse the first level
 * @param {string} pattern - the pattern to operate on
 * @param {integer} patternPos - the initial position in the pattern. Should correspond to the index of the opening char
 *                               of the list.
 * @param {char} sep - The char used to separate items of the list
 * @param {char} open - The opening char of the list. Used to spot sublists
 * @param {char} close - The closing char of the list
 * @param {boolean} parseClasses - If true, char classes inside list are read. eg `?([|])` should be parsed as `['[|]']`
 *                                 and not `['[', ']']`.
 * @return {null|Object} `null` if we cannot parse the list. Otherwise we return an object with `patternPos` equals to
 *                       the index of the closing char of the sequence and `items` an array of the parsed items in the
 *                       list
 */
function parseList(pattern, patternPos, sep, open, close, parseClasses) {
	var items = [];
	var item = '';
	
	var patternLength = pattern.length;
	
	var nbSublist = 0;
	var nbSubclass = 0;
	var classStart;
	var subClassStart;
	var patternChar = pattern[++patternPos];
	var itemStart = patternPos;
	for (;patternPos < patternLength; patternChar = pattern[++patternPos]) {
		if (patternChar === '\\') {
			patternPos++;
		} else if (patternChar === sep && nbSublist === 0 && nbSubclass == 0) {
			items.push(pattern.slice(itemStart, patternPos));
			itemStart = patternPos + 1;
		} else if (patternChar === open && nbSubclass === 0) {
			nbSublist++;
		} else if (patternChar === close && nbSubclass === 0) {
			nbSublist--;
			if (nbSublist < 0) {
				items.push(pattern.slice(itemStart, patternPos));
				break;
			}
		} else if (parseClasses) {
			if (patternChar === '[') {
				if (nbSubclass === 0) {
					if (pattern[patternPos + 1] in NEGATED_CLASS_CHAR) classStart = patternPos + 2;
					else classStart = patternPos + 1;
					nbSubclass = 1;
				} else if (nbSubclass === 1 && pattern[patternPos + 1] === ':') {
					subClassStart = patternPos + 2;
					nbSubclass = 2;
				}
			} else if (nbSubclass > 0 && patternChar === ']') {
				if (nbSubclass === 2 && patternPos > subClassStart && pattern[patternPos - 1] === ']') {
					nbSubclass = 1;
				} else if (patternPos > classStart) {
					nbSubclass = 0;
				}
			}
		}
	}
	
	if (patternChar === close) {
		return {
			patternPos: patternPos,
			items: items
		}
	}
	return null;
}

function imatch(pattern, text, options, casePattern, patternPos, textPos) {
//console.log('imatch', pattern, text, options, casePattern, patternPos, textPos);
//console.log('       ' + pattern.slice(patternPos || 0), text.slice(textPos || 0));
	var patternLength = pattern.length;
	var textLength = text.length;
	textPos = textPos || 0;
	patternPos = patternPos || 0;
	for (; patternPos < patternLength; patternPos++, textPos++) {
		var patternChar = pattern[patternPos];
		var textChar = text[textPos];
		
		if (!textChar) {
			// We are at the end of the text to match
			// return WM_ABORT_ALL unless the end of the pattern can be matched to the empty string:
			// *, *(...), ?(...) or !(...)
			if (!(
				patternChar === '*' ||
				(options.extglob && (patternChar === '?' || patternChar === '!') && pattern[patternPos + 1] === '(')
			)) {
				return wildmatch.WM_ABORT_ALL;
			}
		}
		
		if (options.extglob && patternChar in EXTGLOB_START_CHAR && pattern[patternPos + 1] === '(') {
			return matchExtGlob(pattern, text, options, casePattern, patternPos, textPos);
		}
		
		switch (patternChar) {
			case '?':
				if (options.pathname && textChar === '/') return wildmatch.WM_NOMATCH;
				continue;
			case '*':
				var matchSlaches = false;
				var nbStars = 1;
				while (pattern[++patternPos] === '*' && (!options.extglob || pattern[patternPos + 1] !== '(')) nbStars++;
				patternChar = pattern[patternPos];
				
				if (nbStars === 2) matchSlaches = true;
				if (nbStars === 1 && !options.pathname) matchSlaches = true;
				
				if (nbStars === 2 &&
				    (patternPos < 3 || pattern[patternPos - 3] === '/') &&
				    (!patternChar || patternChar === '/')) {
					// Pattern like /**/ or **/ or /**
					
					// If we are not at the end of the patterns, we first try if **/ can be matched to the empty string
					// eg. a/**/b => a/b
					// The case at the end of the pattern is treated just bellow
					if (patternChar && imatch(pattern, text, options, casePattern, patternPos + 1, textPos) === wildmatch.WM_MATCH) {
						return wildmatch.WM_MATCH;
					}
				} else if (nbStars >= 2 && options.pathname) {
					return wildmatch.WM_ABORT_MALFORMED;
				}
				
				if (!patternChar) {
					// We have a trailing star in the pattern
					if (!matchSlaches) {
						if (~text.indexOf('/', textPos)) {
							return wildmatch.WM_NOMATCH;
						}
					}
					return wildmatch.WM_MATCH;
				}
				
				if (!matchSlaches && patternChar === '/') {
					var slash = text.indexOf('/', textPos);
					if (slash === -1) return wildmatch.WM_NOMATCH;
					textPos = slash;
					break;
				}
				
				var specialChars = {
					'[': true,
					'?': true
				};
				if (options.brace) specialChars['{'] = true;
				if (options.extglob) for (var key in EXTGLOB_START_CHAR) specialChars[key] = true;
				if (!(patternChar in specialChars)) {
					// If the next char in the pattern is a literal, we can skip all the char in the text until we found it
					var nextLiteral = (patternChar === '\\') ? pattern[patternPos + 1] : patternChar;
				}
				for (; textPos <= textLength; ++textPos) {
//for (; textChar; textChar = text[++textPos]) {
					if (nextLiteral) {
						var pos = text.indexOf(nextLiteral, textPos);
						if (!matchSlaches && nextLiteral !== '/') var slashPos = text.indexOf('/', textPos);
						if (pos === -1 || (!matchSlaches && (slashPos !== -1 && slashPos < pos))) {
							return wildmatch.WM_NOMATCH;
						}
						textPos = pos;
					}
					var match = imatch(pattern, text, options, casePattern, patternPos, textPos);
					if (match !== wildmatch.WM_NOMATCH) return match;
				}
				continue;
			case '[':
				if (options.pathname && textChar === '/') return wildmatch.WM_NOMATCH;
				if (pattern[patternPos + 1] in NEGATED_CLASS_CHAR) {
					var negated = true;
					patternPos++;
				}
				var classMatch = false;
				var classSize = -1;
				
				var noPreviousRange = true; //Cannot use the previous char as begin in a [x-y] class
				var noRange = false;
				
				for (patternPos++; patternPos < patternLength; patternPos++) {
					patternChar = pattern[patternPos];
					classSize++;
					
					if (classSize !== 0 && patternChar === ']') break;
						
					if (patternChar === '-' && !noPreviousRange && patternPos < patternLength - 1 && pattern[patternPos + 1] !== ']') {
						var previousCharCode = casePattern[patternPos - 1].charCodeAt(0);
						
						patternChar = casePattern[++patternPos];
						if (patternChar === '\\') patternChar = casePattern[++patternPos];
						var charCode = patternChar.charCodeAt(0);
						
						var textCharCode = textChar.charCodeAt(0);
						
						if (textCharCode >= previousCharCode && textCharCode <= charCode) {
							classMatch = true;
						} else if (!options.case) {
							textCharCode = textChar.toLocaleUpperCase().charCodeAt(0);
							if (textCharCode >= previousCharCode && textCharCode <= charCode) {
								classMatch = true;
							}
						}
						noRange = true; //Prevent a second range in [a-e-n]
					} else if (patternChar === '[' && pattern[patternPos + 1] === ':') {
						patternPos += 2;
						var initialPos = patternPos;
						for (; patternPos < patternLength && pattern[patternPos] !== ']'; patternPos++);
						patternChar = pattern[patternPos];
						if (!patternChar) return wildmatch.WM_ABORT_ALL;
						
						if (pattern[patternPos - 1] === ':' && patternPos > initialPos) {
							var className = pattern.slice(initialPos, patternPos - 1);
							if (className in CHAR_CLASS) {
								if (CHAR_CLASS[className].test(textChar) ||
								    (className === 'upper' && !options.case && CHAR_CLASS['lower'].test(textChar))) {
									classMatch = true;
								}
								noRange = true; //Prevent [[:alpha:]-z] to match 'c'
							} else {
								return wildmatch.WM_ABORT_ALL;
							}
						} else {
							// Char class contain [: but do not match [:...:]
							// Treat it like a normal char class (eg. [[:] will match [ and :)
							// We return to the fist char and treat it like a literal
							patternPos = initialPos - 2;
							if (textChar === '[') {
								classMatch = true;
							}
						}
					} else {
						if (patternChar === '\\') {
							patternChar = pattern[++patternPos];
							if (!patternChar) return wildmatch.WM_ABORT_ALL;
						}
						if (patternChar === textChar) {
							classMatch = true;
						}
					}
					noPreviousRange = noRange;
					noRange = false;
				}
				if (patternPos >= patternLength) return wildmatch.WM_ABORT_ALL;
				if (!!classMatch === !!negated) return wildmatch.WM_NOMATCH;
				continue;
			case options.brace && '{':
				var braces = parseList(pattern, patternPos, ',', '{', '}');
				var isSequence = braces && braces.items.length === 1 && /^(?:[a-z]\.\.[a-z]|[A-Z]\.\.[A-Z]|-?\d+\.\.-?\d+)(?:\.\.-?\d+)?$/.test(braces.items[0]);
				
				if (!braces || (braces.items.length < 2 && !isSequence)) {
					// Invalid brace sequence. Treat is as a literal '{'
					if (textChar !== '{') return wildmatch.WM_NOMATCH;
					continue
				} else {
					patternPos = braces.patternPos;
					braces = braces.items;
				}
				
				if (isSequence) {
					var sequence = braces[0].split('..');
					braces = [];
					
					var start = +sequence[0];
					var end;
					var alpha = false;
					if (isNaN(start)) {
						alpha = true;
						start = sequence[0].charCodeAt(0);
						end = sequence[1].charCodeAt(0);
					} else {
						end = +sequence[1];
					}
					var increment = +sequence[2];
					if (!increment || increment * (end - start) < 0) {
						increment = start < end ? 1 : -1;
					}
					
					for (var i = start; increment * i <= increment * end; i += increment) {
						braces.push(alpha ? String.fromCharCode(i) : i);
					}
				}
				
				var patternEnd = pattern.slice(patternPos + 1);
				var casePatternEnd = casePattern.slice(patternPos + 1);
				for (var i = 0; i < braces.length; ++i) {
					var item = braces[i];
					if (imatch(item + patternEnd, text, options, item + casePatternEnd, 0, textPos) === wildmatch.WM_MATCH) {
						return wildmatch.WM_MATCH;
					}
				}
				return wildmatch.WM_NOMATCH;
			case '\\':
				patternChar = pattern[++patternPos];
				if (patternChar !== textChar) return wildmatch.WM_NOMATCH;
				continue;
			default:
				if (patternChar !== textChar) return wildmatch.WM_NOMATCH;
				continue;
		}
	}
	
	return (textPos >= textLength) ? wildmatch.WM_MATCH : wildmatch.WM_NOMATCH;
}

function match(pattern, text, options) {
	var lowPattern = pattern;
	
	if (!options.case) {
		lowPattern = pattern.toLocaleLowerCase();
		text = text.toLocaleLowerCase();
	}
	if (options.matchBase) {
		if (!~pattern.indexOf('/')) {
			var lastSlash = text.lastIndexOf('/');
			if (~lastSlash) text = text.slice(lastSlash + 1);
		}
	}
	
	return imatch(lowPattern, text, options, pattern);
}

function getWild(defaults) {
	for (var opts in DEFAULT_OPTS) {
		if (defaults[opts] === undefined) defaults[opts] = DEFAULT_OPTS[opts];
	}
	
	function wildmatch(text, pattern, options) {
		options = options || {};
		for (var opts in defaults) {
			if (options[opts] === undefined) options[opts] = defaults[opts];
		}
		return !match(pattern, text, options);
	}
	
	wildmatch.defaults = getWild;
	
	wildmatch.WM_CASEFOLD = 1;
	wildmatch.WM_PATHNAME = 2;
	
	wildmatch.WM_ABORT_MALFORMED = 2;
	wildmatch.WM_NOMATCH = 1;
	wildmatch.WM_MATCH = 0;
	wildmatch.WM_ABORT_ALL = -1;
	
	return wildmatch;
};

var wildmatch = getWild({});

wildmatch.c = function c(pattern, text, flags) {
	var options = C_DEFAULT_OPTS;
	if (flags) {
		options = Object.create(C_DEFAULT_OPTS);
		if (flags & wildmatch.WM_CASEFOLD) options.case = false;
		if (flags & wildmatch.WM_PATHNAME) options.pathname = true;
	}
	return match(pattern, text, options);
};



module.exports = wildmatch;
