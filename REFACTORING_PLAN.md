# Refactoring Plan: http-client-js & flight-instructor Code Deduplication

## Executive Summary

This plan outlines how to eliminate code duplication between `@typespec/http-client-js` (a full client library emitter) and `flight-instructor` (an on-demand, AI-driven code snippet generator) by creating a shared library of reusable Alloy.js-based code generation components.

## Current Architecture Analysis

### http-client-js
- **Purpose**: TypeSpec emitter that generates complete, production-ready JavaScript/TypeScript HTTP client libraries
- **Output**: Full npm package with client classes, models, operations, serializers, helpers
- **Architecture**: JSX-based code generation using Alloy.js and @typespec/emitter-framework
- **Entry Point**: `$onEmit()` function called by TypeSpec compiler

### flight-instructor
- **Purpose**: CLI tool for on-demand, incremental code generation with AI prompt integration
- **Output**: Code snippets for specific operations (models, serialization, REST calls)
- **Architecture**: Similar JSX-based approach using Alloy.js but with custom renderer abstraction
- **Entry Point**: CLI commands like `rest-client call`, `rest-client models`, etc.

### Identified Duplications

Both projects implement similar functionality:

1. **Model Generation**
   - `http-client-js`: `src/components/models.tsx`
   - `flight-instructor`: `src/typescript/components/model/model-declaration.tsx`

2. **Serialization/Deserialization**
   - `http-client-js`: `src/components/transforms/json/json-transform.tsx`
   - `flight-instructor`: `src/typescript/components/serialization/serialization-expression.tsx`

3. **HTTP Request Building**
   - `http-client-js`: `src/components/http-request.tsx`, `src/components/http-request-options.tsx`
   - `flight-instructor`: `src/typescript/components/typespec-http-request/fetch-call.tsx`, `request-*.tsx`

4. **Helper Functions**
   - Both generate similar helper code for error handling, retry logic, multipart, etc.

5. **Type System Handling**
   - Both handle TypeSpec types (models, scalars, unions, arrays, records)
   - Both implement encoding/decoding logic for dates, bytes, etc.

## Proposed Architecture

### New Package Structure

```
packages/
├── http-client-js/                    # Emitter package (depends on shared)
│   └── src/
│       ├── emitter.tsx                # TypeSpec emitter entry point
│       ├── lib.ts                     # Emitter configuration
│       └── components/                # High-level composition components
│           ├── client.tsx             # Client class generation
│           ├── output.tsx             # Package structure
│           └── ...
│
├── http-client-js-components/         # 🆕 NEW: Shared components library
│   └── src/
│       ├── index.ts                   # Public exports
│       ├── models/                    # Model generation components
│       │   ├── model-declaration.tsx
│       │   └── model-reference.tsx
│       ├── serialization/             # Transform/serialization components
│       │   ├── json-transform.tsx
│       │   ├── scalar-transform.tsx
│       │   └── model-serialization.tsx
│       ├── requests/                  # HTTP request building components
│       │   ├── http-request-builder.tsx
│       │   ├── request-parameters.tsx
│       │   ├── request-body.tsx
│       │   ├── request-headers.tsx
│       │   └── url-builder.tsx
│       ├── helpers/                   # Helper function generators
│       │   ├── error-handling.tsx
│       │   ├── retry-logic.tsx
│       │   ├── multipart.tsx
│       │   └── bytes-encoding.tsx
│       ├── contexts/                  # Shared contexts
│       │   ├── encoding-context.tsx
│       │   └── transform-context.tsx
│       └── utils/                     # Shared utilities
│           ├── type-utils.ts
│           └── name-policy.ts
│
└── flight-instructor/                 # Independent CLI tool (depends on shared)
    └── src/
        ├── cli/                       # CLI command handlers (UNCHANGED)
        ├── codegen-options.ts         # Configuration (UNCHANGED)
        ├── renderer.ts                # Abstract renderer (SIMPLIFIED)
        ├── auth.ts                    # Auth handling (UNCHANGED)
        └── typescript/
            └── typescript-renderer.tsx # Uses shared components
```

## Refactoring Strategy

### Phase 1: Create Shared Components Package (Week 1-2)

#### Step 1.1: Package Setup
```bash
# In typespec repo
mkdir -p packages/http-client-js-components/src
cd packages/http-client-js-components
```

Create `package.json`:
```json
{
  "name": "@typespec/http-client-js-components",
  "version": "0.1.0",
  "description": "Shared Alloy.js components for JavaScript/TypeScript HTTP client code generation",
  "type": "module",
  "main": "dist/src/index.js",
  "exports": {
    ".": "./dist/src/index.js",
    "./models": "./dist/src/models/index.js",
    "./serialization": "./dist/src/serialization/index.js",
    "./requests": "./dist/src/requests/index.js",
    "./helpers": "./dist/src/helpers/index.js",
    "./contexts": "./dist/src/contexts/index.js",
    "./utils": "./dist/src/utils/index.js"
  },
  "peerDependencies": {
    "@alloy-js/core": "^0.22.0",
    "@alloy-js/typescript": "^0.22.0",
    "@typespec/compiler": "^1.8.0",
    "@typespec/emitter-framework": "^0.15.0",
    "@typespec/http": "^1.6.0",
    "@typespec/http-client": "^0.14.0"
  }
}
```

#### Step 1.2: Extract Model Components

Move from `http-client-js/src/components/models.tsx` → `http-client-js-components/src/models/`:

**Core Components:**
- `ModelDeclaration` - Generate TypeScript interface/type for a model
- `ModelReference` - Reference a model type
- `ArrayTypeDeclaration` - Handle array types
- `RecordTypeDeclaration` - Handle record/map types

**API Design:**
```tsx
// http-client-js-components/src/models/model-declaration.tsx
export interface ModelDeclarationProps {
  type: Type;
  export?: boolean;
  refkey?: Refkey;
}

export function ModelDeclaration(props: ModelDeclarationProps) {
  // Implementation extracted from http-client-js
}
```

#### Step 1.3: Extract Serialization Components

Move from both projects → `http-client-js-components/src/serialization/`:

**Core Components:**
- `JsonTransform` - Transform data between wire and application formats
- `ScalarTransform` - Handle scalar type transformations (dates, bytes, etc.)
- `ModelSerializationExpression` - Serialize/deserialize model instances
- `UnionSerializationExpression` - Handle union type transformations
- `ArrayTransform` - Transform arrays
- `RecordTransform` - Transform records/maps

**Unified API:**
```tsx
// http-client-js-components/src/serialization/json-transform.tsx
export interface TransformProps {
  type: Type;
  valueRef: Refkey | Children;
  direction: "toWire" | "fromWire";
  codec?: CodecConfig;
}

export function JsonTransform(props: TransformProps) {
  // Unified implementation combining best of both
}
```

#### Step 1.4: Extract HTTP Request Components

Create in `http-client-js-components/src/requests/`:

**Core Components:**
- `HttpRequestBuilder` - Main request construction
- `RequestUrl` - URL templating with parameters
- `RequestHeaders` - Header building
- `RequestBody` - Body serialization
- `RequestQuery` - Query string handling
- `RequestParameters` - Parameter collection

**API Design:**
```tsx
// http-client-js-components/src/requests/http-request-builder.tsx
export interface HttpRequestBuilderProps {
  operation: HttpOperation;
  contextRef?: Refkey;
  includeAuth?: boolean;
  includeRetry?: boolean;
}

export function HttpRequestBuilder(props: HttpRequestBuilderProps) {
  return (
    <>
      <RequestUrl operation={props.operation} />
      <RequestHeaders operation={props.operation} />
      <RequestBody operation={props.operation} />
      <FetchCall {...props} />
    </>
  );
}
```

#### Step 1.5: Extract Helper Generators

Create in `http-client-js-components/src/helpers/`:

**Core Components:**
- `RestErrorDeclaration` - Error class generation
- `RetryLogicHelper` - Retry functionality
- `MultipartHelper` - Multipart form handling
- `BytesEncodingHelper` - Base64/bytes encoding
- `PagingHelper` - Pagination support
- `AuthHelper` - Authentication helpers

#### Step 1.6: Extract Shared Contexts

Create in `http-client-js-components/src/contexts/`:

**Core Contexts:**
- `EncodingContext` - Encoding preferences (dates, bytes)
- `CodecContext` - Serialization codec registry
- `TransformPolicyContext` - Name/casing transformation rules

#### Step 1.7: Create Configuration System

```tsx
// http-client-js-components/src/config.ts
export interface ComponentConfig {
  encoding?: {
    dates?: "date" | "iso-string" | "temporal" | "unix-timestamp";
    bytes?: "base64" | "uint8array" | "none";
  };
  naming?: {
    normalize?: boolean;
    casing?: "camel" | "pascal" | "original";
  };
  features?: {
    validation?: boolean;
    retry?: boolean;
    auth?: boolean;
  };
}

export function createComponentConfig(options: Partial<ComponentConfig>): ComponentConfig {
  return { /* defaults + overrides */ };
}
```

### Phase 2: Migrate http-client-js (Week 2-3)

#### Step 2.1: Update Dependencies

```json
// packages/http-client-js/package.json
{
  "dependencies": {
    "@typespec/http-client-js-components": "workspace:^",
    // ... existing deps
  }
}
```

#### Step 2.2: Refactor Components to Use Shared Library

**Before:**
```tsx
// packages/http-client-js/src/components/models.tsx
export function Models(props: ModelsProps) {
  const { $ } = useTsp();
  const clientLibrary = useClientLibrary();
  const dataTypes = clientLibrary.dataTypes;
  return (
    <ts.SourceFile path={props.path ?? "models.ts"}>
      <For each={dataTypes} hardline>
        {(type) => {
          return $.array.is(type) || $.record.is(type) ? null : (
            <ef.TypeDeclaration export type={type} refkey={refkey(type)} />
          );
        }}
      </For>
    </ts.SourceFile>
  );
}
```

**After:**
```tsx
// packages/http-client-js/src/components/models.tsx
import { ModelDeclaration } from "@typespec/http-client-js-components/models";

export function Models(props: ModelsProps) {
  const { $ } = useTsp();
  const clientLibrary = useClientLibrary();
  const dataTypes = clientLibrary.dataTypes;
  
  return (
    <ts.SourceFile path={props.path ?? "models.ts"}>
      <For each={dataTypes} hardline>
        {(type) => {
          return $.array.is(type) || $.record.is(type) ? null : (
            <ModelDeclaration type={type} export refkey={refkey(type)} />
          );
        }}
      </For>
    </ts.SourceFile>
  );
}
```

#### Step 2.3: Update Serializers

```tsx
// packages/http-client-js/src/components/serializers.tsx
import { JsonTransform, ScalarTransform } from "@typespec/http-client-js-components/serialization";

// Use shared components instead of local implementations
```

#### Step 2.4: Update HTTP Request Building

```tsx
// packages/http-client-js/src/components/client-operation.tsx
import { HttpRequestBuilder } from "@typespec/http-client-js-components/requests";

export function ClientOperation(props: ClientOperationProps) {
  return (
    <ts.FunctionDeclaration async export name={operationName}>
      <HttpRequestBuilder
        operation={props.httpOperation}
        contextRef={contextRef}
        includeAuth={true}
        includeRetry={true}
      />
    </ts.FunctionDeclaration>
  );
}
```

### Phase 3: Migrate flight-instructor (Week 3-4)

#### Step 3.1: Update Dependencies

```json
// flight-instructor/package.json
{
  "dependencies": {
    "@typespec/http-client-js-components": "^0.1.0",
    // ... keep CLI-specific deps
  }
}
```

#### Step 3.2: Simplify TypeScript Renderer

**Before:** flight-instructor has full implementations in `src/typescript/components/`

**After:** Use shared components:

```tsx
// flight-instructor/src/typescript/typescript-renderer.tsx
import { renderAsync } from "@alloy-js/core";
import { createTSNamePolicy } from "@alloy-js/typescript";
import { Output } from "@typespec/emitter-framework";
import {
  ModelDeclaration,
  JsonTransform,
  HttpRequestBuilder,
  createComponentConfig
} from "@typespec/http-client-js-components";
import { ComponentConfigContext } from "@typespec/http-client-js-components/contexts";

export class TypescriptRenderer extends Renderer {
  async renderRestClientOperation(options: RenderOperationOptions) {
    const config = createComponentConfig({
      encoding: {
        dates: this.codegenOptions.dateObjects === "date" ? "date" : "iso-string",
        bytes: "base64"
      },
      naming: {
        normalize: this.codegenOptions.normalizeCase,
        casing: "camel"
      }
    });

    const directory = await renderAsync(
      <Output program={this.serviceInfo.program} namePolicy={createTSNamePolicy()}>
        <ComponentConfigContext.Provider value={config}>
          <RestClientSnippets
            operations={options.operations}
            config={config}
          />
        </ComponentConfigContext.Provider>
      </Output>
    );
    
    return { directory, files: ["**/*"] };
  }
}
```

#### Step 3.3: Create Snippet-Specific Wrappers

flight-instructor needs to generate isolated snippets, not full packages:

```tsx
// flight-instructor/src/typescript/components/snippets/rest-client-snippets.tsx
import { SourceFile } from "@alloy-js/typescript";
import { HttpRequestBuilder } from "@typespec/http-client-js-components/requests";
import { ModelDeclaration } from "@typespec/http-client-js-components/models";
import { JsonTransform } from "@typespec/http-client-js-components/serialization";

export function RestClientSnippets(props: RestClientSnippetsProps) {
  return (
    <>
      <SourceFile path="models.ts">
        {/* Generate only types needed for these operations */}
        <For each={props.operations}>
          {(op) => <OperationModels operation={op} />}
        </For>
      </SourceFile>
      
      <SourceFile path="serialization.ts">
        <For each={props.operations}>
          {(op) => <OperationSerializers operation={op} />}
        </For>
      </SourceFile>
      
      <SourceFile path="rest-code.ts">
        <InstructionsBlock title="Usage Instructions">
          This code requires the helpers listed in notes.txt
        </InstructionsBlock>
        <For each={props.operations}>
          {(op) => (
            <HttpRequestBuilder
              operation={op}
              includeAuth={props.config.features?.auth}
              includeRetry={props.config.features?.retry}
            />
          )}
        </For>
      </SourceFile>
    </>
  );
}
```

#### Step 3.4: Keep CLI Logic Unchanged

The CLI commands (`add`, `list-services`, `generate-info`, etc.) remain unchanged. Only the rendering layer uses shared components.

### Phase 4: Testing & Validation (Week 4-5)

#### Step 4.1: Unit Tests for Shared Components

```typescript
// packages/http-client-js-components/test/models/model-declaration.test.ts
describe("ModelDeclaration", () => {
  it("should generate interface for simple model", async () => {
    // Test model generation
  });
  
  it("should handle nested models", async () => {
    // Test nested structures
  });
});
```

#### Step 4.2: Integration Tests for http-client-js

```bash
cd packages/http-client-js
pnpm test
pnpm test:e2e
```

Verify all existing tests pass with refactored code.

#### Step 4.3: Integration Tests for flight-instructor

```bash
cd flight-instructor
pnpm test
pnpm generate-samples
```

Verify generated snippets match expected output.

#### Step 4.4: E2E Validation

Generate code with both approaches and compare:
- Same TypeSpec input
- Same codegen options
- Compare generated output character-by-character

### Phase 5: Documentation & Cleanup (Week 5)

#### Step 5.1: Document Shared Components

Create comprehensive documentation:
- Component API reference
- Configuration options guide
- Migration guide for other emitters
- Examples for common scenarios

#### Step 5.2: Update README Files

- `http-client-js-components/README.md` - Usage guide
- `http-client-js/README.md` - Update with new architecture
- `flight-instructor/README.md` - Note shared component usage

#### Step 5.3: Remove Duplicated Code

Delete old implementations once migration is complete:
- `flight-instructor/src/typescript/components/model/` (replaced)
- `flight-instructor/src/typescript/components/serialization/` (replaced)
- Etc.

## Benefits of This Approach

### 1. **Single Source of Truth**
- One implementation for model generation, serialization, HTTP requests
- Bug fixes apply to both projects automatically
- Consistent behavior across emitters

### 2. **Focused Development**
- `http-client-js` focuses on full client library packaging
- `flight-instructor` focuses on CLI, AI prompts, incremental generation
- Shared library focuses on core code generation primitives

### 3. **Reusability**
- Other language emitters can use the same components library
- Community emitters can leverage battle-tested components
- Faster development of new emitters

### 4. **Maintainability**
- Changes in one place
- Easier testing of core functionality
- Clear separation of concerns

### 5. **Extensibility**
- Component-based architecture allows easy customization
- Context system enables configuration without breaking changes
- Plugin architecture for custom transforms

## Migration Checklist

### Pre-Migration
- [ ] Review and understand current architectures
- [ ] Identify all duplicated code paths
- [ ] Set up shared package structure
- [ ] Define API contracts for shared components

### Phase 1: Shared Package
- [ ] Create `@typespec/http-client-js-components` package
- [ ] Extract and refactor model generation components
- [ ] Extract and refactor serialization components
- [ ] Extract and refactor HTTP request components
- [ ] Extract and refactor helper generators
- [ ] Create configuration system
- [ ] Write unit tests for shared components
- [ ] Document shared component APIs

### Phase 2: http-client-js Migration
- [ ] Add dependency on shared package
- [ ] Migrate model generation to use shared components
- [ ] Migrate serialization to use shared components
- [ ] Migrate HTTP request building to use shared components
- [ ] Migrate helper generation to use shared components
- [ ] Run existing test suite
- [ ] Fix any regressions
- [ ] Update documentation

### Phase 3: flight-instructor Migration
- [ ] Add dependency on shared package
- [ ] Simplify TypeScript renderer
- [ ] Create snippet-specific wrappers
- [ ] Migrate to shared components
- [ ] Test CLI commands
- [ ] Verify generated output
- [ ] Update documentation

### Phase 4: Testing
- [ ] Comprehensive unit tests for shared package
- [ ] Integration tests for http-client-js
- [ ] Integration tests for flight-instructor
- [ ] E2E validation comparing outputs
- [ ] Performance testing
- [ ] Edge case validation

### Phase 5: Finalization
- [ ] Remove duplicated code
- [ ] Update all documentation
- [ ] Write migration guide
- [ ] Prepare release notes
- [ ] Code review and approval
- [ ] Merge to main branch

## Risk Mitigation

### Risk: Breaking Changes
**Mitigation:** 
- Use feature flags for gradual rollout
- Maintain backward compatibility during transition
- Extensive testing before removing old code

### Risk: Performance Regression
**Mitigation:**
- Benchmark before/after
- Profile code generation performance
- Optimize hot paths in shared components

### Risk: API Design Issues
**Mitigation:**
- Start with well-understood components (models)
- Iterate on API design with team feedback
- Use TypeScript for type safety
- Document decisions and rationale

## Success Metrics

- **Code Reuse:** >80% of code generation logic shared between projects
- **Test Coverage:** >90% coverage for shared components
- **Performance:** No more than 5% regression in generation time
- **Bug Reduction:** 50% reduction in duplicate bug reports
- **Developer Velocity:** 30% faster feature development for common scenarios

## Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 1: Shared Package | 2 weeks | Working `@typespec/http-client-js-components` package |
| Phase 2: http-client-js | 1 week | http-client-js using shared components |
| Phase 3: flight-instructor | 1 week | flight-instructor using shared components |
| Phase 4: Testing | 1 week | All tests passing, validated outputs |
| Phase 5: Finalization | 1 week | Documentation, cleanup, release |
| **Total** | **6 weeks** | Fully deduplicated, tested, documented system |

## Next Steps

1. **Review this plan** with the team
2. **Approve architecture** and API design approach
3. **Create tracking issues** for each phase
4. **Assign owners** for each component area
5. **Set up shared package** infrastructure
6. **Begin Phase 1** implementation

---

**Questions or Concerns?**
Please review this plan and provide feedback on:
- Architecture decisions
- API design choices
- Timeline estimates
- Risk assessment
- Any missing considerations
