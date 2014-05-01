Wildmatch
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

Options
-------

You can path an options object to wildmatch as third parameter. Options include:

 * `nocase`: if set, perform a case-insensitive match
 * `nopathname`: if not set, `?`, `*` and character class do not match the `/` character
