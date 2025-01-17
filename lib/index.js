/**
 * @typedef {import('mdast').Delete} Delete
 *
 * @typedef {import('mdast-util-from-markdown').CompileContext} CompileContext
 * @typedef {import('mdast-util-from-markdown').Extension} FromMarkdownExtension
 * @typedef {import('mdast-util-from-markdown').Handle} FromMarkdownHandle
 *
 * @typedef {import('mdast-util-to-markdown').ConstructName} ConstructName
 * @typedef {import('mdast-util-to-markdown').Options} ToMarkdownExtension
 * @typedef {import('mdast-util-to-markdown').Handle} ToMarkdownHandle
 *
 * @typedef Options
 * @property {string} mdastNodeName
 * @property {string} hastNodeName
 * @property {string} char
 */

// eslint
import {containerPhrasing} from 'mdast-util-to-markdown/lib/util/container-phrasing.js'
import {track} from 'mdast-util-to-markdown/lib/util/track.js'

// To do: next major: expose functions.
// To do: next major: use `state`, state utilities.

/**
 * List of constructs that occur in phrasing (paragraphs, headings), but cannot
 * contain strikethrough.
 * So they sort of cancel each other out.
 * Note: could use a better name.
 *
 * Note: keep in sync with: <https://github.com/syntax-tree/mdast-util-to-markdown/blob/8ce8dbf/lib/unsafe.js#L14>
 *
 * @type {Array<ConstructName>}
 */
const constructsWithoutAttention = [
  'autolink',
  'destinationLiteral',
  'destinationRaw',
  'reference',
  'titleQuote',
  'titleApostrophe'
]

/**
 * Extension for `mdast-util-from-markdown` to create single symbol attention (sub, sup etc).
 *
 * @param {Options} options
 *   MDAST and HAST node names
 * @returns {FromMarkdownExtension}
 *   Syntax extension for micromark (passed in `mdastExtensions`).
 */
export function attentionFromMarkdown(options) {
  return {
    canContainEols: [options.mdastNodeName],
    enter: {
      [options.mdastNodeName](token) {
        this.enter(
          {
            // @ts-expect-error Custom
            type: options.mdastNodeName,
            children: [],
            data: {hName: options.hastNodeName}
          },
          token
        )
      }
    },
    exit: {
      [options.mdastNodeName](token) {
        this.exit(token)
      }
    }
  }
}

/**
 * Extension for `mdast-util-to-markdown` to create single symbol attention (sub, sup etc).
 *
 * @param {Options} options
 *   MDAST and HAST node names
 * @return {ToMarkdownExtension}
 */
export function attentionToMarkdown(options) {
  const temporary = {
    unsafe: [
      {
        character: options.char,
        inConstruct: 'phrasing',
        notInConstruct: constructsWithoutAttention
      }
    ],
    handlers: {
      /**
       * @type {ToMarkdownHandle}
       * @param {Delete} node
       */
      [options.mdastNodeName](node, _, context, safeOptions) {
        const tracker = track(safeOptions)
        // @ts-expect-error Custom
        const exit = context.enter(options.mdastNodeName)
        // // @ts-expect-error Custom
        let value = tracker.move(options.char)
        value += containerPhrasing(node, context, {
          ...tracker.current(),
          before: value,
          // // @ts-expect-error Custom
          after: options.char
        })
        // // @ts-expect-error Custom
        value += tracker.move(options.char)
        exit()
        return value
      }
    }
  }
  // @ts-expect-error Custom
  temporary.handlers[options.mdastNodeName].peek = function () {
    return options.char
  }

  // @ts-expect-error Custom
  return temporary
}

/**
 * Extension for `mdast-util-to-markdown` to create single symbol attention (sub, sup etc).
 *
 * @param {Options} options
 *   MDAST and HAST node names
 * @return {object}
 */
export function attentionFromHast(options) {
  /**
   * Copied from https://github.com/syntax-tree/hast-util-to-mdast/blob/main/lib/handlers/del.js
   * @typedef {import('hast').Element} Element
   * @typedef {import('hast-util-to-mdast').State} State
   */

  /**
   * @param {State} state
   *   State.
   * @param {Element} node
   *   hast element to transform.
   * @returns {Delete}
   *   mdast node.
   */
  return {
    // @ts-expect-error: any is ok
    [options.hastNodeName](state, node) {
      const result = {
        type: options.mdastNodeName,
        // //@ts-expect-error: allow potentially “invalid” nodes, they might be unknown.
        // We also support straddling later.
        children: state.all(node)
      }
      state.patch(node, result)
      return result
    }
  }
}
