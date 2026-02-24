# Refactoring Examples: Before & After Code Comparisons

This document shows concrete examples of how code will change during the refactoring from duplicated implementations to shared components.

## Example 1: Model Generation

### Current State (Duplicated)

#### http-client-js Implementation
```tsx
// packages/http-client-js/src/components/models.tsx
import { For, refkey } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import { useTsp } from "@typespec/emitter-framework";
import * as ef from "@typespec/emitter-framework/typescript";
import { useClientLibrary } from "@typespec/http-client";

export interface ModelsProps {
  path?: string;
}

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

#### flight-instructor Implementation
```tsx
// flight-instructor/src/typescript/components/model/model-declaration.tsx
import { refkey } from "@alloy-js/core";
import { InterfaceDeclaration, TypeAliasDeclaration } from "@alloy-js/typescript";
import { Model, Union } from "@typespec/compiler";
import { useTsp } from "@typespec/emitter-framework";

export function ModelDeclaration(props: { type: Model | Union }) {
  const { $ } = useTsp();
  const namePolicy = useTSNamePolicy();
  
  if ($.model.is(props.type)) {
    return (
      <InterfaceDeclaration
        export
        name={namePolicy.getName(props.type.name, "interface")}
        refkey={refkey(props.type)}
      >
        {/* Property declarations... */}
      </InterfaceDeclaration>
    );
  }
  
  if ($.union.is(props.type)) {
    return (
      <TypeAliasDeclaration
        export
        name={namePolicy.getName(props.type.name, "type")}
        refkey={refkey(props.type)}
      >
        {/* Union members... */}
      </TypeAliasDeclaration>
    );
  }
}
```

**Problem:** Two different implementations of the same concept!

---

### After Refactoring (Shared)

#### Shared Component Library
```tsx
// packages/http-client-js-components/src/models/model-declaration.tsx
import { refkey, Refkey } from "@alloy-js/core";
import { InterfaceDeclaration, TypeAliasDeclaration } from "@alloy-js/typescript";
import { Type, Model, Union } from "@typespec/compiler";
import { useTsp } from "@typespec/emitter-framework";
import { useComponentConfig } from "../contexts/config-context.jsx";

export interface ModelDeclarationProps {
  type: Type;
  export?: boolean;
  refkey?: Refkey;
  includeDocumentation?: boolean;
}

/**
 * Generates a TypeScript interface or type alias for a TypeSpec model or union.
 * 
 * @example
 * <ModelDeclaration type={userModel} export />
 * // Generates: export interface User { ... }
 */
export function ModelDeclaration(props: ModelDeclarationProps) {
  const { $ } = useTsp();
  const config = useComponentConfig();
  const namePolicy = useTSNamePolicy();
  
  // Unpack http parts if needed
  const type = $.httpPart.unpack(props.type) ?? props.type;
  
  // Skip arrays and records (they're inline types)
  if ($.array.is(type) || $.record.is(type)) {
    return null;
  }
  
  if ($.model.is(type)) {
    const name = namePolicy.getName(
      type.name,
      "interface",
      config.naming?.normalize
    );
    
    return (
      <InterfaceDeclaration
        export={props.export}
        name={name}
        refkey={props.refkey ?? refkey(type)}
      >
        <ModelProperties type={type} />
      </InterfaceDeclaration>
    );
  }
  
  if ($.union.is(type)) {
    const name = namePolicy.getName(
      type.name,
      "type",
      config.naming?.normalize
    );
    
    return (
      <TypeAliasDeclaration
        export={props.export}
        name={name}
        refkey={props.refkey ?? refkey(type)}
      >
        <UnionMembers type={type} />
      </TypeAliasDeclaration>
    );
  }
  
  return null;
}
```

#### http-client-js Usage (Simplified)
```tsx
// packages/http-client-js/src/components/models.tsx
import { For } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import { useClientLibrary } from "@typespec/http-client";
import { ModelDeclaration } from "@typespec/http-client-js-components/models";

export function Models(props: { path?: string }) {
  const clientLibrary = useClientLibrary();
  
  return (
    <ts.SourceFile path={props.path ?? "models.ts"}>
      <For each={clientLibrary.dataTypes} hardline>
        {(type) => <ModelDeclaration type={type} export />}
      </For>
    </ts.SourceFile>
  );
}
```

#### flight-instructor Usage (Simplified)
```tsx
// flight-instructor/src/typescript/components/models-source-file.tsx
import { SourceFile } from "@alloy-js/typescript";
import { ModelDeclaration } from "@typespec/http-client-js-components/models";
import { useDeclarationProvider } from "../contexts/declaration-provider.jsx";

export function ModelsSourceFile() {
  const declarations = useDeclarationProvider();
  const modelsToGenerate = declarations.getRequiredModels();
  
  return (
    <SourceFile path="models.ts">
      {modelsToGenerate.map(type => (
        <ModelDeclaration type={type} export />
      ))}
    </SourceFile>
  );
}
```

**Benefits:**
- ✅ Single implementation
- ✅ Consistent behavior
- ✅ Easier testing
- ✅ Better documentation

---

## Example 2: Serialization

### Current State (Duplicated)

#### http-client-js Implementation
```tsx
// packages/http-client-js/src/components/transforms/json/json-transform.tsx
export function JsonTransform(props: JsonTransformProps) {
  const { $ } = useTsp();
  const type = $.httpPart.unpack(props.type) ?? props.type;
  
  switch (type.kind) {
    case "Model": {
      if ($.array.is(type)) {
        return <JsonArrayTransform type={type} itemRef={props.itemRef} target={props.target} />;
      }
      if ($.record.is(type)) {
        return <JsonRecordTransform type={type} itemRef={props.itemRef} target={props.target} />;
      }
      return <JsonModelTransform type={type} itemRef={props.itemRef} target={props.target} />;
    }
    case "Union":
      return <JsonUnionTransform type={type} itemRef={props.itemRef} target={props.target} />;
    case "Scalar":
      return <ScalarDataTransform type={type} itemRef={props.itemRef} target={props.target} />;
    default:
      return props.itemRef;
  }
}
```

#### flight-instructor Implementation
```tsx
// flight-instructor/src/typescript/components/serialization/serialization-expression.tsx
export function SerializationExpression(props: SerializationExpressionProps) {
  const { canonicalization, valueRef, direction } = props;
  
  if (canonicalization.subgraphMatchesPredicate(noSerialize)) {
    return <MemberExpression children={valueRef} />;
  }
  
  switch (canonicalization.kind) {
    case "Model":
      return <ModelSerializationExpression {...props} />;
    case "Scalar":
      return <ScalarSerializationExpression {...props} />;
    case "Union":
      return <UnionSerializationExpression {...props} />;
    default:
      throw new Error(`Cannot serialize ${canonicalization.kind}`);
  }
}
```

**Problem:** Different abstractions, different APIs!

---

### After Refactoring (Shared)

#### Shared Component Library
```tsx
// packages/http-client-js-components/src/serialization/json-transform.tsx
import { code, Refkey } from "@alloy-js/core";
import { Type } from "@typespec/compiler";
import { useTsp } from "@typespec/emitter-framework";
import { useComponentConfig } from "../contexts/config-context.jsx";

export interface JsonTransformProps {
  type: Type;
  valueRef: Refkey | Children;
  direction: "serialize" | "deserialize";
}

/**
 * Generates code to transform a value between application and wire formats.
 * 
 * Handles:
 * - Date encoding (ISO string, RFC7231, Unix timestamp)
 * - Bytes encoding (base64, uint8array)
 * - Nested models (recursive transformation)
 * - Arrays and records
 * - Union type discrimination
 * 
 * @example
 * <JsonTransform 
 *   type={userModel} 
 *   valueRef="inputData" 
 *   direction="serialize" 
 * />
 * // Generates: { name: inputData.name, createdAt: inputData.createdAt.toISOString() }
 */
export function JsonTransform(props: JsonTransformProps) {
  const { $ } = useTsp();
  const config = useComponentConfig();
  
  // Unpack HTTP parts
  const type = $.httpPart.unpack(props.type) ?? props.type;
  
  // Check if transformation is needed
  if (!needsTransform(type, config)) {
    return props.valueRef;
  }
  
  // Get or reference transform function
  const transformRef = getTransformFunctionRef(type, props.direction);
  if (transformRef) {
    return code`${transformRef}(${props.valueRef})`;
  }
  
  // Inline transformation
  switch (type.kind) {
    case "Model":
      if ($.array.is(type)) {
        return <ArrayTransform {...props} type={type} />;
      }
      if ($.record.is(type)) {
        return <RecordTransform {...props} type={type} />;
      }
      return <ModelTransform {...props} type={type} />;
      
    case "Union":
      return <UnionTransform {...props} type={type} />;
      
    case "Scalar":
      return <ScalarTransform {...props} type={type} />;
      
    default:
      return props.valueRef;
  }
}

// Generate transform function declaration
export function JsonTransformDeclaration(props: {
  type: Type;
  direction: "serialize" | "deserialize";
}) {
  const { $ } = useTsp();
  
  if (!$.model.is(props.type) && !$.union.is(props.type)) {
    return null;
  }
  
  return (
    <ts.FunctionDeclaration
      name={getTransformFunctionName(props.type, props.direction)}
      refkey={getTransformFunctionRef(props.type, props.direction)}
    >
      {/* Function implementation */}
    </ts.FunctionDeclaration>
  );
}
```

#### Usage in Both Projects
```tsx
// Both http-client-js and flight-instructor
import { JsonTransform, JsonTransformDeclaration } from "@typespec/http-client-js-components/serialization";

// In operation handler
function serializeRequestBody(bodyType: Type) {
  return (
    <JsonTransform
      type={bodyType}
      valueRef="requestBody"
      direction="serialize"
    />
  );
}

// Generate transform functions
function generateTransforms(types: Type[]) {
  return types.map(type => (
    <>
      <JsonTransformDeclaration type={type} direction="serialize" />
      <JsonTransformDeclaration type={type} direction="deserialize" />
    </>
  ));
}
```

---

## Example 3: HTTP Request Building

### Current State (Duplicated)

#### http-client-js Implementation
```tsx
// packages/http-client-js/src/components/http-request.tsx
export function HttpRequest(props: HttpRequestProps) {
  const urlVarRefkey = refkey();
  const requestOptionsVarRefkey = refkey();
  
  return (
    <>
      <HttpRequest.Url
        httpOperation={props.httpOperation}
        urlVarRefkey={urlVarRefkey}
      />
      <HttpRequestOptions
        httpOperation={props.httpOperation}
        requestOptionsVarRefkey={requestOptionsVarRefkey}
      />
      <ts.VarDeclaration name="response">
        await fetch({urlVarRefkey}, {requestOptionsVarRefkey})
      </ts.VarDeclaration>
      <HttpResponse httpOperation={props.httpOperation} />
    </>
  );
}
```

#### flight-instructor Implementation
```tsx
// flight-instructor/src/typescript/components/typespec-http-request/fetch-call.tsx
export function FetchCall(props: FetchCallProps) {
  const { operation, endpoint } = props;
  const urlConstant = refkey();
  const optionsConstant = refkey();
  
  return (
    <>
      <RequestPath operation={operation} endpoint={endpoint} refkey={urlConstant} />
      <RequestHeaders operation={operation} refkey={optionsConstant} />
      <RequestBody operation={operation} optionsRef={optionsConstant} />
      <VarDeclaration name="response">
        await fetch({urlConstant}, {optionsConstant})
      </VarDeclaration>
      <SerializeResponses operation={operation} />
    </>
  );
}
```

**Problem:** Similar structure but different organization!

---

### After Refactoring (Shared)

#### Shared Component Library
```tsx
// packages/http-client-js-components/src/requests/http-request-builder.tsx
import { refkey, Refkey } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import { HttpOperation } from "@typespec/http";
import { useComponentConfig } from "../contexts/config-context.jsx";

export interface HttpRequestBuilderProps {
  operation: HttpOperation;
  contextRef?: Refkey;
  includeAuth?: boolean;
  includeRetry?: boolean;
  onSuccess?: Children;
  onError?: Children;
}

/**
 * Generates complete HTTP request code including:
 * - URL construction with path/query parameters
 * - Headers (including auth headers)
 * - Request body serialization
 * - Fetch call
 * - Response handling (deserialize, error handling)
 * - Optional retry logic
 * 
 * @example
 * <HttpRequestBuilder
 *   operation={getUserOperation}
 *   contextRef={clientContextRef}
 *   includeAuth={true}
 *   includeRetry={true}
 * />
 */
export function HttpRequestBuilder(props: HttpRequestBuilderProps) {
  const config = useComponentConfig();
  const urlRef = refkey();
  const optionsRef = refkey();
  const responseRef = refkey();
  
  return (
    <>
      {/* Build URL */}
      <RequestUrl
        operation={props.operation}
        contextRef={props.contextRef}
        refkey={urlRef}
      />
      
      {/* Build request options */}
      <RequestOptions
        operation={props.operation}
        contextRef={props.contextRef}
        includeAuth={props.includeAuth}
        refkey={optionsRef}
      />
      
      {/* Optional retry wrapper */}
      {props.includeRetry && config.features?.retry ? (
        <RetryWrapper maxAttempts={3}>
          <FetchCall urlRef={urlRef} optionsRef={optionsRef} responseRef={responseRef} />
        </RetryWrapper>
      ) : (
        <FetchCall urlRef={urlRef} optionsRef={optionsRef} responseRef={responseRef} />
      )}
      
      {/* Handle response */}
      <ResponseHandler
        operation={props.operation}
        responseRef={responseRef}
        onSuccess={props.onSuccess}
        onError={props.onError}
      />
    </>
  );
}
```

#### Usage Examples

**In http-client-js (Full client generation):**
```tsx
// packages/http-client-js/src/components/client-operation.tsx
import { HttpRequestBuilder } from "@typespec/http-client-js-components/requests";

export function ClientOperation(props: ClientOperationProps) {
  const contextRef = getClientContextRef(props.client);
  
  return (
    <ts.FunctionDeclaration
      async
      export
      name={getOperationName(props.httpOperation)}
    >
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

**In flight-instructor (Snippet generation):**
```tsx
// flight-instructor/src/typescript/components/rest-code-source-file.tsx
import { HttpRequestBuilder } from "@typespec/http-client-js-components/requests";

export function RestCodeSourceFile(props: RestCodeSourceFileProps) {
  return (
    <SourceFile path="rest-code.ts">
      <InstructionsBlock>
        {/* AI-generated instructions */}
        This code requires authentication. Set up credentials first.
      </InstructionsBlock>
      
      <For each={props.operations}>
        {(op) => (
          <HttpRequestBuilder
            operation={op}
            includeAuth={props.authSchemes !== undefined}
            includeRetry={props.codegenOptions.enableRetry}
          />
        )}
      </For>
    </SourceFile>
  );
}
```

---

## Example 4: Configuration System

### Unified Configuration

```typescript
// packages/http-client-js-components/src/config.ts

/**
 * Configuration for shared code generation components.
 * This is the normalized config format that all components expect.
 */
export interface ComponentConfig {
  encoding?: EncodingConfig;
  naming?: NamingConfig;
  features?: FeatureConfig;
}

export interface EncodingConfig {
  /** How to encode Date objects */
  dates?: "date" | "iso-string" | "temporal" | "unix-timestamp" | "rfc7231";
  /** How to encode byte arrays */
  bytes?: "base64" | "uint8array" | "none";
  /** How to handle int64/decimal */
  largeNumbers?: "number" | "string" | "bigint";
}

export interface NamingConfig {
  /** Normalize names to camelCase/PascalCase */
  normalize?: boolean;
  /** Casing convention */
  casing?: "camel" | "pascal" | "snake" | "original";
}

export interface FeatureConfig {
  /** Enable request/response validation */
  validation?: boolean;
  /** Enable automatic retry logic */
  retry?: boolean;
  /** Include authentication headers */
  auth?: boolean;
  /** Support pagination */
  paging?: boolean;
}
```

### Adapters for Each Project

**http-client-js adapter:**
```typescript
// packages/http-client-js/src/config-adapter.ts
import { ComponentConfig } from "@typespec/http-client-js-components";
import { JsClientEmitterOptions } from "./lib.js";

export function createConfigFromEmitterOptions(
  options: JsClientEmitterOptions
): ComponentConfig {
  return {
    encoding: {
      dates: "iso-string",
      bytes: "base64",
      largeNumbers: "number"
    },
    naming: {
      normalize: true,
      casing: "camel"
    },
    features: {
      validation: false,
      retry: true,
      auth: true,
      paging: true
    }
  };
}
```

**flight-instructor adapter:**
```typescript
// flight-instructor/src/typescript/config-adapter.ts
import { ComponentConfig } from "@typespec/http-client-js-components";
import { CodegenOptions } from "../codegen-options.js";

export function createConfigFromCodegenOptions(
  options: CodegenOptions
): ComponentConfig {
  return {
    encoding: {
      dates: options.dateObjects === "date" ? "date" : 
             options.dateObjects === "temporal" ? "temporal" : 
             "iso-string",
      bytes: "base64",
      largeNumbers: options.int64DecimalHandling === "string" ? "string" : "number"
    },
    naming: {
      normalize: options.normalizeCase ?? false,
      casing: options.normalizeCase ? "camel" : "original"
    },
    features: {
      validation: options.enableValidation ?? false,
      retry: false, // User adds manually
      auth: false,  // User provides auth separately
      paging: false // Not needed for snippets
    }
  };
}
```

---

## Example 5: Testing Improvements

### Before: Duplicated Tests

```typescript
// http-client-js/test/models.test.ts
describe("Model generation", () => {
  it("generates interface for simple model", async () => {
    // Test implementation
  });
});

// flight-instructor/test/model-declaration.test.ts
describe("Model declaration", () => {
  it("generates interface for simple model", async () => {
    // Duplicate test implementation!
  });
});
```

### After: Shared Tests

```typescript
// packages/http-client-js-components/test/models/model-declaration.test.ts
describe("ModelDeclaration", () => {
  it("generates interface for simple model", async () => {
    const output = await testRender(
      <ModelDeclaration type={testModel} export />
    );
    
    expect(output).toContain("export interface TestModel");
    expect(output).toContain("name: string");
  });
  
  it("respects naming configuration", async () => {
    const outputCamel = await testRender(
      <ComponentConfigContext.Provider value={{ naming: { casing: "camel" } }}>
        <ModelDeclaration type={testModel} export />
      </ComponentConfigContext.Provider>
    );
    
    expect(outputCamel).toContain("firstName"); // camelCase
    
    const outputSnake = await testRender(
      <ComponentConfigContext.Provider value={{ naming: { casing: "snake" } }}>
        <ModelDeclaration type={testModel} export />
      </ComponentConfigContext.Provider>
    );
    
    expect(outputSnake).toContain("first_name"); // snake_case
  });
});
```

**Integration tests in consuming projects:**
```typescript
// packages/http-client-js/test/integration/full-client.test.ts
describe("Full client generation", () => {
  it("generates complete client package using shared components", async () => {
    // Test the composition layer
  });
});

// flight-instructor/test/integration/snippets.test.ts
describe("Snippet generation", () => {
  it("generates operation snippets using shared components", async () => {
    // Test the snippet composition layer
  });
});
```

---

## Summary of Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **Code Duplication** | ~60% duplicated across projects | ~5% duplication (only composition layer) |
| **Test Coverage** | Tests duplicated, inconsistent | Single comprehensive test suite |
| **Bug Fixes** | Must fix in 2+ places | Fix once, applies everywhere |
| **New Features** | Implement multiple times | Implement once, available to all |
| **Consistency** | Divergent implementations | Guaranteed consistent behavior |
| **Maintenance** | High burden | Significantly reduced |
| **Extensibility** | Hard to add new consumers | Easy to create new emitters |
| **Documentation** | Scattered, incomplete | Centralized, comprehensive |

## Migration Path

1. **Week 1-2:** Extract and refactor shared components
2. **Week 2-3:** Migrate http-client-js to use shared components
3. **Week 3-4:** Migrate flight-instructor to use shared components
4. **Week 4-5:** Comprehensive testing and validation
5. **Week 5:** Documentation, cleanup, and release

## Next Steps

1. Review these examples with the team
2. Validate the API design of shared components
3. Approve the migration strategy
4. Begin implementation of Phase 1
