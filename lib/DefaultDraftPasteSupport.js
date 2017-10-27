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

var DefaultDraftInlineStyle = require('./DefaultDraftInlineStyle');

var DefaultDraftPasteSupport = {
  inlineStyles: (0, _immutable.List)(Object.keys(DefaultDraftInlineStyle)),
  blockTypes: undefined,
  images: true,
  links: true
};

module.exports = DefaultDraftPasteSupport;