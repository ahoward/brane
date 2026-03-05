# Provenance

## CHANGELOG.md

| ID | Concept | Type |
|----|---------|------|
| 72 | PresidioAnalyzer | Entity |
| 73 | PresidioAnonymizer | Entity |
| 74 | PresidioImageRedactor | Entity |
| 75 | PresidioStructured | Entity |
| 82 | PresidioMetaPackage | Entity |
| 83 | HashOperatorRandomSaltDefault | Caveat |
| 84 | CountryRecognizersDisabledByDefault | Caveat |
| 85 | MD5HashDeprecated | Caveat |

## CODE_OF_CONDUCT

(no provenance)

## presidio-analyzer/presidio_analyzer/analysis_explanation.py

| ID | Concept | Type |
|----|---------|------|
| 17 | AnalysisExplanation | Entity |
| 27 | AnalysisExplanationScoreContext | Caveat |
| 28 | AnalysisExplanationFile | Entity |

## presidio-analyzer/presidio_analyzer/analyzer_engine.py

| ID | Concept | Type |
|----|---------|------|
| 1 | AnalyzerEngine | Entity |
| 2 | RecognizerRegistry | Entity |
| 3 | NlpEngine | Entity |
| 4 | ContextAwareEnhancer | Entity |
| 5 | AppTracer | Entity |
| 6 | RegistryLanguageConsistency | Rule |
| 7 | AllowListMatchMode | Caveat |

## presidio-analyzer/presidio_analyzer/analyzer_request.py

| ID | Concept | Type |
|----|---------|------|
| 14 | PatternRecognizer | Entity |
| 24 | AnalyzerRequest | Entity |
| 25 | AdHocRecognizerDeserialization | Caveat |
| 26 | DefaultRegexFlags | Caveat |

## presidio-analyzer/presidio_analyzer/batch_analyzer_engine.py

| ID | Concept | Type |
|----|---------|------|
| 1 | AnalyzerEngine | Entity |
| 10 | NlpArtifacts | Entity |
| 20 | BatchAnalyzerEngine | Entity |
| 21 | DictAnalyzerResult | Entity |
| 22 | PrimitiveTypesOnly | Caveat |
| 23 | NestedDictRecursion | Caveat |

## presidio-analyzer/presidio_analyzer/entity_recognizer.py

| ID | Concept | Type |
|----|---------|------|
| 8 | EntityRecognizer | Entity |
| 9 | RecognizerResult | Entity |
| 10 | NlpArtifacts | Entity |
| 11 | AnalyzeAbstractMethod | Rule |
| 12 | ContextEnhancement | Caveat |
| 13 | RemoveDuplicates | Entity |

## presidio-analyzer/presidio_analyzer/nlp_engine/device_detector.py

| ID | Concept | Type |
|----|---------|------|
| 48 | DeviceDetector | Entity |
| 55 | LazyModuleGetattr | Entity |
| 56 | PresidioDeviceEnvVar | Rule |
| 57 | CudaFallbackToCpu | Caveat |
| 58 | MpsNotSupported | Caveat |
| 59 | ThreadSafeSingleton | Rule |

## presidio-analyzer/presidio_analyzer/nlp_engine/__init__.py

| ID | Concept | Type |
|----|---------|------|
| 3 | NlpEngine | Entity |
| 10 | NlpArtifacts | Entity |
| 29 | NlpEnginePackage | Entity |
| 30 | SpacyNlpEngine | Entity |
| 31 | StanzaNlpEngine | Entity |
| 32 | TransformersNlpEngine | Entity |
| 33 | NlpEngineProvider | Entity |
| 34 | NerModelConfiguration | Entity |

## presidio-analyzer/presidio_analyzer/nlp_engine/ner_model_configuration.py

| ID | Concept | Type |
|----|---------|------|
| 34 | NerModelConfiguration | Entity |
| 35 | ModelToPresidioEntityMapping | Entity |
| 36 | AggregationStrategyValidation | Caveat |
| 37 | AlignmentModeValidation | Caveat |
| 38 | LowScoreEntityMultiplier | Rule |

## presidio-analyzer/presidio_analyzer/nlp_engine/nlp_artifacts.py

| ID | Concept | Type |
|----|---------|------|
| 3 | NlpEngine | Entity |
| 10 | NlpArtifacts | Entity |
| 42 | SetKeywordsMethod | Entity |
| 43 | DefaultScoreCaveat | Caveat |
| 44 | NlpEngineNotSerializable | Caveat |

## presidio-analyzer/presidio_analyzer/nlp_engine/nlp_engine_provider.py

| ID | Concept | Type |
|----|---------|------|
| 30 | SpacyNlpEngine | Entity |
| 31 | StanzaNlpEngine | Entity |
| 32 | TransformersNlpEngine | Entity |
| 33 | NlpEngineProvider | Entity |
| 34 | NerModelConfiguration | Entity |
| 52 | ConfigurationValidator | Entity |
| 53 | MutualExclusionConfFileAndNlpConfig | Caveat |
| 54 | EngineAvailabilityCheck | Rule |

## presidio-analyzer/presidio_analyzer/nlp_engine/nlp_engine.py

| ID | Concept | Type |
|----|---------|------|
| 3 | NlpEngine | Entity |
| 10 | NlpArtifacts | Entity |
| 60 | NlpEngineIsAbstract | Caveat |

## presidio-analyzer/presidio_analyzer/nlp_engine/spacy_nlp_engine.py

| ID | Concept | Type |
|----|---------|------|
| 3 | NlpEngine | Entity |
| 10 | NlpArtifacts | Entity |
| 30 | SpacyNlpEngine | Entity |
| 34 | NerModelConfiguration | Entity |
| 48 | DeviceDetector | Entity |
| 49 | ModelMustBeLoadedBeforeUse | Caveat |
| 50 | UnmappedEntitiesKeptWithWarning | Caveat |
| 51 | SpacyNlpEngineDefinedIn | Rule |

## presidio-analyzer/presidio_analyzer/nlp_engine/stanza_nlp_engine.py

| ID | Concept | Type |
|----|---------|------|
| 30 | SpacyNlpEngine | Entity |
| 31 | StanzaNlpEngine | Entity |
| 34 | NerModelConfiguration | Entity |
| 45 | StanzaTokenizer | Entity |
| 46 | LoadPipelineFunction | Entity |
| 47 | StanzaOptionalImport | Caveat |
| 48 | DeviceDetector | Entity |

## presidio-analyzer/presidio_analyzer/nlp_engine/transformers_nlp_engine.py

| ID | Concept | Type |
|----|---------|------|
| 30 | SpacyNlpEngine | Entity |
| 32 | TransformersNlpEngine | Entity |
| 34 | NerModelConfiguration | Entity |
| 39 | SpacyHuggingfacePipelinesRequired | Caveat |
| 40 | DualModelConfiguration | Rule |
| 41 | TransformersNlpEngineDefinition | Entity |

## presidio-analyzer/presidio_analyzer/pattern_recognizer.py

| ID | Concept | Type |
|----|---------|------|
| 8 | EntityRecognizer | Entity |
| 9 | RecognizerResult | Entity |
| 14 | PatternRecognizer | Entity |
| 15 | LocalRecognizer | Entity |
| 16 | Pattern | Entity |
| 17 | AnalysisExplanation | Entity |
| 18 | PatternOrDenyListRequired | Rule |
| 19 | ValidationOverridesScore | Caveat |

## presidio-anonymizer/presidio_anonymizer/anonymizer_engine.py

| ID | Concept | Type |
|----|---------|------|
| 9 | RecognizerResult | Entity |
| 61 | AnonymizerEngine | Entity |
| 62 | EngineBase | Entity |
| 63 | ConflictResolutionStrategy | Entity |
| 64 | OperatorConfig | Entity |
| 65 | DefaultReplaceOperator | Rule |
| 66 | ConflictResolutionMerge | Caveat |
| 67 | WhitespaceMerge | Caveat |

## presidio-anonymizer/presidio_anonymizer/deanonymize_engine.py

| ID | Concept | Type |
|----|---------|------|
| 62 | EngineBase | Entity |
| 68 | DeanonymizeEngine | Entity |
| 69 | OperatorType | Entity |
| 70 | OperatorsFactory | Entity |
| 71 | DeanonymizerExtensibility | Rule |

## README.MD

| ID | Concept | Type |
|----|---------|------|
| 72 | PresidioAnalyzer | Entity |
| 73 | PresidioAnonymizer | Entity |
| 74 | PresidioImageRedactor | Entity |
| 75 | PresidioStructured | Entity |
| 76 | AutomatedDetectionLimitation | Caveat |
| 77 | ReadmeFile | Entity |

## SECURITY.md

| ID | Concept | Type |
|----|---------|------|
| 78 | SecurityPolicy | Rule |
| 79 | VulnerabilityReportingProcess | Rule |
| 80 | NoPublicDisclosure | Caveat |
| 81 | CoordinatedVulnerabilityDisclosure | Rule |

