# Workout Session Persistence - Architecture Diagram

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph "User Actions"
        A[Start Workout]
        B[Enter Weight]
        C[Complete Workout]
        D[Page Refresh]
        E[Browser Close]
    end
    
    subgraph "WorkoutModeController"
        F[initialize]
        G[handleStartWorkout]
        H[handleCompleteWorkout]
        I[showResumeSessionPrompt]
        J[resumeSession]
    end
    
    subgraph "WorkoutSessionService"
        K[startSession]
        L[updateExerciseWeight]
        M[completeSession]
        N[persistSession]
        O[restoreSession]
        P[clearPersistedSession]
    end
    
    subgraph "Storage Layer"
        Q[(localStorage)]
        R[(Firestore API)]
    end
    
    subgraph "UI Components"
        S[Resume Prompt Offcanvas]
        T[Exercise Cards]
        U[Timer Widget]
    end
    
    A --> G
    G --> K
    K --> N
    N --> Q
    
    B --> L
    L --> N
    
    C --> M
    M --> P
    P --> Q
    
    D --> F
    E --> F
    F --> O
    O --> Q
    O --> I
    I --> J
    J --> K
    
    K --> R
    M --> R
    
    J --> T
    J --> U
    
    style Q fill:#e1f5ff
    style R fill:#fff4e1
    style N fill:#d4edda
    style O fill:#d4edda
    style P fill:#f8d7da
```

## 🔄 Session Lifecycle Flow

```mermaid
sequenceDiagram
    participant User
    participant Controller
    participant Service
    participant LocalStorage
    participant API
    
    Note over User,API: Starting a Workout
    User->>Controller: Click "Start Workout"
    Controller->>Service: startSession(workoutId, name)
    Service->>API: POST /api/v3/workout-sessions
    API-->>Service: {sessionId, startedAt}
    Service->>Service: Store in currentSession
    Service->>LocalStorage: persistSession()
    LocalStorage-->>Service: ✓ Saved
    Service-->>Controller: Session started
    Controller->>User: Show active workout UI
    
    Note over User,API: Entering Weights
    User->>Controller: Enter weight "135 lbs"
    Controller->>Service: updateExerciseWeight(name, weight, unit)
    Service->>Service: Update currentSession.exercises
    Service->>LocalStorage: persistSession()
    LocalStorage-->>Service: ✓ Saved
    Service-->>Controller: Weight updated
    Controller->>User: Show updated badge
    
    Note over User,API: Page Refresh (Critical!)
    User->>Controller: Refresh page
    Controller->>Service: restoreSession()
    Service->>LocalStorage: Get persisted session
    LocalStorage-->>Service: {sessionData}
    Service->>Service: Validate & check expiration
    Service-->>Controller: Session data
    Controller->>User: Show resume prompt
    User->>Controller: Click "Resume"
    Controller->>Service: Load workout & restore state
    Controller->>User: Continue workout seamlessly
    
    Note over User,API: Completing Workout
    User->>Controller: Click "Complete Workout"
    Controller->>Service: completeSession(exercises)
    Service->>API: POST /api/v3/workout-sessions/{id}/complete
    API-->>Service: {completedSession}
    Service->>LocalStorage: clearPersistedSession()
    LocalStorage-->>Service: ✓ Cleared
    Service-->>Controller: Session completed
    Controller->>User: Show completion summary
```

## 📊 Data Flow Diagram

```mermaid
flowchart LR
    subgraph "In-Memory State"
        A[currentSession Object]
    end
    
    subgraph "Persistent Storage"
        B[localStorage]
        C[Session JSON]
    end
    
    subgraph "Server State"
        D[Firestore API]
        E[Session Document]
    end
    
    A -->|persistSession| B
    B -->|JSON.stringify| C
    C -->|JSON.parse| B
    B -->|restoreSession| A
    
    A -->|API calls| D
    D -->|Response| A
    
    style A fill:#fff3cd
    style B fill:#d1ecf1
    style D fill:#f8d7da
```

## 🎯 Persistence Trigger Points

```mermaid
graph TD
    A[Session Events] --> B{Event Type}
    
    B -->|Start| C[startSession]
    B -->|Weight Update| D[updateExerciseWeight]
    B -->|Auto-save| E[autoSaveSession]
    B -->|Complete| F[completeSession]
    B -->|Clear| G[clearSession]
    
    C --> H[persistSession]
    D --> H
    E --> H
    
    F --> I[clearPersistedSession]
    G --> I
    
    H --> J[(localStorage)]
    I --> J
    
    style H fill:#d4edda
    style I fill:#f8d7da
    style J fill:#e1f5ff
```

## 🔍 Session Restoration Decision Tree

```mermaid
graph TD
    A[Page Load] --> B{Persisted Session Exists?}
    
    B -->|No| C[Normal Initialization]
    B -->|Yes| D{Session Valid?}
    
    D -->|Invalid Data| E[Clear & Normal Init]
    D -->|Valid| F{Session Expired?}
    
    F -->|>24 hours| E
    F -->|Fresh| G{Workout Still Exists?}
    
    G -->|No| H[Show Error & Redirect]
    G -->|Yes| I[Show Resume Prompt]
    
    I --> J{User Choice}
    J -->|Resume| K[Restore Session State]
    J -->|Start Fresh| L[Clear & Normal Init]
    
    K --> M[Load Workout]
    M --> N[Update UI]
    N --> O[Start Timer]
    O --> P[Continue Workout]
    
    style B fill:#fff3cd
    style D fill:#fff3cd
    style F fill:#fff3cd
    style G fill:#fff3cd
    style I fill:#d4edda
    style K fill:#d4edda
```

## 🛡️ Error Handling Strategy

```mermaid
graph TD
    A[Persistence Operation] --> B{Try Operation}
    
    B -->|Success| C[Log Success]
    B -->|Error| D{Error Type}
    
    D -->|QuotaExceeded| E[Warn User - Storage Full]
    D -->|SecurityError| F[Warn User - Private Mode]
    D -->|ParseError| G[Clear Invalid Data]
    D -->|NetworkError| H[Queue for Retry]
    D -->|Other| I[Log & Continue]
    
    E --> J[Continue Without Persistence]
    F --> J
    G --> J
    H --> K[Retry When Online]
    I --> J
    
    J --> L[App Continues Normally]
    K --> L
    
    style D fill:#fff3cd
    style E fill:#f8d7da
    style F fill:#f8d7da
    style G fill:#f8d7da
    style J fill:#d4edda
```

## 📱 Multi-Tab Synchronization

```mermaid
sequenceDiagram
    participant Tab1
    participant LocalStorage
    participant Tab2
    
    Note over Tab1,Tab2: Tab 1 starts workout
    Tab1->>LocalStorage: persistSession(sessionA)
    LocalStorage-->>Tab1: ✓ Saved
    
    Note over Tab1,Tab2: Tab 2 opens same page
    Tab2->>LocalStorage: restoreSession()
    LocalStorage-->>Tab2: sessionA data
    Tab2->>Tab2: Show resume prompt
    
    Note over Tab1,Tab2: Tab 2 updates weight
    Tab2->>LocalStorage: persistSession(sessionA + weight)
    LocalStorage-->>Tab2: ✓ Saved (overwrites)
    
    Note over Tab1,Tab2: Tab 1 refreshes
    Tab1->>LocalStorage: restoreSession()
    LocalStorage-->>Tab1: sessionA + weight (latest)
    Tab1->>Tab1: Resume with Tab 2's changes
    
    Note over Tab1,Tab2: Last Write Wins Strategy
```

## 🔐 Security Considerations

### Data Stored in localStorage

✅ **Safe to Store**:
- Session ID (server-side reference)
- Workout ID (public template reference)
- Workout name (display only)
- Exercise names (public data)
- Weight values (user's own data)
- Timestamps (metadata)

❌ **Never Store**:
- Authentication tokens
- User passwords
- Personal identifiable information
- Payment information
- API keys

### Privacy Notes

- localStorage is domain-specific (isolated per origin)
- Data persists until explicitly cleared
- Users can clear via browser settings
- No sensitive data exposed in session object

## 📈 Performance Impact

### Storage Size

```
Typical Session Size:
- Base metadata: ~200 bytes
- Per exercise (10 exercises): ~100 bytes each
- Total: ~1.2 KB per session

localStorage Limit: 5-10 MB
Sessions Supported: ~4,000-8,000 sessions
```

### Performance Metrics

| Operation | Time | Impact |
|-----------|------|--------|
| persistSession() | <1ms | Negligible |
| restoreSession() | <1ms | Negligible |
| JSON.stringify() | <0.5ms | Negligible |
| JSON.parse() | <0.5ms | Negligible |

**Conclusion**: Zero noticeable performance impact

## 🎨 UI/UX Flow

```mermaid
stateDiagram-v2
    [*] --> PageLoad
    
    PageLoad --> CheckSession: Initialize
    
    CheckSession --> NoSession: No persisted session
    CheckSession --> HasSession: Session found
    
    NoSession --> NormalFlow: Continue normally
    
    HasSession --> ValidateSession: Check validity
    
    ValidateSession --> Expired: >24 hours old
    ValidateSession --> Valid: Fresh session
    
    Expired --> ClearSession: Auto-clear
    ClearSession --> NormalFlow
    
    Valid --> ShowPrompt: Display resume UI
    
    ShowPrompt --> UserResume: User clicks Resume
    ShowPrompt --> UserFresh: User clicks Start Fresh
    
    UserResume --> RestoreState: Load session
    RestoreState --> ActiveWorkout: Continue workout
    
    UserFresh --> ClearSession
    
    NormalFlow --> SelectWorkout: Choose workout
    SelectWorkout --> StartNew: Start session
    StartNew --> ActiveWorkout
    
    ActiveWorkout --> [*]: Complete or exit
```

## 🔧 Implementation Checklist

### Phase 1: Core Persistence ✅
- [ ] Add `persistSession()` method
- [ ] Add `restoreSession()` method
- [ ] Add `clearPersistedSession()` method
- [ ] Add `hasPersistedSession()` method

### Phase 2: Auto-Persist Hooks ✅
- [ ] Hook into `startSession()`
- [ ] Hook into `updateExerciseWeight()`
- [ ] Hook into `autoSaveSession()`
- [ ] Hook into `completeSession()`
- [ ] Hook into `clearSession()`

### Phase 3: Restoration Logic ✅
- [ ] Check for session in `initialize()`
- [ ] Implement `showResumeSessionPrompt()`
- [ ] Implement `resumeSession()`
- [ ] Handle workout loading
- [ ] Restore timer state

### Phase 4: Edge Cases ✅
- [ ] Handle expired sessions
- [ ] Handle deleted workouts
- [ ] Handle session conflicts
- [ ] Handle invalid data
- [ ] Handle storage errors

### Phase 5: Testing 🧪
- [ ] Unit tests for persistence methods
- [ ] Integration tests for full flow
- [ ] Manual testing across browsers
- [ ] Performance testing
- [ ] Edge case validation

---

**Ready to implement?** This architecture provides a robust, user-friendly solution for workout session persistence with minimal performance impact and excellent error handling.