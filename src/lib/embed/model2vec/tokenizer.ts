//
// tokenizer.ts - pure TypeScript WordPiece tokenizer for BERT-style models
//
// Reads HuggingFace tokenizer.json format. Implements:
// - BertNormalizer (lowercase, clean text)
// - BertPreTokenizer (split on whitespace + punctuation)
// - WordPiece subword tokenization
//

export interface TokenizerConfig {
  model: {
    type: string
    vocab: Record<string, number>
    unk_token: string
    continuing_subword_prefix: string
    max_input_chars_per_word: number
  }
  normalizer?: {
    lowercase?: boolean
    strip_accents?: boolean | null
    clean_text?: boolean
    handle_chinese_chars?: boolean
  }
}

export class WordPieceTokenizer {
  private vocab: Map<string, number>
  private unk_id: number
  private prefix: string
  private max_chars: number
  private do_lowercase: boolean
  private do_clean_text: boolean

  constructor(config: TokenizerConfig) {
    this.vocab = new Map(Object.entries(config.model.vocab))
    this.unk_id = this.vocab.get(config.model.unk_token) ?? 1
    this.prefix = config.model.continuing_subword_prefix
    this.max_chars = config.model.max_input_chars_per_word
    this.do_lowercase = config.normalizer?.lowercase ?? true
    this.do_clean_text = config.normalizer?.clean_text ?? true
  }

  //
  // Tokenize text into token IDs
  //
  tokenize(text: string): number[] {
    const normalized = this.normalize(text)
    const words = this.pre_tokenize(normalized)
    const ids: number[] = []

    for (const word of words) {
      const word_ids = this.wordpiece(word)
      for (const id of word_ids) {
        ids.push(id)
      }
    }

    return ids
  }

  //
  // BertNormalizer: lowercase, strip control chars
  //
  private normalize(text: string): string {
    let result = text

    // Clean text: remove control characters and replace whitespace
    if (this.do_clean_text) {
      result = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      result = result.replace(/\s+/g, " ")
    }

    if (this.do_lowercase) {
      result = result.toLowerCase()
    }

    return result.trim()
  }

  //
  // BertPreTokenizer: split on whitespace and punctuation
  //
  private pre_tokenize(text: string): string[] {
    const tokens: string[] = []
    let current = ""

    for (const char of text) {
      if (is_whitespace(char)) {
        if (current.length > 0) {
          tokens.push(current)
          current = ""
        }
      } else if (is_punctuation(char)) {
        if (current.length > 0) {
          tokens.push(current)
          current = ""
        }
        tokens.push(char)
      } else {
        current += char
      }
    }

    if (current.length > 0) {
      tokens.push(current)
    }

    return tokens
  }

  //
  // WordPiece tokenization for a single word
  //
  private wordpiece(word: string): number[] {
    if (word.length > this.max_chars) {
      return [this.unk_id]
    }

    const ids: number[] = []
    let start = 0

    while (start < word.length) {
      let end = word.length
      let found_id: number | undefined

      while (start < end) {
        const substr = start === 0
          ? word.slice(start, end)
          : this.prefix + word.slice(start, end)

        const id = this.vocab.get(substr)
        if (id !== undefined) {
          found_id = id
          break
        }
        end--
      }

      if (found_id === undefined) {
        return [this.unk_id]
      }

      ids.push(found_id)
      start = end
    }

    return ids
  }
}

//
// Unicode-aware character classification (BERT-style)
//

function is_whitespace(char: string): boolean {
  const code = char.charCodeAt(0)
  if (code === 0x20 || code === 0x09 || code === 0x0A || code === 0x0D) return true
  // Unicode general category Zs
  return /\s/.test(char)
}

function is_punctuation(char: string): boolean {
  const code = char.charCodeAt(0)
  // ASCII punctuation ranges
  if ((code >= 33 && code <= 47) ||   // ! " # $ % & ' ( ) * + , - . /
      (code >= 58 && code <= 64) ||   // : ; < = > ? @
      (code >= 91 && code <= 96) ||   // [ \ ] ^ _ `
      (code >= 123 && code <= 126)) { // { | } ~
    return true
  }
  // Unicode punctuation
  return /[\p{P}\p{S}]/u.test(char)
}
