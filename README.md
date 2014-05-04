Wildmatch [![NPM version](https://badge.fury.io/js/wildmatch.svg)](http://badge.fury.io/js/wildmatch) [![Build status](https://travis-ci.org/vmeurisse/wildmatch.svg?branch=master)](http://travis-ci.org/vmeurisse/wildmatch)
=========

Port in JS of the matching library used by Git.

Unlike other libraries like `minimatch`, it doesn't use regexp and use a real parser.

Usage
-----

````js
var wildmatch = require('wildmatch');

wildmatch('bar.foo', '*.foo'); //=> true
wildmatch('bar.foo', '*.bar'); //=> false
wildmatch('D', '[[:xdigit:]]'); //=> true
````

Syntax
------

Wildmatch support the following features:

 * `?`: Match a singe character
 * `*`: Match any string
 * Character classes: list (`[asd]`), ranges (`[a-z]`), POSIX named classes (`[[:alpha:]]`), negation (`[!a-f]` or `[^a-f]`)
 * Braces expansion: `file.{js,json}` will match `file.js` and `file.json`.
 * Sequences: `{-1..1}` will turn into (`-1` or `0` or `1`). You can also set a step size (`{-5..5..5}` => `-5`, `0`, `5`), use letters (`{a..e..2}` => `a`, `c`, `e`), and count backward (`{Z..X}` => `Z`, `Y`, `X`)
 * Extended glob: `pattern-list` is a list of patterns separated by `|`
   * `?(pattern-list)`: Matches zero or one occurrence of the given patterns
   * `*(pattern-list)`: Matches zero or more occurrences of the given patterns
   * `+(pattern-list)`: Matches one or more occurrences of the given patterns
   * `@(pattern-list)`: Matches one occurrences of the given patterns
   * `!(pattern-list)`: Matches anything except one of the given patterns

Options
-------

You can path an options object to wildmatch as third parameter. Options include:

 * `matchBase`: If set, then patterns without slashes will be matched against the basename of the path if it contains slashes. For example, `a?b` would match the path `/xyz/123/acb`, but not `/xyz/acb/123`.
 * `case`: if set to `false`, perform a case-insensitive match
 * `pathname`: if set, `?`, `*` and character class do not match the `/` character
 * `braces`: set it to `false` to disable the processing of curly braces (braces expansion and sequences)
 * `extglob`: set it to `false` to disable the match of extended glob pattern lists
