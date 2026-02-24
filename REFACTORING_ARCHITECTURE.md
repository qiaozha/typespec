# Architecture Diagrams: http-client-js & flight-instructor Refactoring

## Current Architecture (Before Refactoring)

```mermaid
graph TB
    subgraph "TypeSpec Compiler"
        TSP[TypeSpec Program]
    end
    
    subgraph "http-client-js Emitter"
        HCJS_E[emitter.tsx<br/>$onEmit hook]
        HCJS_M[models.tsx<br/>duplicated logic]
        HCJS_S[serializers.tsx<br/>duplicated logic]
        HCJS_R[http-request.tsx<br/>duplicated logic]
        HCJS_H[helpers<br/>duplicated logic]
        HCJS_O[Full Client Package]
    end
    
    subgraph "flight-instructor CLI"
        FI_CLI[CLI Commands<br/>add/list/generate]
        FI_R[typescript-renderer.tsx]
        FI_M[model-declaration.tsx<br/>duplicated logic]
        FI_S[serialization-expression.tsx<br/>duplicated logic]
        FI_REQ[fetch-call.tsx<br/>duplicated logic]
        FI_H[helpers<br/>duplicated logic]
        FI_O[Code Snippets]
    end
    
    TSP -->|emitter| HCJS_E
    HCJS_E --> HCJS_M
    HCJS_E --> HCJS_S
    HCJS_E --> HCJS_R
    HCJS_E --> HCJS_H
    HCJS_M --> HCJS_O
    HCJS_S --> HCJS_O
    HCJS_R --> HCJS_O
    HCJS_H --> HCJS_O
    
    FI_CLI --> FI_R
    FI_R --> FI_M
    FI_R --> FI_S
    FI_R --> FI_REQ
    FI_R --> FI_H
    FI_M --> FI_O
    FI_S --> FI_O
    FI_REQ --> FI_O
    FI_H --> FI_O
    
    style HCJS_M fill:#f99,stroke:#333
    style HCJS_S fill:#f99,stroke:#333
    style HCJS_R fill:#f99,stroke:#333
    style HCJS_H fill:#f99,stroke:#333
    style FI_M fill:#f99,stroke:#333
    style FI_S fill:#f99,stroke:#333
    style FI_REQ fill:#f99,stroke:#333
    style FI_H fill:#f99,stroke:#333
```

**Problems:**
- 🔴 Red components = Duplicated code
- Two separate implementations of the same logic
- Bug fixes need to be applied twice
- Inconsistent behavior between emitter and CLI
- Hard to maintain and test

---

## Proposed Architecture (After Refactoring)

```mermaid
graph TB
    subgraph "TypeSpec Compiler"
        TSP[TypeSpec Program]
    end
    
    subgraph "Shared Components Library"
        SHARED[@typespec/http-client-js-components]
        
        subgraph "Models"
            SM[ModelDeclaration<br/>ModelReference]
        end
        
        subgraph "Serialization"
            SS[JsonTransform<br/>ScalarTransform<br/>ModelSerialization]
        end
        
        subgraph "Requests"
            SR[HttpRequestBuilder<br/>RequestUrl/Headers/Body]
        end
        
        subgraph "Helpers"
            SH[RestError<br/>RetryLogic<br/>MultipartHelper]
        end
        
        subgraph "Contexts"
            SC[EncodingContext<br/>CodecContext<br/>TransformPolicy]
        end
    end
    
    subgraph "http-client-js Emitter"
        HCJS_E[emitter.tsx<br/>$onEmit hook]
        HCJS_C[client.tsx<br/>package composition]
        HCJS_O[Full Client Package]
    end
    
    subgraph "flight-instructor CLI"
        FI_CLI[CLI Commands<br/>AI prompts/auth/etc]
        FI_R[typescript-renderer.tsx<br/>snippet composition]
        FI_O[Code Snippets]
    end
    
    TSP -->|emitter| HCJS_E
    TSP -->|CLI loads| FI_CLI
    
    SHARED --> SM
    SHARED --> SS
    SHARED --> SR
    SHARED --> SH
    SHARED --> SC
    
    SM --> HCJS_E
    SS --> HCJS_E
    SR --> HCJS_E
    SH --> HCJS_E
    SC --> HCJS_E
    
    SM --> FI_R
    SS --> FI_R
    SR --> FI_R
    SH --> FI_R
    SC --> FI_R
    
    HCJS_E --> HCJS_C
    HCJS_C --> HCJS_O
    
    FI_CLI --> FI_R
    FI_R --> FI_O
    
    style SHARED fill:#9f9,stroke:#333
    style SM fill:#9f9,stroke:#333
    style SS fill:#9f9,stroke:#333
    style SR fill:#9f9,stroke:#333
    style SH fill:#9f9,stroke:#333
    style SC fill:#9f9,stroke:#333
```

**Benefits:**
- 🟢 Green components = Shared, reusable code
- Single source of truth for code generation logic
- Bug fixes automatically apply to both projects
- Consistent behavior guaranteed
- Easier to test and maintain
- Other projects can reuse components

---

## Component Usage Flow

```mermaid
sequenceDiagram
    participant User
    participant CLI as flight-instructor CLI
    participant HCJS as http-client-js Emitter
    participant Shared as @typespec/http-client-js-components
    participant Alloy as Alloy.js
    participant Output as Generated Code
    
    Note over User,Output: On-Demand Snippet Generation (flight-instructor)
    
    User->>CLI: rest-client call getUser
    CLI->>CLI: Load TypeSpec program
    CLI->>Shared: Create component tree<br/>with config
    Shared->>Alloy: Render JSX components
    Alloy->>Output: rest-code.ts<br/>models.ts<br/>serialization.ts
    
    Note over User,Output: Full Package Generation (http-client-js)
    
    User->>HCJS: tsp compile --emit
    HCJS->>HCJS: $onEmit() entry point
    HCJS->>Shared: Use components for<br/>models, operations, etc.
    Shared->>Alloy: Render complete<br/>package structure
    Alloy->>Output: Full npm package<br/>with all files
```

---

## Component Dependency Graph

```mermaid
graph LR
    subgraph "Core Components"
        Models[Model Components]
        Serial[Serialization Components]
        Requests[Request Components]
        Helpers[Helper Components]
    end
    
    subgraph "Supporting"
        Contexts[Context Providers]
        Utils[Utilities]
        Config[Configuration]
    end
    
    subgraph "Consumers"
        HCJS[http-client-js]
        FI[flight-instructor]
        Future[Future Emitters]
    end
    
    Contexts --> Models
    Contexts --> Serial
    Contexts --> Requests
    Utils --> Models
    Utils --> Serial
    Utils --> Requests
    Config --> Contexts
    
    Models --> HCJS
    Serial --> HCJS
    Requests --> HCJS
    Helpers --> HCJS
    Contexts --> HCJS
    
    Models --> FI
    Serial --> FI
    Requests --> FI
    Helpers --> FI
    Contexts --> FI
    
    Models --> Future
    Serial --> Future
    Requests --> Future
    Helpers --> Future
    Contexts --> Future
    
    style Models fill:#b8e6f7,stroke:#333
    style Serial fill:#b8e6f7,stroke:#333
    style Requests fill:#b8e6f7,stroke:#333
    style Helpers fill:#b8e6f7,stroke:#333
    style Contexts fill:#ffd6a5,stroke:#333
    style Utils fill:#ffd6a5,stroke:#333
    style Config fill:#ffd6a5,stroke:#333
```

---

## Code Generation Pipeline

```mermaid
flowchart TD
    Start[TypeSpec Definition]
    
    Start --> Parse[Parse & Analyze]
    Parse --> Meta[Extract Metadata<br/>Models, Operations, etc.]
    
    Meta --> Decision{Consumer Type?}
    
    Decision -->|Full Emitter| Package[Package Composer<br/>http-client-js]
    Decision -->|CLI Tool| Snippet[Snippet Composer<br/>flight-instructor]
    
    Package --> Config1[Create Config<br/>Full client settings]
    Snippet --> Config2[Create Config<br/>User preferences from CLI]
    
    Config1 --> Shared[Shared Components Library]
    Config2 --> Shared
    
    Shared --> ModelComp[Model Generator]
    Shared --> SerialComp[Serializer Generator]
    Shared --> ReqComp[Request Generator]
    Shared --> HelperComp[Helper Generator]
    
    ModelComp --> Alloy[Alloy.js Renderer]
    SerialComp --> Alloy
    ReqComp --> Alloy
    HelperComp --> Alloy
    
    Alloy --> Output[Generated TypeScript Code]
    
    Output -->|Full Package| FullOut[client.ts<br/>models/index.ts<br/>api/operations.ts<br/>helpers/*.ts<br/>package.json]
    
    Output -->|Snippets| SnippetOut[models.ts<br/>serialization.ts<br/>rest-code.ts<br/>notes.txt]
    
    style Shared fill:#9f9,stroke:#333,stroke-width:3px
    style ModelComp fill:#9f9,stroke:#333
    style SerialComp fill:#9f9,stroke:#333
    style ReqComp fill:#9f9,stroke:#333
    style HelperComp fill:#9f9,stroke:#333
```

---

## Configuration System

```mermaid
classDiagram
    class ComponentConfig {
        +EncodingConfig encoding
        +NamingConfig naming
        +FeatureConfig features
    }
    
    class EncodingConfig {
        +dates: "date" | "iso-string" | "temporal"
        +bytes: "base64" | "uint8array" | "none"
        +numbers: "number" | "string" | "bigint"
    }
    
    class NamingConfig {
        +normalize: boolean
        +casing: "camel" | "pascal" | "snake"
        +preserveAcronyms: boolean
    }
    
    class FeatureConfig {
        +validation: boolean
        +retry: boolean
        +auth: boolean
        +paging: boolean
    }
    
    class HttpClientJsConfig {
        +packageName: string
        +version: string
        +includeTests: boolean
        +uses ComponentConfig
    }
    
    class FlightInstructorConfig {
        +language: "typescript" | "csharp"
        +dateObjects: "date" | "temporal" | "none"
        +int64Handling: "string" | "number"
        +uses ComponentConfig
    }
    
    ComponentConfig --> EncodingConfig
    ComponentConfig --> NamingConfig
    ComponentConfig --> FeatureConfig
    HttpClientJsConfig --> ComponentConfig
    FlightInstructorConfig --> ComponentConfig
```

**Configuration Flow:**
1. Each consumer (http-client-js, flight-instructor) has its own config format
2. Configs are normalized to `ComponentConfig` for shared components
3. Shared components use `ComponentConfig` via Context API
4. Components remain agnostic to consumer-specific details

---

## Migration Strategy Visualization

```mermaid
gantt
    title Refactoring Timeline (6 Weeks)
    dateFormat YYYY-MM-DD
    section Phase 1: Shared Package
    Setup package structure           :p1a, 2026-02-15, 2d
    Extract model components          :p1b, after p1a, 3d
    Extract serialization components  :p1c, after p1b, 3d
    Extract request components        :p1d, after p1c, 3d
    Extract helpers & contexts        :p1e, after p1d, 2d
    Write tests                       :p1f, after p1e, 2d
    
    section Phase 2: http-client-js
    Add dependency                    :p2a, after p1f, 1d
    Migrate models                    :p2b, after p2a, 1d
    Migrate serialization             :p2c, after p2b, 1d
    Migrate requests                  :p2d, after p2c, 2d
    Test & fix regressions           :p2e, after p2d, 2d
    
    section Phase 3: flight-instructor
    Add dependency                    :p3a, after p2e, 1d
    Simplify renderer                 :p3b, after p3a, 1d
    Migrate components                :p3c, after p3b, 2d
    Test CLI commands                 :p3d, after p3c, 2d
    Verify output                     :p3e, after p3d, 1d
    
    section Phase 4: Testing
    E2E validation                    :p4a, after p3e, 2d
    Performance testing               :p4b, after p4a, 2d
    Edge cases                        :p4c, after p4b, 2d
    
    section Phase 5: Finalization
    Remove duplicated code            :p5a, after p4c, 1d
    Update documentation              :p5b, after p5a, 2d
    Code review                       :p5c, after p5b, 2d
    Release                          :p5d, after p5c, 1d
```

---

## Risk Mitigation Strategy

```mermaid
mindmap
  root((Refactoring<br/>Risks))
    Breaking Changes
      Feature flags
      Gradual rollout
      Backward compatibility
      Extensive testing
    Performance Issues
      Before/after benchmarks
      Profile hot paths
      Optimize shared code
      Monitor metrics
    API Design Problems
      Start with simple components
      Iterate with feedback
      TypeScript type safety
      Document decisions
    Integration Failures
      Comprehensive tests
      CI/CD validation
      Staged deployment
      Rollback plan
    Team Coordination
      Clear ownership
      Regular syncs
      Documentation
      Code review process
```

---

## Success Metrics Dashboard

```
┌─────────────────────────────────────────────────────────┐
│ Refactoring Success Metrics                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Code Reuse                     Target: >80%             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 85%              │
│                                                          │
│ Test Coverage                  Target: >90%             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 92%           │
│                                                          │
│ Performance Impact             Target: <5% regression   │
│ ━━━━━━━ 2% improvement                                  │
│                                                          │
│ Bug Reduction                  Target: 50% reduction    │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 60%                   │
│                                                          │
│ Development Velocity           Target: 30% faster       │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 35%                │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. ✅ Review architecture diagrams
2. ✅ Approve refactoring plan
3. ⏳ Create GitHub project board with issues
4. ⏳ Assign component owners
5. ⏳ Set up shared package infrastructure
6. ⏳ Begin Phase 1 implementation
