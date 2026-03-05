# Provenance

## CHANGELOG.md

| ID | Concept | Type |
|----|---------|------|
| 105 | WhisperProject | Entity |
| 106 | TorchLoadSecurityFix | Caveat |
| 107 | TranslationModelLimitation | Caveat |
| 108 | LargeV3TurboModel | Entity |
| 109 | TritonCompatibility | Caveat |
| 110 | WordLevelTimestamps | Entity |
| 111 | HallucinationSilenceSkip | Rule |

## LICENSE

| ID | Concept | Type |
|----|---------|------|
| 112 | MitLicense | Rule |

## README.md

| ID | Concept | Type |
|----|---------|------|
| 4 | WhisperModel | Entity |
| 100 | TranscribeMethod | Entity |
| 101 | TurboModelNoTranslation | Caveat |
| 102 | FfmpegDependency | Rule |
| 103 | TiktokenTokenizer | Entity |
| 104 | ModelSizeTiers | Entity |

## whisper/__init__.py

| ID | Concept | Type |
|----|---------|------|
| 1 | WhisperInitModule | Entity |
| 2 | LoadModel | Entity |
| 3 | DownloadFunction | Entity |
| 4 | WhisperModel | Entity |
| 5 | AudioModule | Entity |
| 6 | DecodingModule | Entity |
| 7 | TranscribeModule | Entity |
| 8 | Sha256ChecksumValidation | Rule |

## whisper/__main__.py

| ID | Concept | Type |
|----|---------|------|
| 59 | WhisperMain | Entity |
| 60 | CliEntrypoint | Entity |

## whisper/assets/gpt2.tiktoken

| ID | Concept | Type |
|----|---------|------|
| 31 | Gpt2TiktokenVocabulary | Entity |
| 32 | WhisperAssets | Entity |
| 33 | TiktokenFormatCaveat | Caveat |

## whisper/assets/mel_filters.npz

(no provenance)

## whisper/assets/multilingual.tiktoken

| ID | Concept | Type |
|----|---------|------|
| 33 | TiktokenFormatCaveat | Caveat |
| 34 | MultilingualTiktoken | Entity |
| 35 | WhisperTokenizer | Entity |

## whisper/audio.py

| ID | Concept | Type |
|----|---------|------|
| 5 | AudioModule | Entity |
| 93 | LoadAudio | Entity |
| 94 | PadOrTrim | Entity |
| 95 | MelFilters | Entity |
| 96 | LogMelSpectrogram | Entity |
| 97 | AudioHyperparameters | Entity |
| 98 | FfmpegRequired | Caveat |
| 99 | MelFilterConstraint | Rule |

## whisper/decoding.py

| ID | Concept | Type |
|----|---------|------|
| 36 | DecodingTask | Entity |
| 37 | DecodingOptions | Entity |
| 38 | DecodingResult | Entity |
| 39 | BeamSearchDecoder | Entity |
| 40 | GreedyDecoder | Entity |
| 41 | PyTorchInference | Entity |
| 42 | LogitFilter | Entity |
| 43 | ApplyTimestampRules | Entity |
| 44 | MaximumLikelihoodRanker | Entity |
| 45 | DetectLanguageFunction | Entity |
| 46 | BeamSizeBestOfConflict | Caveat |
| 47 | DecodeFunction | Entity |

## whisper/model.py

| ID | Concept | Type |
|----|---------|------|
| 23 | Whisper | Entity |
| 24 | AudioEncoder | Entity |
| 25 | TextDecoder | Entity |
| 26 | MultiHeadAttention | Entity |
| 27 | ResidualAttentionBlock | Entity |
| 28 | ModelDimensions | Entity |
| 29 | SdpaAvailabilityCaveat | Caveat |
| 30 | KvCacheHooks | Entity |

## whisper/normalizers/__init__.py

| ID | Concept | Type |
|----|---------|------|
| 9 | NormalizersModule | Entity |
| 10 | BasicTextNormalizer | Entity |
| 11 | EnglishTextNormalizer | Entity |

## whisper/normalizers/basic.py

| ID | Concept | Type |
|----|---------|------|
| 10 | BasicTextNormalizer | Entity |
| 14 | RemoveSymbolsAndDiacritics | Entity |
| 17 | RemoveSymbols | Entity |
| 18 | AdditionalDiacritics | Entity |
| 19 | DiacriticsRemovalCaveat | Caveat |

## whisper/normalizers/english.json

| ID | Concept | Type |
|----|---------|------|
| 13 | EnglishSpellingNormalizer | Entity |
| 20 | BritishToAmericanMapping | Entity |
| 21 | NormalizerModule | Entity |
| 22 | SpellingNormalizationIsOneDirectional | Caveat |

## whisper/normalizers/english.py

| ID | Concept | Type |
|----|---------|------|
| 11 | EnglishTextNormalizer | Entity |
| 12 | EnglishNumberNormalizer | Entity |
| 13 | EnglishSpellingNormalizer | Entity |
| 14 | RemoveSymbolsAndDiacritics | Entity |
| 15 | SpellingMappingFile | Caveat |
| 16 | NormalizationOrder | Rule |

## whisper/timing.py

| ID | Concept | Type |
|----|---------|------|
| 51 | TimingModule | Entity |
| 86 | MedianFilter | Entity |
| 87 | DtwAlignment | Entity |
| 88 | WordTiming | Entity |
| 89 | FindAlignment | Entity |
| 90 | AddWordTimestamps | Entity |
| 91 | MergePunctuations | Entity |
| 92 | TritonFallbackCaveat | Caveat |

## whisper/tokenizer.py

| ID | Concept | Type |
|----|---------|------|
| 72 | Tokenizer | Entity |
| 73 | GetEncoding | Entity |
| 74 | GetTokenizer | Entity |
| 75 | LanguageRegistry | Entity |
| 76 | TiktokenDependency | Entity |
| 77 | NonSpeechTokenSuppression | Caveat |
| 78 | SpacelessLanguageSplitting | Caveat |
| 79 | LanguageValidationRule | Rule |

## whisper/transcribe.py

| ID | Concept | Type |
|----|---------|------|
| 5 | AudioModule | Entity |
| 6 | DecodingModule | Entity |
| 48 | TranscribeFunction | Entity |
| 49 | CliFunction | Entity |
| 50 | DecodeWithFallback | Entity |
| 51 | TimingModule | Entity |
| 52 | TokenizerModule | Entity |
| 53 | UtilsModule | Entity |
| 54 | WordTimestampsTranslationCaveat | Caveat |
| 55 | FP16CpuCaveat | Caveat |
| 56 | HallucinationSilenceThreshold | Rule |
| 57 | TemperatureFallbackRule | Rule |

## whisper/triton_ops.py

| ID | Concept | Type |
|----|---------|------|
| 80 | DtwKernel | Entity |
| 81 | MedianKernel | Entity |
| 82 | MedianFilterCuda | Entity |
| 83 | TritonRequired | Caveat |
| 84 | MedianKernelCodeGen | Caveat |
| 85 | TritonOpsModule | Entity |

## whisper/utils.py

| ID | Concept | Type |
|----|---------|------|
| 61 | ResultWriter | Entity |
| 62 | SubtitlesWriter | Entity |
| 63 | WriteTXT | Entity |
| 64 | WriteVTT | Entity |
| 65 | WriteSRT | Entity |
| 66 | WriteTSV | Entity |
| 67 | WriteJSON | Entity |
| 68 | GetWriterFactory | Entity |
| 69 | CompressionRatio | Entity |
| 70 | FormatTimestamp | Entity |
| 71 | EncodingSafety | Caveat |

## whisper/version.py

| ID | Concept | Type |
|----|---------|------|
| 58 | WhisperVersion | Entity |

