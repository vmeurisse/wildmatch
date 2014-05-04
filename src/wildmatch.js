var NEGATED_CLASS_CHAR = {
	'!': true,
	'^': true
};

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

/**
 * Read a sequence inside the pattern and parse the first level
 * @param {string} pattern - the pattern to operate on
 * @param {integer} patternPos - the initial position in the pattern. Should correspond to the index of the opening char
 *                               of the list.
 * @param {char} sep - The char used to separate items of the list
 * @param {char} open - The opening char of the list. Used to spot sublists
 * @param {char} close - The closing char of the list
 * @return {null|Object} `null` if we cannot parse the list. Otherwise we return an object with `patternPos` equals to
 *                       the index of the closing char of the sequence and `items` an array of the parsed items in the
 *                       list
 */
function parseList(pattern, patternPos, sep, open, close) {
	var items = [];
	var item = '';
	
	var patternLength = pattern.length;
	
	var nbOpen = 0;
	var patternChar = pattern[++patternPos];
	var itemStart = patternPos;
	for (;patternPos < patternLength; patternChar = pattern[++patternPos]) {
		if (patternChar === '\\') {
			patternPos++;
		} else if (patternChar === sep && nbOpen === 0) {
			items.push(pattern.slice(itemStart, patternPos));
			itemStart = patternPos + 1;
		} else if (patternChar === open) {
			nbOpen++;
		} else if (patternChar === close) {
			nbOpen--;
			if (nbOpen < 0) {
				items.push(pattern.slice(itemStart, patternPos));
				break;
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
	var patternLength = pattern.length;
	var textLength = text.length;
	textPos = textPos || 0;
	patternPos = patternPos || 0;
	for (; patternPos < patternLength; patternPos++, textPos++) {
		var patternChar = pattern[patternPos];
		var textChar = text[textPos];
		
		if (!textChar && patternChar !== '*') return wildmatch.WM_ABORT_ALL;
		
		switch (patternChar) {
			case '?':
				if (!options.nopathname && textChar === '/') return wildmatch.WM_NOMATCH;
				continue;
			case '*': 
				var matchSlaches = false;
				var nbStars = 1;
				while (pattern[++patternPos] === '*') nbStars++;
				patternChar = pattern[patternPos];
				
				if (nbStars === 2) matchSlaches = true;
				if (nbStars === 1 && options.nopathname) matchSlaches = true;
				
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
				} else if (nbStars >= 2 && !options.nopathname) {
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
				if (!(patternChar in specialChars)) {
					// If the next char in the pattern is a literal, we can skip all the char in the text until we found it
					var nextLiteral = (patternChar === '\\') ? pattern[patternPos + 1] : patternChar;
				} 
				for (; textChar; textChar = text[++textPos]) {
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
				if (!options.nopathname && textChar === '/') return wildmatch.WM_NOMATCH;
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
						} else if (options.nocase) {
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
								    (className === 'upper' && options.nocase && CHAR_CLASS['lower'].test(textChar))) {
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
	if (options.nocase) {
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

function wildmatch(text, pattern, options) {
	return !match(pattern, text, options || {});
}

wildmatch.c = function c(pattern, text, flags) {
	var options = {};
	if (flags & wildmatch.WM_CASEFOLD) options.nocase = true;
	if (!(flags & wildmatch.WM_PATHNAME)) options.nopathname = true;
	return match(pattern, text, options);
};

wildmatch.WM_CASEFOLD = 1;
wildmatch.WM_PATHNAME = 2;

wildmatch.WM_ABORT_MALFORMED = 2;
wildmatch.WM_NOMATCH = 1;
wildmatch.WM_MATCH = 0;
wildmatch.WM_ABORT_ALL = -1;

module.exports = wildmatch;
