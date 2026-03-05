# Provenance

## packages/ai/AGENTS.md

| ID | Concept | Type |
|----|---------|------|
| 44 | GenerateText | Entity |
| 93 | StreamText | Entity |
| 458 | MaxOutputTokensCaveat | Caveat |
| 459 | AiPackage | Entity |

## packages/ai/README.md

| ID | Concept | Type |
|----|---------|------|
| 44 | GenerateText | Entity |
| 288 | ToolLoopAgent | Entity |
| 454 | AiSdkPackage | Entity |
| 455 | UnifiedProviderArchitecture | Rule |
| 456 | AiSdkReact | Entity |
| 457 | VercelAiGateway | Entity |

## packages/ai/src/agent/agent.ts

| ID | Concept | Type |
|----|---------|------|
| 294 | AgentCallParameters | Entity |
| 295 | AgentStreamParameters | Entity |
| 301 | Agent | Entity |
| 305 | AgentInterface | Entity |
| 318 | ToolLoopAgentCallbacks | Entity |
| 319 | PromptOrMessagesConstraint | Caveat |
| 320 | AgentVersioning | Rule |
| 321 | PromptOrMessagesMutualExclusion | Caveat |

## packages/ai/src/agent/create-agent-ui-stream-response.test.ts

| ID | Concept | Type |
|----|---------|------|
| 46 | MockLanguageModelV3 | Entity |
| 288 | ToolLoopAgent | Entity |
| 308 | CreateAgentUIStreamResponse | Entity |
| 309 | ToolToModelOutputConversion | Rule |
| 310 | OnFinishWithoutOriginalMessages | Caveat |

## packages/ai/src/agent/create-agent-ui-stream-response.ts

| ID | Concept | Type |
|----|---------|------|
| 299 | CreateAgentUIStream | Entity |
| 301 | Agent | Entity |
| 302 | ToolLoopAgentOnStepFinishCallback | Entity |
| 308 | CreateAgentUIStreamResponse | Entity |
| 314 | CreateUIMessageStreamResponse | Entity |

## packages/ai/src/agent/create-agent-ui-stream.ts

| ID | Concept | Type |
|----|---------|------|
| 141 | UIMessageStream | Entity |
| 299 | CreateAgentUIStream | Entity |
| 301 | Agent | Entity |
| 315 | ValidateUIMessages | Entity |
| 316 | ConvertToModelMessages | Entity |
| 317 | BackwardCompatibilityOriginalMessages | Caveat |

## packages/ai/src/agent/index.ts

| ID | Concept | Type |
|----|---------|------|
| 287 | AgentModule | Entity |
| 288 | ToolLoopAgent | Entity |
| 289 | ToolLoopAgentSettings | Entity |
| 290 | AgentUIStream | Entity |
| 291 | InferAgentUIMessage | Entity |
| 292 | DeprecatedExperimentalAliases | Caveat |

## packages/ai/src/agent/infer-agent-tools.ts

| ID | Concept | Type |
|----|---------|------|
| 301 | Agent | Entity |
| 312 | InferAgentTools | Entity |

## packages/ai/src/agent/infer-agent-ui-message.test-d.ts

| ID | Concept | Type |
|----|---------|------|
| 288 | ToolLoopAgent | Entity |
| 291 | InferAgentUIMessage | Entity |
| 311 | UIMessage | Entity |
| 330 | InferAgentUIMessageTypeTest | Entity |

## packages/ai/src/agent/infer-agent-ui-message.ts

| ID | Concept | Type |
|----|---------|------|
| 291 | InferAgentUIMessage | Entity |
| 311 | UIMessage | Entity |
| 312 | InferAgentTools | Entity |
| 313 | InferUITools | Entity |

## packages/ai/src/agent/pipe-agent-ui-stream-to-response.ts

| ID | Concept | Type |
|----|---------|------|
| 298 | PipeAgentUIStreamToResponse | Entity |
| 299 | CreateAgentUIStream | Entity |
| 300 | PipeUIMessageStreamToResponse | Entity |
| 301 | Agent | Entity |
| 302 | ToolLoopAgentOnStepFinishCallback | Entity |

## packages/ai/src/agent/tool-loop-agent-settings.ts

| ID | Concept | Type |
|----|---------|------|
| 8 | GenerateTextModule | Entity |
| 13 | ToolSet | Entity |
| 289 | ToolLoopAgentSettings | Entity |
| 293 | ToolLoopAgentOnFinishCallback | Entity |
| 302 | ToolLoopAgentOnStepFinishCallback | Entity |
| 318 | ToolLoopAgentCallbacks | Entity |
| 322 | CallSettings | Entity |
| 323 | LanguageModel | Entity |
| 324 | StopConditionDefault | Caveat |
| 325 | ToolLoopAgentOnStartCallback | Entity |
| 326 | ToolLoopAgentOnStepStartCallback | Entity |
| 327 | ToolLoopAgentOnToolCallStartCallback | Entity |
| 328 | ToolLoopAgentOnToolCallFinishCallback | Entity |
| 329 | ToolLoopAgentSettingsFile | Entity |

## packages/ai/src/agent/tool-loop-agent.test-d.ts

| ID | Concept | Type |
|----|---------|------|
| 173 | StreamTextOnFinishCallback | Entity |
| 288 | ToolLoopAgent | Entity |
| 293 | ToolLoopAgentOnFinishCallback | Entity |
| 294 | AgentCallParameters | Entity |
| 295 | AgentStreamParameters | Entity |
| 296 | ToolLoopAgentTypeTests | Entity |
| 297 | OnFinishCallbackBidirectionalCompatibility | Rule |

## packages/ai/src/agent/tool-loop-agent.test.ts

| ID | Concept | Type |
|----|---------|------|
| 46 | MockLanguageModelV3 | Entity |
| 49 | CallbackErrorResilience | Caveat |
| 288 | ToolLoopAgent | Entity |
| 289 | ToolLoopAgentSettings | Entity |
| 303 | ToolLoopAgentCallbackOrdering | Rule |
| 304 | TelemetryIntegrations | Entity |

## packages/ai/src/agent/tool-loop-agent.ts

| ID | Concept | Type |
|----|---------|------|
| 44 | GenerateText | Entity |
| 93 | StreamText | Entity |
| 288 | ToolLoopAgent | Entity |
| 289 | ToolLoopAgentSettings | Entity |
| 305 | AgentInterface | Entity |
| 306 | ToolLoopStopCondition | Caveat |
| 307 | CallbackMerging | Rule |

## packages/ai/src/error/index.ts

| ID | Concept | Type |
|----|---------|------|
| 421 | ErrorIndex | Entity |
| 422 | AiSdkProvider | Entity |
| 423 | AiSdkProviderUtils | Entity |
| 424 | CoreErrorClasses | Entity |
| 425 | ToolErrors | Entity |
| 426 | GenerationErrors | Entity |
| 427 | ErrorReexportPattern | Rule |

## packages/ai/src/error/invalid-argument-error.ts

| ID | Concept | Type |
|----|---------|------|
| 429 | AISDKError | Entity |
| 430 | ErrorMarkerPattern | Rule |
| 445 | InvalidArgumentError | Entity |

## packages/ai/src/error/invalid-stream-part-error.ts

| ID | Concept | Type |
|----|---------|------|
| 38 | SingleRequestTextStreamPart | Entity |
| 428 | InvalidStreamPartError | Entity |
| 429 | AISDKError | Entity |
| 430 | ErrorMarkerPattern | Rule |

## packages/ai/src/error/invalid-tool-approval-error.ts

| ID | Concept | Type |
|----|---------|------|
| 204 | InvalidToolApprovalError | Entity |
| 429 | AISDKError | Entity |
| 430 | ErrorMarkerPattern | Rule |

## packages/ai/src/error/invalid-tool-input-error.ts

| ID | Concept | Type |
|----|---------|------|
| 97 | InvalidToolInputError | Entity |
| 429 | AISDKError | Entity |
| 430 | ErrorMarkerPattern | Rule |

## packages/ai/src/error/missing-tool-result-error.ts

| ID | Concept | Type |
|----|---------|------|
| 429 | AISDKError | Entity |
| 430 | ErrorMarkerPattern | Rule |
| 446 | MissingToolResultsError | Entity |

## packages/ai/src/error/no-image-generated-error.ts

| ID | Concept | Type |
|----|---------|------|
| 429 | AISDKError | Entity |
| 447 | NoImageGeneratedError | Entity |
| 448 | ImageModelResponseMetadata | Entity |
| 449 | NoImageGeneratedErrorMarkerPattern | Rule |

## packages/ai/src/error/no-object-generated-error.ts

| ID | Concept | Type |
|----|---------|------|
| 26 | NoObjectGeneratedError | Entity |
| 429 | AISDKError | Entity |
| 431 | NoObjectGeneratedErrorMarkerPattern | Rule |
| 432 | NoObjectGeneratedErrorCauses | Caveat |

## packages/ai/src/error/no-output-generated-error.ts

| ID | Concept | Type |
|----|---------|------|
| 429 | AISDKError | Entity |
| 430 | ErrorMarkerPattern | Rule |
| 453 | NoOutputGeneratedError | Entity |

## packages/ai/src/error/no-speech-generated-error.ts

| ID | Concept | Type |
|----|---------|------|
| 429 | AISDKError | Entity |
| 430 | ErrorMarkerPattern | Rule |
| 436 | NoSpeechGeneratedError | Entity |
| 437 | SpeechModelResponseMetadata | Entity |

## packages/ai/src/error/no-such-tool-error.ts

| ID | Concept | Type |
|----|---------|------|
| 33 | NoSuchToolError | Entity |
| 429 | AISDKError | Entity |
| 452 | NoSuchToolErrorMarkerPattern | Rule |

## packages/ai/src/error/no-transcript-generated-error.ts

| ID | Concept | Type |
|----|---------|------|
| 429 | AISDKError | Entity |
| 430 | ErrorMarkerPattern | Rule |
| 438 | NoTranscriptGeneratedError | Entity |
| 439 | TranscriptionModelResponseMetadata | Entity |

## packages/ai/src/error/no-video-generated-error.ts

| ID | Concept | Type |
|----|---------|------|
| 429 | AISDKError | Entity |
| 430 | ErrorMarkerPattern | Rule |
| 440 | NoVideoGeneratedError | Entity |
| 441 | VideoModelResponseMetadata | Entity |
| 442 | DeprecatedIsNoVideoGeneratedError | Caveat |

## packages/ai/src/error/tool-call-not-found-for-approval-error.ts

| ID | Concept | Type |
|----|---------|------|
| 205 | ToolCallNotFoundForApprovalError | Entity |
| 429 | AISDKError | Entity |
| 430 | ErrorMarkerPattern | Rule |

## packages/ai/src/error/tool-call-repair-error.ts

| ID | Concept | Type |
|----|---------|------|
| 33 | NoSuchToolError | Entity |
| 97 | InvalidToolInputError | Entity |
| 429 | AISDKError | Entity |
| 433 | ToolCallRepairError | Entity |
| 434 | ToolCallRepairErrorMarkerPattern | Rule |

## packages/ai/src/error/ui-message-stream-error.ts

| ID | Concept | Type |
|----|---------|------|
| 429 | AISDKError | Entity |
| 430 | ErrorMarkerPattern | Rule |
| 450 | UIMessageStreamError | Entity |
| 451 | UIMessageStreamChunkSequencing | Caveat |

## packages/ai/src/error/unsupported-model-version-error.ts

| ID | Concept | Type |
|----|---------|------|
| 384 | UnsupportedModelVersionError | Entity |
| 429 | AISDKError | Entity |
| 435 | ModelVersionMustBeV2 | Rule |

## packages/ai/src/error/verify-no-object-generated-error.ts

| ID | Concept | Type |
|----|---------|------|
| 26 | NoObjectGeneratedError | Entity |
| 443 | VerifyNoObjectGeneratedError | Entity |
| 444 | TestUtilityOnly | Caveat |

## packages/ai/src/generate-text/callback-events.ts

| ID | Concept | Type |
|----|---------|------|
| 3 | StepResult | Entity |
| 12 | StopCondition | Entity |
| 13 | ToolSet | Entity |
| 151 | CallbackEvents | Entity |
| 152 | OnStartEvent | Entity |
| 153 | OnStepStartEvent | Entity |
| 154 | OnToolCallStartEvent | Entity |
| 155 | OnToolCallFinishEvent | Entity |
| 156 | OnStepFinishEvent | Entity |
| 157 | OnFinishEvent | Entity |
| 158 | CallbackModelInfo | Entity |
| 159 | CallbackLifecycleOrder | Rule |

## packages/ai/src/generate-text/collect-tool-approvals.test.ts

| ID | Concept | Type |
|----|---------|------|
| 192 | CollectToolApprovals | Entity |
| 193 | ToolApprovalWorkflow | Rule |
| 194 | ApprovedWithResultIgnored | Caveat |
| 195 | UnknownApprovalIdThrows | Caveat |
| 196 | CollectToolApprovalsTest | Entity |

## packages/ai/src/generate-text/collect-tool-approvals.ts

| ID | Concept | Type |
|----|---------|------|
| 13 | ToolSet | Entity |
| 192 | CollectToolApprovals | Entity |
| 203 | CollectedToolApprovals | Entity |
| 204 | InvalidToolApprovalError | Entity |
| 205 | ToolCallNotFoundForApprovalError | Entity |
| 206 | ToolApprovalRequiresLastToolMessage | Caveat |
| 207 | ApprovalWithExistingResultSkipped | Rule |

## packages/ai/src/generate-text/content-part.ts

| ID | Concept | Type |
|----|---------|------|
| 6 | ReasoningOutput | Entity |
| 13 | ToolSet | Entity |
| 65 | GeneratedFile | Entity |
| 78 | ContentPart | Entity |
| 100 | ToolApprovalRequestOutput | Entity |

## packages/ai/src/generate-text/execute-tool-call.test.ts

| ID | Concept | Type |
|----|---------|------|
| 39 | ExecuteToolCall | Entity |
| 44 | GenerateText | Entity |
| 49 | CallbackErrorResilience | Caveat |
| 73 | ExecuteToolCallTest | Entity |
| 74 | PreliminaryToolResults | Entity |
| 75 | DynamicTools | Entity |

## packages/ai/src/generate-text/execute-tool-call.ts

| ID | Concept | Type |
|----|---------|------|
| 13 | ToolSet | Entity |
| 39 | ExecuteToolCall | Entity |
| 105 | TelemetryRecordSpan | Entity |
| 106 | ExecuteTool | Entity |
| 107 | NotifyUtil | Entity |
| 108 | ToolCallLifecycleCallbacks | Rule |
| 109 | NonSerializableResultIgnored | Caveat |

## packages/ai/src/generate-text/extract-reasoning-content.ts

| ID | Concept | Type |
|----|---------|------|
| 123 | LanguageModelV4Content | Entity |
| 181 | ExtractReasoningContent | Entity |
| 182 | LanguageModelV4Reasoning | Entity |

## packages/ai/src/generate-text/extract-text-content.ts

| ID | Concept | Type |
|----|---------|------|
| 122 | ExtractTextContent | Entity |
| 123 | LanguageModelV4Content | Entity |
| 124 | ExtractTextContentReturnsUndefinedForEmptyContent | Caveat |

## packages/ai/src/generate-text/generated-file.ts

| ID | Concept | Type |
|----|---------|------|
| 65 | GeneratedFile | Entity |
| 66 | DefaultGeneratedFile | Entity |
| 67 | DefaultGeneratedFileWithType | Entity |
| 68 | LazyConversionCaching | Caveat |

## packages/ai/src/generate-text/generate-text-result.ts

| ID | Concept | Type |
|----|---------|------|
| 3 | StepResult | Entity |
| 13 | ToolSet | Entity |
| 29 | Output | Entity |
| 45 | GenerateTextResult | Entity |
| 78 | ContentPart | Entity |
| 110 | LanguageModelUsage | Entity |
| 111 | GenerateTextResultTotalUsage | Caveat |

## packages/ai/src/generate-text/generate-text.test-d.ts

| ID | Concept | Type |
|----|---------|------|
| 10 | OutputModule | Entity |
| 44 | GenerateText | Entity |
| 46 | MockLanguageModelV3 | Entity |
| 183 | GenerateTextTypeTests | Entity |
| 184 | OutputTypeInference | Rule |

## packages/ai/src/generate-text/generate-text.test.ts

| ID | Concept | Type |
|----|---------|------|
| 3 | StepResult | Entity |
| 12 | StopCondition | Entity |
| 44 | GenerateText | Entity |
| 45 | GenerateTextResult | Entity |
| 46 | MockLanguageModelV3 | Entity |
| 47 | PrepareStep | Entity |
| 48 | ToolCallCallbacks | Entity |
| 49 | CallbackErrorResilience | Caveat |

## packages/ai/src/generate-text/generate-text.ts

| ID | Concept | Type |
|----|---------|------|
| 12 | StopCondition | Entity |
| 35 | ToolApprovalFlow | Caveat |
| 44 | GenerateText | Entity |
| 50 | DefaultGenerateTextResult | Entity |
| 51 | ExecuteTools | Entity |
| 52 | MultiStepLoop | Caveat |
| 53 | OutputParsingOnStopOnly | Rule |
| 54 | AsContent | Entity |
| 55 | GenerateTextIncludeSettings | Entity |
| 56 | GenerateTextOnStartCallback | Entity |
| 57 | GenerateTextOnStepStartCallback | Entity |
| 58 | GenerateTextOnToolCallStartCallback | Entity |
| 59 | GenerateTextOnToolCallFinishCallback | Entity |
| 60 | GenerateTextOnStepFinishCallback | Entity |
| 61 | GenerateTextOnFinishCallback | Entity |
| 62 | StopConditionLoop | Caveat |
| 63 | DeferredToolCallTracking | Caveat |
| 64 | IncludeSettingsMemoryRule | Rule |

## packages/ai/src/generate-text/index.ts

| ID | Concept | Type |
|----|---------|------|
| 8 | GenerateTextModule | Entity |
| 9 | StreamTextModule | Entity |
| 10 | OutputModule | Entity |
| 11 | SmoothStream | Entity |
| 12 | StopCondition | Entity |
| 13 | ToolSet | Entity |
| 14 | GenerateTextIndex | Entity |
| 15 | BackwardsCompatibilityAlias | Caveat |

## packages/ai/src/generate-text/is-approval-needed.ts

| ID | Concept | Type |
|----|---------|------|
| 13 | ToolSet | Entity |
| 41 | IsApprovalNeeded | Entity |
| 98 | TypedToolCall | Entity |
| 99 | NeedsApprovalCanBeBooleanOrFunction | Caveat |

## packages/ai/src/generate-text/output.test.ts

| ID | Concept | Type |
|----|---------|------|
| 10 | OutputModule | Entity |
| 26 | NoObjectGeneratedError | Entity |
| 130 | OutputText | Entity |
| 131 | OutputObject | Entity |
| 132 | OutputArray | Entity |
| 133 | OutputChoice | Entity |
| 134 | OutputJson | Entity |
| 135 | PartialJsonParsing | Caveat |

## packages/ai/src/generate-text/output.ts

| ID | Concept | Type |
|----|---------|------|
| 20 | OutputInterface | Entity |
| 21 | TextOutput | Entity |
| 22 | ObjectOutput | Entity |
| 23 | ArrayOutput | Entity |
| 24 | ChoiceOutput | Entity |
| 25 | JsonOutput | Entity |
| 26 | NoObjectGeneratedError | Entity |
| 27 | PartialOutputNoValidation | Caveat |
| 28 | ArrayRepairedParseSlicing | Caveat |
| 29 | Output | Entity |
| 30 | ArrayRepairedParseDropsLastElement | Caveat |

## packages/ai/src/generate-text/output-utils.ts

| ID | Concept | Type |
|----|---------|------|
| 29 | Output | Entity |
| 69 | OutputUtils | Entity |
| 70 | InferCompleteOutput | Entity |
| 71 | InferPartialOutput | Entity |
| 72 | InferElementOutput | Entity |

## packages/ai/src/generate-text/parse-tool-call.test.ts

| ID | Concept | Type |
|----|---------|------|
| 40 | ParseToolCall | Entity |
| 97 | InvalidToolInputError | Entity |
| 101 | ToolCallRepair | Entity |
| 102 | InvalidToolCallReturnsInvalidResult | Rule |
| 103 | NoSuchToolReturnsInvalidResult | Rule |
| 104 | RepairToolCallNullFallback | Caveat |

## packages/ai/src/generate-text/parse-tool-call.ts

| ID | Concept | Type |
|----|---------|------|
| 33 | NoSuchToolError | Entity |
| 40 | ParseToolCall | Entity |
| 96 | ToolCallRepairFunction | Entity |
| 97 | InvalidToolInputError | Entity |
| 197 | DoParseToolCall | Entity |
| 198 | ParseProviderExecutedDynamicToolCall | Entity |
| 199 | InvalidToolCallFallback | Caveat |
| 200 | EmptyInputCoercion | Caveat |

## packages/ai/src/generate-text/prepare-step.ts

| ID | Concept | Type |
|----|---------|------|
| 1 | PrepareStepFunction | Entity |
| 2 | PrepareStepResult | Entity |
| 3 | StepResult | Entity |
| 4 | PrepareStepOverridesModel | Caveat |
| 5 | PrepareStepFile | Entity |

## packages/ai/src/generate-text/prune-messages.test.ts

| ID | Concept | Type |
|----|---------|------|
| 86 | PruneMessages | Entity |
| 87 | PruneMessagesTest | Entity |
| 88 | ModelMessage | Entity |
| 89 | PruneReasoningModes | Caveat |
| 90 | PruneToolCallModes | Caveat |
| 91 | ToolCallBackwardTracing | Rule |

## packages/ai/src/generate-text/prune-messages.ts

| ID | Concept | Type |
|----|---------|------|
| 86 | PruneMessages | Entity |
| 88 | ModelMessage | Entity |
| 118 | PruneMessagesReasoningFilter | Caveat |
| 119 | PruneMessagesToolCallFilter | Caveat |
| 120 | PruneMessagesEmptyRemoval | Rule |
| 121 | ProviderUtils | Entity |

## packages/ai/src/generate-text/reasoning-output.ts

| ID | Concept | Type |
|----|---------|------|
| 6 | ReasoningOutput | Entity |
| 7 | ProviderMetadata | Entity |

## packages/ai/src/generate-text/reasoning.ts

| ID | Concept | Type |
|----|---------|------|
| 201 | AsReasoningText | Entity |
| 202 | ReasoningPart | Entity |

## packages/ai/src/generate-text/response-message.ts

| ID | Concept | Type |
|----|---------|------|
| 121 | ProviderUtils | Entity |
| 146 | ResponseMessage | Entity |

## packages/ai/src/generate-text/retention-benchmark.test.ts

| ID | Concept | Type |
|----|---------|------|
| 44 | GenerateText | Entity |
| 92 | RetentionBenchmarkTest | Entity |
| 93 | StreamText | Entity |
| 94 | ExperimentalIncludeOption | Caveat |
| 95 | MemoryRetentionBehavior | Caveat |

## packages/ai/src/generate-text/run-tools-transformation.test.ts

| ID | Concept | Type |
|----|---------|------|
| 31 | RunToolsTransformation | Entity |
| 32 | RunToolsTransformationTest | Entity |
| 33 | NoSuchToolError | Entity |
| 34 | MockTracer | Entity |
| 35 | ToolApprovalFlow | Caveat |
| 36 | ProviderExecutedToolsSkipLocalExecution | Rule |
| 37 | FinishHeldUntilToolResultsComplete | Rule |

## packages/ai/src/generate-text/run-tools-transformation.ts

| ID | Concept | Type |
|----|---------|------|
| 31 | RunToolsTransformation | Entity |
| 38 | SingleRequestTextStreamPart | Entity |
| 39 | ExecuteToolCall | Entity |
| 40 | ParseToolCall | Entity |
| 41 | IsApprovalNeeded | Entity |
| 42 | ToolResultsStreamClosure | Caveat |
| 43 | ToolExecutionNonBlocking | Caveat |

## packages/ai/src/generate-text/smooth-stream.test.ts

| ID | Concept | Type |
|----|---------|------|
| 11 | SmoothStream | Entity |
| 13 | ToolSet | Entity |
| 136 | TextStreamPart | Entity |
| 137 | SmoothStreamChunkingStrategies | Rule |
| 138 | BufferFlushBeforeToolCall | Caveat |
| 139 | SmoothStreamTest | Entity |

## packages/ai/src/generate-text/smooth-stream.ts

| ID | Concept | Type |
|----|---------|------|
| 11 | SmoothStream | Entity |
| 121 | ProviderUtils | Entity |
| 136 | TextStreamPart | Entity |
| 188 | ChunkDetector | Entity |
| 189 | ChunkingRegexps | Entity |
| 190 | ChunkingMustReturnPrefixOfBuffer | Caveat |
| 191 | NonSmoothableChunksPassThrough | Rule |

## packages/ai/src/generate-text/__snapshots__/generate-text.test.ts.snap

| ID | Concept | Type |
|----|---------|------|
| 44 | GenerateText | Entity |
| 66 | DefaultGeneratedFile | Entity |
| 77 | DefaultStepResult | Entity |
| 222 | StopWhenMultiStep | Caveat |
| 223 | TelemetryTracking | Entity |
| 224 | ToolCallFlow | Entity |

## packages/ai/src/generate-text/__snapshots__/stream-text.test.ts.snap

| ID | Concept | Type |
|----|---------|------|
| 93 | StreamText | Entity |
| 141 | UIMessageStream | Entity |
| 217 | StreamTextTelemetry | Entity |
| 218 | ToolCallExecution | Entity |
| 219 | StreamTextTestSnapshots | Entity |
| 220 | ErrorMaskingInStreams | Caveat |
| 221 | TelemetryDisabledByDefault | Caveat |

## packages/ai/src/generate-text/step-result.ts

| ID | Concept | Type |
|----|---------|------|
| 3 | StepResult | Entity |
| 13 | ToolSet | Entity |
| 77 | DefaultStepResult | Entity |
| 78 | ContentPart | Entity |
| 79 | ToolCallTypes | Entity |
| 80 | StepResultDerivedProperties | Caveat |

## packages/ai/src/generate-text/stop-condition.ts

| ID | Concept | Type |
|----|---------|------|
| 3 | StepResult | Entity |
| 12 | StopCondition | Entity |
| 13 | ToolSet | Entity |
| 210 | StepCountIs | Entity |
| 211 | HasToolCall | Entity |
| 212 | IsStopConditionMet | Entity |
| 213 | StopConditionOrSemantics | Caveat |

## packages/ai/src/generate-text/stream-text-result.ts

| ID | Concept | Type |
|----|---------|------|
| 3 | StepResult | Entity |
| 13 | ToolSet | Entity |
| 29 | Output | Entity |
| 136 | TextStreamPart | Entity |
| 140 | StreamTextResult | Entity |
| 147 | UIMessageStreamOptions | Entity |
| 148 | StreamAutoConsumption | Caveat |
| 149 | ConsumeStreamOptions | Entity |
| 150 | StreamTextResultFile | Rule |

## packages/ai/src/generate-text/stream-text.test-d.ts

| ID | Concept | Type |
|----|---------|------|
| 10 | OutputModule | Entity |
| 93 | StreamText | Entity |
| 184 | OutputTypeInference | Rule |
| 208 | StreamTextTypeTests | Entity |
| 209 | ElementStreamArrayOnly | Caveat |

## packages/ai/src/generate-text/stream-text.test.ts

| ID | Concept | Type |
|----|---------|------|
| 46 | MockLanguageModelV3 | Entity |
| 93 | StreamText | Entity |
| 140 | StreamTextResult | Entity |
| 141 | UIMessageStream | Entity |
| 142 | ToolExecution | Entity |
| 143 | MultiStepStreaming | Entity |
| 144 | StreamTextTestSuite | Entity |
| 145 | ErrorHandlingMustUseOnError | Caveat |

## packages/ai/src/generate-text/stream-text.ts

| ID | Concept | Type |
|----|---------|------|
| 160 | StreamTextFunction | Entity |
| 161 | DefaultStreamTextResult | Entity |
| 162 | StitchableStreamArchitecture | Entity |
| 163 | MultiStepToolLoop | Caveat |
| 164 | OutputTransformStream | Entity |
| 165 | UIMessageStreamIntegration | Entity |
| 166 | StopConditionGating | Rule |
| 167 | ChunkTimeoutAbort | Caveat |
| 168 | StreamTextTransform | Entity |
| 169 | EnrichedStreamPart | Entity |
| 170 | StreamTextOnErrorCallback | Entity |
| 171 | StreamTextOnStepFinishCallback | Entity |
| 172 | StreamTextOnChunkCallback | Entity |
| 173 | StreamTextOnFinishCallback | Entity |
| 174 | StreamTextOnAbortCallback | Entity |
| 175 | StreamTextIncludeSettings | Entity |
| 176 | StreamTextOnStartCallback | Entity |
| 177 | StreamTextOnStepStartCallback | Entity |
| 178 | StreamTextOnToolCallStartCallback | Entity |
| 179 | StreamTextOnToolCallFinishCallback | Entity |
| 180 | StreamTeeSplitBuffering | Caveat |

## packages/ai/src/generate-text/tool-approval-request-output.ts

| ID | Concept | Type |
|----|---------|------|
| 13 | ToolSet | Entity |
| 98 | TypedToolCall | Entity |
| 100 | ToolApprovalRequestOutput | Entity |

## packages/ai/src/generate-text/tool-call-repair-function.ts

| ID | Concept | Type |
|----|---------|------|
| 13 | ToolSet | Entity |
| 33 | NoSuchToolError | Entity |
| 96 | ToolCallRepairFunction | Entity |
| 97 | InvalidToolInputError | Entity |

## packages/ai/src/generate-text/tool-call.ts

| ID | Concept | Type |
|----|---------|------|
| 13 | ToolSet | Entity |
| 79 | ToolCallTypes | Entity |
| 98 | TypedToolCall | Entity |
| 112 | StaticToolCall | Entity |
| 113 | DynamicToolCall | Entity |
| 114 | DynamicToolCallInvalidField | Caveat |
| 115 | BaseToolCall | Entity |

## packages/ai/src/generate-text/tool-error.ts

| ID | Concept | Type |
|----|---------|------|
| 13 | ToolSet | Entity |
| 16 | TypedToolError | Entity |
| 17 | StaticToolError | Entity |
| 18 | DynamicToolError | Entity |
| 19 | StaticVsDynamicToolErrorDiscrimination | Caveat |

## packages/ai/src/generate-text/tool-output-denied.ts

| ID | Concept | Type |
|----|---------|------|
| 13 | ToolSet | Entity |
| 214 | StaticToolOutputDenied | Entity |
| 215 | TypedToolOutputDenied | Entity |
| 216 | ValueOf | Entity |

## packages/ai/src/generate-text/tool-output.ts

| ID | Concept | Type |
|----|---------|------|
| 13 | ToolSet | Entity |
| 16 | TypedToolError | Entity |
| 116 | ToolOutput | Entity |
| 117 | TypedToolResult | Entity |

## packages/ai/src/generate-text/tool-result.ts

| ID | Concept | Type |
|----|---------|------|
| 7 | ProviderMetadata | Entity |
| 13 | ToolSet | Entity |
| 117 | TypedToolResult | Entity |
| 125 | ToolResult | Entity |
| 126 | Caveat_DynamicVsStaticToolResult | Caveat |
| 127 | StaticToolResult | Entity |
| 128 | DynamicToolResult | Entity |
| 129 | ToolResultDiscrimination | Rule |

## packages/ai/src/generate-text/tool-set.ts

| ID | Concept | Type |
|----|---------|------|
| 13 | ToolSet | Entity |
| 76 | Tool | Entity |

## packages/ai/src/generate-text/to-response-messages.test.ts

| ID | Concept | Type |
|----|---------|------|
| 66 | DefaultGeneratedFile | Entity |
| 81 | ToResponseMessages | Entity |
| 82 | ToResponseMessagesTest | Entity |
| 83 | ToolResultSeparation | Rule |
| 84 | ProviderExecutedToolsInlineResults | Rule |
| 85 | EmptyTextPartOmission | Caveat |

## packages/ai/src/generate-text/to-response-messages.ts

| ID | Concept | Type |
|----|---------|------|
| 13 | ToolSet | Entity |
| 78 | ContentPart | Entity |
| 81 | ToResponseMessages | Entity |
| 185 | CreateToolModelOutput | Entity |
| 186 | ProviderExecutedToolResultsSkipped | Caveat |
| 187 | SourcePartsSkipped | Caveat |

## packages/ai/src/middleware/add-tool-input-examples-middleware.test.ts

| ID | Concept | Type |
|----|---------|------|
| 232 | MockLanguageModelV4 | Entity |
| 239 | AddToolInputExamplesMiddleware | Entity |
| 243 | AddToolInputExamplesMiddlewareTest | Entity |
| 244 | LanguageModelV4CallOptions | Entity |
| 245 | MiddlewareRemovesInputExamplesByDefault | Rule |
| 246 | ProviderToolsPassedUnchanged | Caveat |

## packages/ai/src/middleware/add-tool-input-examples-middleware.ts

| ID | Concept | Type |
|----|---------|------|
| 226 | LanguageModelMiddleware | Entity |
| 239 | AddToolInputExamplesMiddleware | Entity |
| 240 | LanguageModelV4FunctionTool | Entity |
| 241 | MiddlewareAppendsExamplesToDescription | Rule |
| 242 | OnlyTransformsFunctionToolsWithExamples | Caveat |

## packages/ai/src/middleware/default-embedding-settings-middleware.test.ts

| ID | Concept | Type |
|----|---------|------|
| 262 | DefaultEmbeddingSettingsMiddlewareTest | Entity |
| 263 | DefaultEmbeddingSettingsMiddleware | Entity |
| 264 | MockEmbeddingModelV4 | Entity |
| 265 | HeaderMergingBehavior | Caveat |
| 266 | ProviderOptionsMergingBehavior | Caveat |

## packages/ai/src/middleware/default-embedding-settings-middleware.ts

| ID | Concept | Type |
|----|---------|------|
| 254 | MergeObjects | Entity |
| 263 | DefaultEmbeddingSettingsMiddleware | Entity |
| 267 | EmbeddingModelMiddleware | Entity |
| 273 | EmbeddingModelV4CallOptions | Entity |
| 274 | MiddlewareMergesDefaultSettings | Rule |

## packages/ai/src/middleware/default-settings-middleware.test.ts

| ID | Concept | Type |
|----|---------|------|
| 232 | MockLanguageModelV4 | Entity |
| 244 | LanguageModelV4CallOptions | Entity |
| 251 | DefaultSettingsMiddleware | Entity |
| 252 | UserParamsPrecedenceRule | Rule |
| 253 | ProviderOptionsDeepMerge | Caveat |

## packages/ai/src/middleware/default-settings-middleware.ts

| ID | Concept | Type |
|----|---------|------|
| 226 | LanguageModelMiddleware | Entity |
| 244 | LanguageModelV4CallOptions | Entity |
| 251 | DefaultSettingsMiddleware | Entity |
| 254 | MergeObjects | Entity |
| 255 | DefaultSettingsOverriddenByExplicitParams | Caveat |

## packages/ai/src/middleware/extract-json-middleware.test.ts

| ID | Concept | Type |
|----|---------|------|
| 44 | GenerateText | Entity |
| 46 | MockLanguageModelV3 | Entity |
| 93 | StreamText | Entity |
| 230 | WrapLanguageModel | Entity |
| 247 | ExtractJsonMiddleware | Entity |
| 277 | ExtractJsonMiddlewareStripsFences | Caveat |
| 278 | ExtractJsonMiddlewareCustomTransform | Caveat |

## packages/ai/src/middleware/extract-json-middleware.ts

| ID | Concept | Type |
|----|---------|------|
| 226 | LanguageModelMiddleware | Entity |
| 247 | ExtractJsonMiddleware | Entity |
| 248 | DefaultTransform | Entity |
| 249 | StreamSuffixBuffering | Caveat |
| 250 | CustomTransformBuffersAll | Caveat |

## packages/ai/src/middleware/extract-reasoning-middleware.test.ts

| ID | Concept | Type |
|----|---------|------|
| 44 | GenerateText | Entity |
| 46 | MockLanguageModelV3 | Entity |
| 93 | StreamText | Entity |
| 225 | ExtractReasoningMiddleware | Entity |
| 230 | WrapLanguageModel | Entity |
| 279 | StartWithReasoningOption | Caveat |

## packages/ai/src/middleware/extract-reasoning-middleware.ts

| ID | Concept | Type |
|----|---------|------|
| 225 | ExtractReasoningMiddleware | Entity |
| 226 | LanguageModelMiddleware | Entity |
| 227 | GetPotentialStartIndex | Entity |
| 228 | ReasoningStreamStateMachine | Caveat |
| 229 | DelayedTextStartOrdering | Caveat |

## packages/ai/src/middleware/index.ts

| ID | Concept | Type |
|----|---------|------|
| 225 | ExtractReasoningMiddleware | Entity |
| 230 | WrapLanguageModel | Entity |
| 235 | MiddlewareIndex | Entity |
| 236 | WrapEmbeddingModel | Entity |
| 237 | WrapProvider | Entity |
| 238 | SimulateStreamingMiddleware | Entity |

## packages/ai/src/middleware/simulate-streaming-middleware.test.ts

| ID | Concept | Type |
|----|---------|------|
| 46 | MockLanguageModelV3 | Entity |
| 93 | StreamText | Entity |
| 230 | WrapLanguageModel | Entity |
| 238 | SimulateStreamingMiddleware | Entity |
| 276 | SimulateStreamingConvertsGenerateToStream | Caveat |

## packages/ai/src/middleware/simulate-streaming-middleware.ts

| ID | Concept | Type |
|----|---------|------|
| 226 | LanguageModelMiddleware | Entity |
| 238 | SimulateStreamingMiddleware | Entity |
| 283 | LanguageModelV4StreamPart | Entity |
| 284 | StreamSimulationConvertsGenerateToStream | Caveat |

## packages/ai/src/middleware/__snapshots__/simulate-streaming-middleware.test.ts.snap

| ID | Concept | Type |
|----|---------|------|
| 238 | SimulateStreamingMiddleware | Entity |
| 285 | SimulateStreamingMiddlewareTestSnapshot | Entity |
| 286 | StreamingEventProtocol | Rule |

## packages/ai/src/middleware/wrap-embedding-model.test.ts

| ID | Concept | Type |
|----|---------|------|
| 233 | MiddlewareChaining | Rule |
| 234 | MiddlewareArrayImmutability | Caveat |
| 236 | WrapEmbeddingModel | Entity |
| 264 | MockEmbeddingModelV4 | Entity |
| 272 | EmbeddingModelV4Middleware | Entity |

## packages/ai/src/middleware/wrap-embedding-model.ts

| ID | Concept | Type |
|----|---------|------|
| 236 | WrapEmbeddingModel | Entity |
| 260 | MiddlewareOrderingRule | Rule |
| 267 | EmbeddingModelMiddleware | Entity |
| 268 | AsEmbeddingModelV4 | Entity |

## packages/ai/src/middleware/wrap-image-model.test.ts

| ID | Concept | Type |
|----|---------|------|
| 233 | MiddlewareChaining | Rule |
| 256 | WrapImageModel | Entity |
| 280 | ImageModelV4Middleware | Entity |
| 281 | MockImageModelV4 | Entity |
| 282 | WrapGenerateOrderRule | Caveat |

## packages/ai/src/middleware/wrap-image-model.ts

| ID | Concept | Type |
|----|---------|------|
| 256 | WrapImageModel | Entity |
| 257 | DoWrap | Entity |
| 258 | ImageModelMiddleware | Entity |
| 259 | AsImageModelV4 | Entity |
| 260 | MiddlewareOrderingRule | Rule |
| 261 | MaxImagesPerCallBindingCaveat | Caveat |

## packages/ai/src/middleware/wrap-language-model.test.ts

| ID | Concept | Type |
|----|---------|------|
| 230 | WrapLanguageModel | Entity |
| 231 | LanguageModelV4Middleware | Entity |
| 232 | MockLanguageModelV4 | Entity |
| 233 | MiddlewareChaining | Rule |
| 234 | MiddlewareArrayImmutability | Caveat |

## packages/ai/src/middleware/wrap-language-model.ts

| ID | Concept | Type |
|----|---------|------|
| 226 | LanguageModelMiddleware | Entity |
| 230 | WrapLanguageModel | Entity |
| 257 | DoWrap | Entity |
| 260 | MiddlewareOrderingRule | Rule |
| 271 | AsLanguageModelV4 | Entity |

## packages/ai/src/middleware/wrap-provider.test.ts

| ID | Concept | Type |
|----|---------|------|
| 226 | LanguageModelMiddleware | Entity |
| 237 | WrapProvider | Entity |
| 258 | ImageModelMiddleware | Entity |
| 269 | WrapProviderTest | Entity |
| 270 | WrapProviderSupportsV2AndV3 | Caveat |

## packages/ai/src/middleware/wrap-provider.ts

| ID | Concept | Type |
|----|---------|------|
| 226 | LanguageModelMiddleware | Entity |
| 230 | WrapLanguageModel | Entity |
| 237 | WrapProvider | Entity |
| 256 | WrapImageModel | Entity |
| 258 | ImageModelMiddleware | Entity |
| 260 | MiddlewareOrderingRule | Rule |
| 275 | AsProviderV4 | Entity |

## packages/ai/src/model/as-embedding-model-v3.test.ts

| ID | Concept | Type |
|----|---------|------|
| 354 | AsEmbeddingModelV3 | Entity |
| 355 | EmbeddingModelV2ToV3Compatibility | Caveat |
| 356 | MockEmbeddingModelV2 | Entity |
| 357 | MockEmbeddingModelV3 | Entity |
| 358 | LogWarnings | Entity |

## packages/ai/src/model/as-embedding-model-v3.ts

| ID | Concept | Type |
|----|---------|------|
| 343 | LogV2CompatibilityWarning | Entity |
| 354 | AsEmbeddingModelV3 | Entity |
| 418 | EmbeddingModelV3 | Entity |
| 419 | EmbeddingModelV2 | Entity |
| 420 | V2ToV3ProxyAdapter | Caveat |

## packages/ai/src/model/as-embedding-model-v4.test.ts

| ID | Concept | Type |
|----|---------|------|
| 264 | MockEmbeddingModelV4 | Entity |
| 268 | AsEmbeddingModelV4 | Entity |
| 356 | MockEmbeddingModelV2 | Entity |
| 357 | MockEmbeddingModelV3 | Entity |
| 397 | EmbeddingModelVersionUpgrade | Rule |
| 398 | AsEmbeddingModelV4Test | Entity |

## packages/ai/src/model/as-embedding-model-v4.ts

| ID | Concept | Type |
|----|---------|------|
| 268 | AsEmbeddingModelV4 | Entity |
| 354 | AsEmbeddingModelV3 | Entity |
| 393 | EmbeddingModelVersionAdapter | Caveat |
| 394 | ProxyBasedVersionUpgrade | Rule |

## packages/ai/src/model/as-image-model-v3.test.ts

| ID | Concept | Type |
|----|---------|------|
| 331 | AsImageModelV3 | Entity |
| 358 | LogWarnings | Entity |
| 364 | ImageModelV2 | Entity |
| 365 | ImageModelV3 | Entity |
| 366 | V2ToV3CompatibilityWarning | Caveat |
| 367 | AsImageModelV3Test | Entity |

## packages/ai/src/model/as-image-model-v3.ts

| ID | Concept | Type |
|----|---------|------|
| 331 | AsImageModelV3 | Entity |
| 343 | LogV2CompatibilityWarning | Entity |
| 359 | ImageModelV2V3Proxy | Caveat |

## packages/ai/src/model/as-image-model-v4.test.ts

| ID | Concept | Type |
|----|---------|------|
| 259 | AsImageModelV4 | Entity |
| 281 | MockImageModelV4 | Entity |
| 333 | AsImageModelV4Test | Entity |
| 334 | MockImageModelV2 | Entity |
| 335 | MockImageModelV3 | Entity |
| 336 | ImageModelVersionUpgrade | Rule |

## packages/ai/src/model/as-image-model-v4.ts

| ID | Concept | Type |
|----|---------|------|
| 259 | AsImageModelV4 | Entity |
| 331 | AsImageModelV3 | Entity |
| 332 | ImageModelVersionProxy | Caveat |

## packages/ai/src/model/as-language-model-v3.test.ts

| ID | Concept | Type |
|----|---------|------|
| 46 | MockLanguageModelV3 | Entity |
| 337 | AsLanguageModelV3 | Entity |
| 358 | LogWarnings | Entity |
| 400 | LanguageModelV2ToV3Conversion | Caveat |
| 401 | MockLanguageModelV2 | Entity |
| 402 | V2UsageToV3UsageMapping | Rule |

## packages/ai/src/model/as-language-model-v3.ts

| ID | Concept | Type |
|----|---------|------|
| 337 | AsLanguageModelV3 | Entity |
| 338 | LanguageModelV2ToV3Proxy | Caveat |
| 339 | ConvertV2StreamToV3 | Entity |
| 340 | ConvertV2FinishReasonToV3 | Entity |
| 341 | ConvertV2UsageToV3 | Entity |
| 342 | LanguageModelV3Spec | Entity |
| 343 | LogV2CompatibilityWarning | Entity |

## packages/ai/src/model/as-language-model-v4.test.ts

| ID | Concept | Type |
|----|---------|------|
| 46 | MockLanguageModelV3 | Entity |
| 232 | MockLanguageModelV4 | Entity |
| 271 | AsLanguageModelV4 | Entity |
| 401 | MockLanguageModelV2 | Entity |
| 411 | V2ToV4ConversionChain | Caveat |
| 412 | AsLanguageModelV4Test | Entity |

## packages/ai/src/model/as-language-model-v4.ts

| ID | Concept | Type |
|----|---------|------|
| 271 | AsLanguageModelV4 | Entity |
| 337 | AsLanguageModelV3 | Entity |
| 416 | LanguageModelVersionProxy | Caveat |
| 417 | LanguageModelV4 | Entity |

## packages/ai/src/model/as-provider-v3.ts

| ID | Concept | Type |
|----|---------|------|
| 331 | AsImageModelV3 | Entity |
| 337 | AsLanguageModelV3 | Entity |
| 354 | AsEmbeddingModelV3 | Entity |
| 376 | AsTranscriptionModelV3 | Entity |
| 395 | AsSpeechModelV3 | Entity |
| 408 | AsProviderV3 | Entity |
| 410 | ProviderV2ToV3Caveat | Caveat |

## packages/ai/src/model/as-provider-v4.test.ts

| ID | Concept | Type |
|----|---------|------|
| 275 | AsProviderV4 | Entity |
| 344 | AsProviderV4Test | Entity |
| 345 | MockProviderV3 | Entity |
| 346 | MockProviderV4 | Entity |
| 347 | V3ToV4ProviderConversion | Rule |

## packages/ai/src/model/as-provider-v4.ts

| ID | Concept | Type |
|----|---------|------|
| 259 | AsImageModelV4 | Entity |
| 268 | AsEmbeddingModelV4 | Entity |
| 271 | AsLanguageModelV4 | Entity |
| 275 | AsProviderV4 | Entity |
| 348 | AsSpeechModelV4 | Entity |
| 360 | AsRerankingModelV4 | Entity |
| 371 | AsTranscriptionModelV4 | Entity |
| 408 | AsProviderV3 | Entity |
| 409 | ProviderVersionUpgrade | Rule |

## packages/ai/src/model/as-reranking-model-v4.test.ts

| ID | Concept | Type |
|----|---------|------|
| 360 | AsRerankingModelV4 | Entity |
| 361 | MockRerankingModelV3 | Entity |
| 362 | MockRerankingModelV4 | Entity |
| 363 | RerankingModelV3ToV4PassthroughRule | Rule |

## packages/ai/src/model/as-reranking-model-v4.ts

| ID | Concept | Type |
|----|---------|------|
| 360 | AsRerankingModelV4 | Entity |
| 368 | RerankingModelV3 | Entity |
| 369 | RerankingModelV4 | Entity |
| 370 | RerankingModelProxyAdapter | Caveat |

## packages/ai/src/model/as-speech-model-v3.test.ts

| ID | Concept | Type |
|----|---------|------|
| 350 | MockSpeechModelV2 | Entity |
| 351 | MockSpeechModelV3 | Entity |
| 358 | LogWarnings | Entity |
| 395 | AsSpeechModelV3 | Entity |
| 396 | SpeechModelV2ToV3Compatibility | Caveat |

## packages/ai/src/model/as-speech-model-v3.ts

| ID | Concept | Type |
|----|---------|------|
| 343 | LogV2CompatibilityWarning | Entity |
| 395 | AsSpeechModelV3 | Entity |
| 413 | SpeechModelV3ProxyAdapter | Caveat |
| 414 | SpeechModelV3 | Entity |
| 415 | SpeechModelV2 | Entity |

## packages/ai/src/model/as-speech-model-v4.test.ts

| ID | Concept | Type |
|----|---------|------|
| 348 | AsSpeechModelV4 | Entity |
| 349 | AsSpeechModelV4Test | Entity |
| 350 | MockSpeechModelV2 | Entity |
| 351 | MockSpeechModelV3 | Entity |
| 352 | MockSpeechModelV4 | Entity |
| 353 | SpeechModelVersionAdapter | Caveat |

## packages/ai/src/model/as-speech-model-v4.ts

| ID | Concept | Type |
|----|---------|------|
| 348 | AsSpeechModelV4 | Entity |
| 395 | AsSpeechModelV3 | Entity |
| 399 | SpeechModelVersionProxy | Caveat |

## packages/ai/src/model/as-transcription-model-v3.test.ts

| ID | Concept | Type |
|----|---------|------|
| 358 | LogWarnings | Entity |
| 366 | V2ToV3CompatibilityWarning | Caveat |
| 376 | AsTranscriptionModelV3 | Entity |
| 377 | TranscriptionModelV2 | Entity |
| 378 | TranscriptionModelV3 | Entity |

## packages/ai/src/model/as-transcription-model-v3.ts

| ID | Concept | Type |
|----|---------|------|
| 343 | LogV2CompatibilityWarning | Entity |
| 376 | AsTranscriptionModelV3 | Entity |
| 377 | TranscriptionModelV2 | Entity |
| 378 | TranscriptionModelV3 | Entity |
| 379 | V2ToV3TranscriptionProxyIncomplete | Caveat |

## packages/ai/src/model/as-transcription-model-v4.test.ts

| ID | Concept | Type |
|----|---------|------|
| 371 | AsTranscriptionModelV4 | Entity |
| 372 | MockTranscriptionModelV2 | Entity |
| 373 | MockTranscriptionModelV3 | Entity |
| 374 | MockTranscriptionModelV4 | Entity |
| 375 | TranscriptionModelVersionUpgrade | Rule |

## packages/ai/src/model/as-transcription-model-v4.ts

| ID | Concept | Type |
|----|---------|------|
| 371 | AsTranscriptionModelV4 | Entity |
| 376 | AsTranscriptionModelV3 | Entity |
| 380 | TranscriptionModelVersionProxy | Caveat |

## packages/ai/src/model/as-video-model-v4.test.ts

| ID | Concept | Type |
|----|---------|------|
| 388 | AsVideoModelV4 | Entity |
| 390 | MockVideoModelV3 | Entity |
| 391 | MockVideoModelV4 | Entity |
| 392 | VideoModelVersionAdaptation | Rule |

## packages/ai/src/model/as-video-model-v4.ts

| ID | Concept | Type |
|----|---------|------|
| 388 | AsVideoModelV4 | Entity |
| 389 | VideoModelV3ToV4ProxyAdapter | Caveat |

## packages/ai/src/model/resolve-model.test.ts

| ID | Concept | Type |
|----|---------|------|
| 381 | ResolveModel | Entity |
| 403 | ModelVersionAdaptation | Caveat |
| 404 | GlobalDefaultProvider | Entity |
| 405 | GatewayFallback | Rule |
| 406 | CustomProvider | Entity |
| 407 | UnsupportedVersionError | Caveat |

## packages/ai/src/model/resolve-model.ts

| ID | Concept | Type |
|----|---------|------|
| 381 | ResolveModel | Entity |
| 382 | GetGlobalProvider | Entity |
| 383 | GatewayProvider | Entity |
| 384 | UnsupportedModelVersionError | Entity |
| 385 | ModelVersionAdapters | Entity |
| 386 | VersionV2V3V4Only | Caveat |
| 387 | VideoModelExperimental | Caveat |

