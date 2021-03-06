/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @emails oncall+ui_infra
 * @format
 */

'use strict';

jest.disableAutomock();

var DraftPasteProcessor = require('DraftPasteProcessor');
var Immutable = require('immutable');
var CUSTOM_BLOCK_MAP = Immutable.Map({
  'header-one': {
    element: 'h1',
  },
  'header-two': {
    element: 'h2',
  },
  'header-three': {
    element: 'h3',
  },
  'unordered-list-item': {
    element: 'li',
  },
  'ordered-list-item': {
    element: 'li',
  },
  blockquote: {
    element: 'blockquote',
  },
  'code-block': {
    element: 'pre',
  },
  paragraph: {
    element: 'p',
  },
  unstyled: {
    element: 'div',
  },
});

var INLINE_STYLES = Immutable.List([
  'BOLD',
  'CODE',
  'ITALIC',
  'STRIKETHROUGH',
  'UNDERLINE',
]);

describe('DraftPasteProcessor', function() {
  function assertInlineStyles(block, comparison) {
    var styles = block.getCharacterList().map(c => c.getStyle());
    expect(styles.toJS()).toEqual(comparison);
  }

  // Don't want to couple this to a specific way of generating entity IDs so
  // just checking their existence
  function assertEntities(block, comparison) {
    var entities = block.getCharacterList().map(c => c.getEntity());
    entities.toJS().forEach((entity, ii) => {
      expect(comparison[ii]).toBe(!!entity);
    });
  }

  function assertDepths(blocks, comparison) {
    expect(blocks.map(b => b.getDepth())).toEqual(comparison);
  }

  function assertBlockTypes(blocks, comparison) {
    expect(blocks.map(b => b.getType())).toEqual(comparison);
  }

  it('must identify italics text', function() {
    var html = '<i>hello</i> hi';
    var {contentBlocks: output} = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      INLINE_STYLES,
    );
    var block = output[0];
    expect(block.getType()).toBe('unstyled');
    assertInlineStyles(block, [
      ['ITALIC'],
      ['ITALIC'],
      ['ITALIC'],
      ['ITALIC'],
      ['ITALIC'],
      [],
      [],
      [],
    ]);
    expect(block.getText()).toBe('hello hi');
  });

  it('must identify overlapping inline styles', function() {
    var html = '<i><b>he</b>hi</i>';
    var {contentBlocks: output} = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      INLINE_STYLES,
    );
    var block = output[0];
    expect(block.getType()).toBe('unstyled');
    assertInlineStyles(block, [
      ['ITALIC', 'BOLD'],
      ['ITALIC', 'BOLD'],
      ['ITALIC'],
      ['ITALIC'],
    ]);
    expect(block.getText()).toBe('hehi');
  });

  it('must identity only specified inline styles', function() {
    var inlineStyles = Immutable.List(['BOLD', 'ITALIC']);
    var html =
      '<em>1</em><strong>2</strong><code>3</code><strike>4</strike><u>5</u>';
    var {contentBlocks: output} = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      inlineStyles,
    );
    var block = output[0];
    assertInlineStyles(block, [['ITALIC'], ['BOLD'], [], [], []]);
  });

  it('must identify block styles', function() {
    var html = '<ol><li>hi</li><li>there</li></ol>';
    var {contentBlocks: output} = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      INLINE_STYLES,
    );
    assertBlockTypes(output, ['ordered-list-item', 'ordered-list-item']);
  });

  it('must identify only specified block types', function() {
    var blockRenderMap = Immutable.Map({
      'header-one': {
        element: 'h1',
      },
      unstyled: {
        element: 'div',
      },
    });
    var html = '<h1>yes</h1><h2>no</h2><div>yes</div><pre>no</pre>';
    var {contentBlocks: output} = DraftPasteProcessor.processHTML(
      html,
      blockRenderMap,
    );
    assertBlockTypes(output, ['header-one', 'unstyled']);
  });

  it('must collapse nested blocks to the topmost level', function() {
    var html = '<ul><li><h2>what</h2></li></ul>';
    var {contentBlocks: output} = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      INLINE_STYLES,
    );
    assertBlockTypes(output, ['unordered-list-item']);
  });

  /**
   * todo: azelenskiy
   * Changes to the mocked DOM appear to have broken this.
   *
   * it('must suppress blocks nested inside other blocks', function() {
   *   var html = '<p><h2>Some text here</h2> more text here </p>';
   *   var output = DraftPasteProcessor.processHTML(html, CUSTOM_BLOCK_MAP, INLINE_STYLES);
   *   assertBlockTypes(output, [
   *   'unstyled',
   *   ]);
   * });
   */

  it('must detect two touching blocks', function() {
    var html = '<h1>hi</h1>    <h2>hi</h2>';
    var {contentBlocks: output} = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      INLINE_STYLES,
    );
    assertBlockTypes(output, ['header-one', 'header-two']);
  });

  it('must insert a block when needed', function() {
    var html = ' <h1> hi </h1><h1> </h1><span> whatever </span> <h2>hi </h2> ';
    var {contentBlocks: output} = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      INLINE_STYLES,
    );
    assertBlockTypes(output, ['header-one', 'unstyled', 'header-two']);
  });

  it('must not generate fake blocks on heavy nesting', function() {
    var html =
      '<p><span><span><span>Word</span></span></span>' +
      '<span><span>,</span></span></p>';
    var {contentBlocks: output} = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      INLINE_STYLES,
    );
    assertBlockTypes(output, ['paragraph']);
  });

  it('must preserve spaces', function() {
    var html, output;

    html = '<span>hello</span> <span>hi</span>';
    output = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      INLINE_STYLES,
    );
    expect(output.contentBlocks.length).toEqual(1);
    assertBlockTypes(output.contentBlocks, ['unstyled']);
    var block = output.contentBlocks[0];
    expect(block.getText()).toBe('hello hi');

    html = '<span>hello </span><span>hi</span>';
    output = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      INLINE_STYLES,
    );
    expect(output.contentBlocks[0].getText()).toBe('hello hi');

    html = '<span>hello</span><span> hi</span>';
    output = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      INLINE_STYLES,
    );
    expect(output.contentBlocks[0].getText()).toEqual('hello hi');
  });

  it('must treat divs as Ps when we do not have semantic markup', function() {
    var html = '<div>hi</div><div>hello</div>';
    var {contentBlocks: output} = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      INLINE_STYLES,
    );
    assertBlockTypes(output, ['unstyled', 'unstyled']);
  });

  it('must NOT treat divs as Ps when we pave Ps', function() {
    var html = '<div><p>hi</p><p>hello</p></div>';
    var {contentBlocks: output} = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      INLINE_STYLES,
    );
    assertBlockTypes(output, ['paragraph', 'paragraph']);
  });

  it('must replace br tags with soft newlines', function() {
    var html = 'hi<br>hello';
    var {contentBlocks: output} = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      INLINE_STYLES,
    );
    expect(output[0].getText()).toBe('hi\nhello');
  });

  it('must strip xml carriages and zero width spaces', function() {
    var html = 'hi&#13;&#8203;hello';
    var {contentBlocks: output} = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      INLINE_STYLES,
    );
    expect(output[0].getText()).toBe('hihello');
  });

  it('must split unstyled blocks on two br tags', function() {
    var html = 'hi<br><br>hello';
    var output = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      INLINE_STYLES,
    );
    assertBlockTypes(output.contentBlocks, ['unstyled', 'unstyled']);
    html = '<div>hi<br><br>hello</div>';
    output = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      INLINE_STYLES,
    );
    assertBlockTypes(output.contentBlocks, ['unstyled', 'unstyled']);
  });

  it('must NOT split unstyled blocks inside a styled block', function() {
    var html = '<pre>hi<br><br>hello</pre>';
    var {contentBlocks: output} = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      INLINE_STYLES,
    );
    assertBlockTypes(output, ['code-block']);
  });

  it('must split unstyled blocks on two br tags', function() {
    var html = 'hi<br><br>hello';
    var output = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      INLINE_STYLES,
    );
    expect(output.contentBlocks[0].getText().length).toBe(3);
    expect(output.contentBlocks[1].getText()).toBe('hello');
    assertBlockTypes(output.contentBlocks, ['unstyled', 'unstyled']);
  });

  it('must replace newlines in regular tags', function() {
    var html = '<div>hello\nthere</div>';
    var {contentBlocks: output} = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      INLINE_STYLES,
    );
    expect(output[0].getText()).toBe('hello there');
  });

  it('must preserve newlines in pre tags', function() {
    var html = '<pre>hello\nthere</pre>';
    var {contentBlocks: output} = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      INLINE_STYLES,
    );
    expect(output[0].getText()).toBe('hello\nthere');
  });

  it('must preserve newlines in whitespace in pre tags', function() {
    var html = '<pre><span>hello</span>\n<span>there</span></pre>';
    var {contentBlocks: output} = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      INLINE_STYLES,
    );
    expect(output[0].getText()).toBe('hello\nthere');
    assertBlockTypes(output, ['code-block']);
  });

  it('must parse based on style attribute', function() {
    var html =
      '<span style="font-weight: bold;">Bold ' +
      '<span style="font-style: italic;">Italic</span></span>.';
    var {contentBlocks: output} = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      INLINE_STYLES,
    );
    assertBlockTypes(output, ['unstyled']);
    assertInlineStyles(output[0], [
      ['BOLD'],
      ['BOLD'],
      ['BOLD'],
      ['BOLD'],
      ['BOLD'],
      ['BOLD', 'ITALIC'],
      ['BOLD', 'ITALIC'],
      ['BOLD', 'ITALIC'],
      ['BOLD', 'ITALIC'],
      ['BOLD', 'ITALIC'],
      ['BOLD', 'ITALIC'],
      [],
    ]);
    expect(output[0].getText()).toBe('Bold Italic.');
  });

  describe('`allowImages` prop is true', function() {
    it('must detect images in pasted content', function() {
      var html =
        'This is an image <img src="http://www.facebook.com/image.jpg" />, yep.';
      var {contentBlocks: output, entityMap} = DraftPasteProcessor.processHTML(
        html,
        CUSTOM_BLOCK_MAP,
        INLINE_STYLES,
        true,
      );
      assertBlockTypes(output, ['unstyled']);
      assertEntities(
        output[0],
        Array(17)
          .fill(false)
          .concat(Array(33).fill(true), Array(6).fill(false)),
      );
      expect(output[0].getText()).toBe(
        'This is an image http://www.facebook.com/image.jpg, yep.',
      );
      var entityId = output[0]
        .getCharacterList()
        .get(19)
        .getEntity();
      var entity = entityMap.__get(entityId);
      expect(entity.getData().src).toBe('http://www.facebook.com/image.jpg');
    });
  });

  describe('`allowImages` prop is false', function() {
    it('must ignore images in pasted content', function() {
      var html =
        'This is an image <img src="http://www.facebook.com/image.jpg" />, yep.';
      var {contentBlocks: output} = DraftPasteProcessor.processHTML(
        html,
        CUSTOM_BLOCK_MAP,
        INLINE_STYLES,
        false,
      );
      assertBlockTypes(output, ['unstyled']);
      assertEntities(output[0], Array(56).fill(false));
      expect(output[0].getText()).toBe('This is an image , yep.');
      var entityId = output[0]
        .getCharacterList()
        .get(19)
        .getEntity();
      expect(entityId).toBe(null);
    });
  });

  describe('`allowLinks` prop is true', function() {
    it('must detect links in pasted content', function() {
      var html = 'This is a <a href="http://www.facebook.com">link</a>, yep.';
      var {contentBlocks: output, entityMap} = DraftPasteProcessor.processHTML(
        html,
        CUSTOM_BLOCK_MAP,
        INLINE_STYLES,
        true,
        true,
      );
      assertBlockTypes(output, ['unstyled']);
      assertEntities(
        output[0],
        Array(10)
          .fill(false)
          .concat(Array(4).fill(true), Array(6).fill(false)),
      );
      expect(output[0].getText()).toBe('This is a link, yep.');
      var entityId = output[0]
        .getCharacterList()
        .get(12)
        .getEntity();
      var entity = entityMap.__get(entityId);
      expect(entity.getData().url).toBe('http://www.facebook.com/');
    });

    it('must preserve styles inside links in a good way', function() {
      var html =
        'A <a href="http://www.facebook.com"><i>cool</i> link</a>, yep.';
      var {contentBlocks: output} = DraftPasteProcessor.processHTML(
        html,
        CUSTOM_BLOCK_MAP,
        INLINE_STYLES,
        true,
        true,
      );
      assertBlockTypes(output, ['unstyled']);
      assertInlineStyles(
        output[0],
        Array(2)
          .fill([])
          .concat(Array(4).fill(['ITALIC']), Array(11).fill([])),
      );
      assertEntities(
        output[0],
        Array(2)
          .fill(false)
          .concat(Array(9).fill(true), Array(6).fill(false)),
      );
      expect(output[0].getText()).toBe('A cool link, yep.');
    });

    it('must preserve mailto: links', function() {
      var html =
        'This is a <a href="mailto:example@example.com">link</a>, yep.';
      var {contentBlocks: output, entityMap} = DraftPasteProcessor.processHTML(
        html,
        CUSTOM_BLOCK_MAP,
        INLINE_STYLES,
        true,
        true,
      );
      assertBlockTypes(output, ['unstyled']);
      assertEntities(
        output[0],
        Array(10)
          .fill(false)
          .concat(Array(4).fill(true), Array(6).fill(false)),
      );
      expect(output[0].getText()).toBe('This is a link, yep.');
      var entityId = output[0]
        .getCharacterList()
        .get(12)
        .getEntity();
      var entity = entityMap.__get(entityId);
      expect(entity.getData().url).toBe('mailto:example@example.com');
    });
  });

  describe('`allowLinks` prop is false', function() {
    it('must ignore links in pasted content', function() {
      var html = 'This is a <a href="http://www.facebook.com">link</a>, yep.';
      var {contentBlocks: output} = DraftPasteProcessor.processHTML(
        html,
        CUSTOM_BLOCK_MAP,
        INLINE_STYLES,
        false,
      );
      assertBlockTypes(output, ['unstyled']);
      assertEntities(output[0], Array(20).fill(false));
      expect(output[0].getText()).toBe('This is a link, yep.');
      var entityId = output[0]
        .getCharacterList()
        .get(12)
        .getEntity();
      expect(entityId).toBe(null);
    });
  });

  it('must ignore links that do not actually link anywhere', function() {
    var html = 'This is a <a>link</a>, yep.';
    var {contentBlocks: output} = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      INLINE_STYLES,
    );
    assertBlockTypes(output, ['unstyled']);
    assertEntities(output[0], Array(20).fill(false));
    expect(output[0].getText()).toBe('This is a link, yep.');
  });

  it('must ignore javascript: links', function() {
    var html = 'This is a <a href="javascript:void(0)">link</a>, yep.';
    var {contentBlocks: output} = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      INLINE_STYLES,
    );
    assertBlockTypes(output, ['unstyled']);
    assertEntities(output[0], Array(20).fill(false));
    expect(output[0].getText()).toBe('This is a link, yep.');
  });

  it('Tolerate doule BR tags separated by whitespace', function() {
    var html = 'hi<br>  <br>hello';
    var output = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      INLINE_STYLES,
    );
    assertBlockTypes(output.contentBlocks, ['unstyled', 'unstyled']);
    html = '<div>hi<br> <br>hello</div>';
    output = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      INLINE_STYLES,
    );
    assertBlockTypes(output.contentBlocks, ['unstyled', 'unstyled']);

    html = '<div>hi<br> good stuff here <br>hello</div>';
    output = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      INLINE_STYLES,
    );
    assertBlockTypes(output.contentBlocks, ['unstyled']);
  });

  it('must strip whitespace between body and its first child element', function() {
    var html = '<html><body> <p>hello</p></body></html>';
    var {contentBlocks: output} = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
    );
    expect(output[0].getText()).toBe('hello');
  });

  it('must strip whitespace between html comment and next element', function() {
    var html = '<html><body><!--comment--> <p>hello</p></body></html>';
    var {contentBlocks: output} = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
    );
    expect(output[0].getText()).toBe('hello');
  });

  it('must not strip whitespace inside span', function() {
    var html = '<span>hello</span><span> </span><span>world</span>';
    var {contentBlocks: output} = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
    );
    expect(output[0].getText()).toBe('hello world');
  });

  it('must strip whitespace after block dividers', function() {
    var html = '<p>hello</p> <p> what</p>';
    var {contentBlocks: output} = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      INLINE_STYLES,
    );
    expect(output[1].getText()).toBe('what');
  });

  it('must detect when something is un-styled in a child', function() {
    let html = '<b>hello<span style="font-weight:400;">there</span></b>';
    let output = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      INLINE_STYLES,
    );
    assertInlineStyles(output.contentBlocks[0], [
      ['BOLD'],
      ['BOLD'],
      ['BOLD'],
      ['BOLD'],
      ['BOLD'],
      [],
      [],
      [],
      [],
      [],
    ]);

    html = '<i>hello<span style="font-style:normal;">there</span></i>';
    output = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      INLINE_STYLES,
    );
    assertInlineStyles(output.contentBlocks[0], [
      ['ITALIC'],
      ['ITALIC'],
      ['ITALIC'],
      ['ITALIC'],
      ['ITALIC'],
      [],
      [],
      [],
      [],
      [],
    ]);

    // nothing to remove. make sure we don't throw an error
    html = '<span>hello<span style="font-style:normal;">there</span></span>';
    output = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      INLINE_STYLES,
    );
    assertInlineStyles(output.contentBlocks[0], [
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
    ]);
  });

  it('must preserve list formatting', function() {
    var html = `
    what
    <ul>
      <li>what</li>
      <li>
        what
        <ol>
          <li>one</li>
          <li>two</li>
        </ol>
      </li>
      <li>what</li>
    </ul>
    `;
    var {contentBlocks: output} = DraftPasteProcessor.processHTML(
      html,
      CUSTOM_BLOCK_MAP,
      INLINE_STYLES,
    );
    assertBlockTypes(output, [
      'unstyled',
      'unordered-list-item',
      'unordered-list-item',
      'ordered-list-item',
      'ordered-list-item',
      'unordered-list-item',
    ]);
    assertDepths(output, [0, 0, 0, 1, 1, 0]);
  });
});
