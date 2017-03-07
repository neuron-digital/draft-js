/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule DefaultDraftPasteSupport
 * 
 */

'use strict';

var _immutable = require('immutable');

var DefaultDraftPasteSupport = {
  inlineStyles: (0, _immutable.List)(['BOLD', 'CODE', 'ITALIC', 'STRIKETHROUGH', 'UNDERLINE']),
  blockTypes: (0, _immutable.List)(['header-one', 'header-two', 'header-three', 'header-four', 'header-five', 'header-six', 'unordered-list-item', 'ordered-list-item', 'blockquote', 'atomic', 'code-block', 'unstyled']),
  links: true
};

module.exports = DefaultDraftPasteSupport;