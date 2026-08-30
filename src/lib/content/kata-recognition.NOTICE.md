# Cari Kata recognition vocabulary

`kata-recognition.js` contains a filtered and reviewed vocabulary derived from:

- **Indonesian Hunspell dictionary**, created by Benitius Brevoort (copyright
  2004–2014), distributed under MPL-2.0 or LGPL-3.0-or-later. Source:
  https://github.com/titoBouzout/Dictionaries
- **wordfreq 3.1.1**, by Robyn Speer, used only to prioritize common forms for
  review. Its frequency data is distributed under CC BY-SA 4.0. Source and full
  attribution: https://github.com/rspeer/wordfreq

Only lowercase dictionary forms that can be built from Cari Kata's available
syllable tiles were retained. The resulting vocabulary data in
`kata-recognition.js` is distributed under CC BY-SA 4.0; the application code
that consumes it remains under the repository's MIT license.
