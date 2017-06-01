'use strict';

module.exports.plugins = [
  require('remark-lint'),

  require('remark-lint-final-newline'),

  [require('remark-lint-blockquote-indentation'), 2],

  require('remark-lint-list-item-bullet-indent'),
  [require('remark-lint-list-item-indent'), "space"],
  require('remark-lint-list-item-spacing'),
  [require('remark-lint-ordered-list-marker-style'), "."],
  [require('remark-lint-ordered-list-marker-value'), "one"],
  [require('remark-lint-unordered-list-marker-style'), "-"],

  [require('remark-lint-heading-style'), "atx"],
  [require('remark-lint-maximum-heading-length'), 56],
  require('remark-lint-no-duplicate-headings'),
  require('remark-lint-no-emphasis-as-heading'),
  require('remark-lint-no-heading-content-indent'),
  require('remark-lint-no-heading-indent'),
  require('remark-lint-no-heading-like-paragraph'),

  [require('remark-lint-link-title-style'), "\""],
  require('remark-lint-no-empty-url'),
  require('remark-lint-no-literal-urls'),

  [require('remark-lint-emphasis-marker'), "_"],
  [require('remark-lint-strong-marker'), "*"],
  require('remark-lint-no-inline-padding'),

  [require('remark-lint-code-block-style'), "fenced"],
  [require('remark-lint-fenced-code-marker'), "`"],

  require('remark-lint-no-consecutive-blank-lines'),
  [require('remark-lint-no-missing-blank-lines'), { "exceptTightLists": true }],
  require('remark-lint-no-html'),
  require('remark-lint-no-tabs')
];
