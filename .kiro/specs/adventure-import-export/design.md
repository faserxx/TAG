# Design Document: Adventure Import/Export

## Overview

This feature adds JSON-based import/export functionality for adventures, enabling offline adventure creation, version control, and easy sharing. The system provides a JSON schema for validation, REST API endpoints for import/export operations, and converts the demo adventure to load from a static JSON file at server startup.

The design leverages the existing DataStore and API infrastructure, adding new endpoints and validation logic. Adventures can be exported to JSON format preserving all relationships, and imported with comprehensive validation to ensure data integrity.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────┐
│     Terminal Interface              │
│  (Admin Commands: export, import,   │
│   schema)                           │
└────────┬────────────────────────────┘
         │
         │ Commands
         ▼
┌─────────────────────────────────────┐
│      Command Parser                 │
│  (Routes admin commands to API)     │
└────────┬────────────────────────────┘
         │
         │ HTTP (JSON)
         ▼
┌─────────────────────────────────────┐
│      API Server (Express)           │
│  ┌───────────────────────────────┐  │
│  │  Import/Export Endpoints      │  │
│  │  - POST /api/adventures/import│  │
│  │  - GET /api/adventures/:id/   │  │
│  │    export                     │  │
│  │  - GET /api/schema            │  │
│  └───────────┬───────────────────┘  │
│              │                       │
│  ┌───────────▼───────────────────┐  │
│  │  JSON Validator               │  │
│  │  (Ajv + JSON Schema)          │  │
│  └───────────┬───────────────────┘  │
└──────────────┼───────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│         DataStore                   │
│  (Existing adventure CRUD)          │
└─────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      SQLite Database                │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Static JSON Files                  │
│  - demo-adventure.json              │
│  - adventure-schema.json            │
└─────────────────────────────────────┘
```

### Component Interaction Flow

**Export Flow (via Terminal Command):**
1. Admin types "export <adventure-name>" in terminal
2. CommandParser validates admin mode
3. CommandParser calls API client with adventure name
4. API validates authentication
5. DataStore loads adventure from database
6. Adventure is serialized to JSON
7. Browser downloads JSON file
8. Terminal displays success message

**Import Flow (via Terminal Command):**
1. Admin types "import" in terminal
2. CommandParser validates admin mode
3. File picker opens for JSON selection
4. User selects JSON file
5. CommandParser calls API client with file content
6. API validates authentication
7. JSON is parsed and validated against schema
8. Referential integrity is checked
9. Adventure is deserialized and saved via DataStore
10. Terminal displays success/error message

**Export Flow (via API):**
1. Admin requests export via GET /api/adventures/:id/export
2. API validates authentication
3. DataStore loads adventure from database
4. Adventure is serialized to JSON (already implemented in APIServer)
5. JSON is returned with appropriate headers for download

**Import Flow (via API):**
1. Admin uploads JSON via POST /api/adventures/import
2. API validates authentication
3. JSON is parsed and validated against schema
4. Referential integrity is checked
5. Adventure is deserialized and saved via DataStore
6. Success/error response returned

**Server Startup Flow:**
1. Server initializes database
2. Check if demo adventure exists
3. If not, load demo-adventure.json
4. Validate and import demo adventure
5. Continue server startup

## Components and Interfaces

### 1. JSON Schema Definition

**File:** `backend/src/database/adventure-schema.json`

The schema defines the complete structure for adventure JSON files with validation rules for:
- Required fields
- Data types
- String formats (IDs, directions)
- Referential integrity patterns
- Array constraints

**Key Schema Sections:**
- Adventure metadata (id, name, description, startLocationId)
- Locations array with nested structure
- Characters array (supporting both scripted and AI-powered)
- Items array
- Exits array with direction validation
- AI configuration for NPCs

### 2. JSON Validator Service

**File:** `backend/src/database/AdventureValidator.ts`

```typescript
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export class AdventureValidator {
  validateAdventureJson(json: any): ValidationResult;
  validateReferentialIntegrity(adventure: any): ValidationError[];
  private validateLocationReferences(adventure: any): ValidationError[];
  private validateCharacterReferences(adventure: any): ValidationError[];
  private validateItemReferences(adventure: any): ValidationError[];
  private validateExitReferences(adventure: any): ValidationError[];
}
```

**Responsibilities:**
- Schema validation using Ajv library
- Referential integrity validation (location IDs, exit targets)
- Duplicate ID detection
- Start location validation
- Direction validation (north, south, east, west, up, down)

### 3. Adventure Import/Export Service

**File:** `backend/src/database/AdventureImportExport.ts`

```typescript
export interface ImportResult {
  success: boolean;
  adventureId?: string;
  errors?: ValidationError[];
}

export class AdventureImportExport {
  constructor(
    private dataStore: DataStore,
    private validator: AdventureValidator
  );

  async importFromJson(json: any): Promise<ImportResult>;
  async exportToJson(adventureId: string): Promise<any>;
  async loadDemoAdventure(): Promise<void>;
  private convertJsonToAdventure(json: any): Adventure;
  private convertAdventureToJson(adventure: Adventure): any;
}
```

**Responsibilities:**
- Coordinate validation and import process
- Convert between JSON format and internal Adventure type
- Handle demo adventure loading at startup
- Provide clear error messages for validation failures

### 4. API Endpoints

**New Routes in APIServer:**

```typescript
// Import adventure from JSON
POST /api/adventures/import
Headers: x-session-id (required)
Body: Adventure JSON
Response: 201 Created | 400 Bad Request | 401 Unauthorized

// Export adventure to JSON
GET /api/adventures/:id/export
Headers: x-session-id (required)
Response: 200 OK (JSON file) | 404 Not Found | 401 Unauthorized

// Get JSON schema
GET /api/schema
Response: 200 OK (JSON schema file)
```

### 5. Admin Commands (Terminal Interface)

**New Commands in CommandParser:**

```typescript
// Export adventure to JSON (downloads file)
export <adventure-name>

// Import adventure from JSON (triggers file upload)
import

// Download JSON schema
schema
```

**Command Behavior:**
- Commands only available in admin mode (after sudo authentication)
- Export command triggers browser download of JSON file
- Import command opens file picker for JSON upload
- Schema command downloads the JSON schema file
- All commands provide feedback in terminal output

### 6. Demo Adventure JSON File

**File:** `backend/data/demo-adventure.json`

Static JSON file containing "The Lost Temple" adventure, converted from the current seed.ts format. This file will be loaded at server startup if the demo adventure doesn't exist in the database.

### 7. Documentation

**File:** `backend/docs/ADVENTURE_JSON_FORMAT.md`

Comprehensive documentation including:
- Complete JSON structure explanation
- Field-by-field descriptions
- Required vs optional fields
- Referential integrity requirements
- Complete example adventure
- Common validation errors and solutions
- Best practices for adventure creation

## Data Models

### Adventure JSON Format

```json
{
  "id": "string (required, unique)",
  "name": "string (required)",
  "description": "string (optional)",
  "startLocationId": "string (required, must reference existing location)",
  "locations": [
    {
      "id": "string (required, unique within adventure)",
      "name": "string (required)",
      "description": "string (required)",
      "exits": [
        {
          "direction": "north|south|east|west|up|down (required)",
          "targetLocationId": "string (required, must reference existing location)"
        }
      ],
      "characters": [
        {
          "id": "string (required, unique within adventure)",
          "name": "string (required)",
          "dialogue": ["string array (required, can be empty for AI NPCs)"],
          "isAiPowered": "boolean (optional, default false)",
          "personality": "string (optional, required if isAiPowered=true)",
          "aiConfig": {
            "temperature": "number (optional, 0-2)",
            "maxTokens": "number (optional, positive integer)"
          }
        }
      ],
      "items": [
        {
          "id": "string (required, unique within adventure)",
          "name": "string (required)",
          "description": "string (required)"
        }
      ]
    }
  ]
}
```

### Internal Type Mapping

The JSON format maps directly to existing TypeScript types:
- JSON adventure → `Adventure` type
- JSON location → `Location` type
- JSON character → `Character` type
- JSON item → `Item` type

**Key Differences:**
- JSON uses arrays and objects; internal types use Maps and Sets
- JSON uses ISO date strings; internal types use Date objects
- JSON exits are array of objects; internal exits are Map<string, string>

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Export-Import Round Trip Preservation

*For any* adventure in the database, exporting it to JSON and then importing that JSON should produce an equivalent adventure with all locations, characters, items, dialogues, exits, and relationships preserved, including special characters in text fields.

**Validates: Requirements 1.2, 2.2, 1.5**

### Property 2: Valid JSON Export

*For any* adventure in the database, the export function should produce syntactically valid JSON that can be successfully parsed.

**Validates: Requirements 1.1**

### Property 3: Export Independence

*For any* set of adventures in the database, exporting one adventure should not affect the exported data of other adventures - each export should contain only the data for the requested adventure.

**Validates: Requirements 1.4**

### Property 4: Valid JSON Acceptance

*For any* JSON file that conforms to the adventure schema, the import function should successfully validate and accept it.

**Validates: Requirements 2.1**

### Property 5: Invalid JSON Rejection with Comprehensive Errors

*For any* JSON file that violates the schema (missing required fields, wrong types, invalid references), the validation should fail and report all validation errors with specific field paths and clear messages.

**Validates: Requirements 2.3, 6.2, 6.3, 6.5**

### Property 6: Schema Validation Enforcement

*For any* JSON file missing required fields, containing incorrect data types, or violating referential integrity constraints, the schema validation should reject it with appropriate error messages.

**Validates: Requirements 3.2, 3.3, 3.4**

### Property 7: Import Availability

*For any* successfully imported adventure, querying the DataStore for that adventure should immediately return the complete adventure data.

**Validates: Requirements 2.5**

### Property 8: Transaction Atomicity

*For any* import operation that fails validation or encounters an error, the database should remain unchanged with no partial data created.

**Validates: Requirements 6.4**

### Property 9: Authentication Enforcement

*For any* import or export API endpoint request without a valid admin session, the system should reject the request with a 401 status code.

**Validates: Requirements 7.4**

### Property 10: HTTP Response Correctness

*For any* API operation (successful import, export, validation failure, not found), the system should return the appropriate HTTP status code (201, 200, 400, 404) and response body structure.

**Validates: Requirements 7.5**

### Property 11: Admin Command Mode Enforcement

*For any* import/export terminal command (export, import, schema), when executed in player mode, the system should reject the command with an error message.

**Validates: Requirements 8.4**

## Error Handling

### Validation Errors

**Schema Validation Failures:**
- Missing required fields → 400 Bad Request with field path
- Invalid data types → 400 Bad Request with expected vs actual type
- Invalid enum values (directions) → 400 Bad Request with allowed values
- Array constraint violations → 400 Bad Request with constraint details

**Referential Integrity Failures:**
- Start location doesn't exist → 400 Bad Request identifying the missing location
- Exit target doesn't exist → 400 Bad Request identifying the invalid exit
- Duplicate IDs → 400 Bad Request identifying the duplicate
- Orphaned entities → 400 Bad Request identifying unreachable locations/items

**JSON Parsing Errors:**
- Malformed JSON → 400 Bad Request with line/column number
- Invalid UTF-8 → 400 Bad Request with encoding error

### Import Errors

**Duplicate Adventure:**
- Adventure with same ID exists → 409 Conflict with existing adventure info
- Adventure with same name exists → 409 Conflict with suggestion to use different name

**Database Errors:**
- Database write failure → 500 Internal Server Error
- Transaction rollback → 500 Internal Server Error with rollback confirmation

### Export Errors

**Adventure Not Found:**
- Invalid adventure ID → 404 Not Found

**Database Errors:**
- Database read failure → 500 Internal Server Error

### Authentication Errors

**Missing or Invalid Session:**
- No session ID header → 401 Unauthorized
- Invalid/expired session → 401 Unauthorized

### Error Response Format

All errors follow consistent structure:
```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "errors": [
    {
      "field": "path.to.field",
      "message": "Specific error for this field",
      "value": "actual value (if applicable)"
    }
  ],
  "suggestion": "How to fix the error"
}
```

## Testing Strategy

### Unit Testing

Unit tests will cover specific scenarios and edge cases:

**Validator Tests:**
- Valid adventure JSON passes validation
- Missing required fields are detected
- Invalid data types are detected
- Invalid direction values are rejected
- Duplicate IDs are detected
- Referential integrity violations are caught
- Special characters are properly handled

**Import/Export Service Tests:**
- JSON to Adventure conversion preserves data
- Adventure to JSON conversion preserves data
- Demo adventure loading succeeds
- Import with duplicate name is rejected
- Export of non-existent adventure fails appropriately

**API Endpoint Tests:**
- Import endpoint requires authentication
- Export endpoint requires authentication
- Schema endpoint is publicly accessible
- Appropriate status codes are returned
- Error responses follow correct format

### Property-Based Testing

Property-based tests will verify universal correctness properties using **fast-check** library (JavaScript/TypeScript PBT framework). Each test will run a minimum of 100 iterations with randomly generated data.

**Test Configuration:**
```typescript
import fc from 'fast-check';

// Configure to run 100 iterations minimum
fc.assert(
  fc.property(/* generators */, /* test function */),
  { numRuns: 100 }
);
```

**Property Tests:**

1. **Round-trip preservation** - Generate random adventures, export to JSON, import back, verify equivalence
2. **Valid JSON export** - Generate random adventures, export, verify JSON.parse succeeds
3. **Export independence** - Generate multiple adventures, export each, verify no cross-contamination
4. **Valid JSON acceptance** - Generate valid adventure JSON, verify import succeeds
5. **Invalid JSON rejection** - Generate invalid JSON (missing fields, wrong types), verify rejection with errors
6. **Schema validation** - Generate schema-violating JSON, verify validation catches all violations
7. **Import availability** - Import random adventure, immediately query it, verify it's retrievable
8. **Transaction atomicity** - Trigger import failures, verify database unchanged
9. **Authentication enforcement** - Call endpoints without auth, verify 401 responses
10. **HTTP response correctness** - Perform various operations, verify correct status codes

**Generators:**

Custom generators will be created for:
- Valid adventure structures
- Invalid adventures (missing fields, wrong types)
- Adventures with special characters
- Adventures with referential integrity violations
- Valid/invalid session IDs

### Integration Testing

Integration tests will verify end-to-end workflows:

**Demo Adventure Loading:**
- Server startup with empty database loads demo adventure
- Server startup with existing demo adventure skips import
- Server startup with invalid demo JSON logs error and continues

**Complete Import/Export Workflow:**
- Create adventure via admin UI
- Export to JSON file
- Delete adventure
- Import from JSON file
- Verify adventure is identical

**Error Handling Workflow:**
- Attempt import with invalid JSON
- Verify comprehensive error messages
- Fix errors based on messages
- Verify successful import

## Implementation Notes

### JSON Schema Library

Use **Ajv** (Another JSON Schema Validator) for schema validation:
- Fast and widely used
- Supports JSON Schema Draft 7
- Provides detailed error messages
- Supports custom error messages

### File Locations

```
backend/
├── data/
│   └── demo-adventure.json          # Static demo adventure
├── src/
│   └── database/
│       ├── adventure-schema.json    # JSON schema definition
│       ├── AdventureValidator.ts    # Validation logic
│       └── AdventureImportExport.ts # Import/export service
└── docs/
    └── ADVENTURE_JSON_FORMAT.md     # User documentation
```

### Demo Adventure Migration

The existing `seed.ts` will be converted to `demo-adventure.json`:
1. Export current demo adventure structure to JSON format
2. Save as static file
3. Update server initialization to load from JSON
4. Keep seed.ts for reference but mark as deprecated

### Backward Compatibility

Existing adventures in the database are not affected:
- No database schema changes required
- Existing API endpoints remain unchanged
- New endpoints are additive only

### Performance Considerations

**Large Adventures:**
- JSON validation is fast (< 10ms for typical adventures)
- Export/import operations are I/O bound
- Consider streaming for very large adventures (future enhancement)

**Concurrent Imports:**
- SQLite handles concurrent reads well
- Writes are serialized by SQLite
- Import operations use transactions for atomicity

### Security Considerations

**Authentication:**
- All import/export endpoints require admin authentication
- Schema endpoint is public (read-only, no sensitive data)

**Input Validation:**
- All JSON input is validated against schema
- SQL injection prevented by parameterized queries (existing)
- No arbitrary code execution from JSON

**File Size Limits:**
- Express JSON body parser limits request size (default 100kb)
- Can be increased if needed for large adventures
- Consider file upload for very large adventures

## Future Enhancements

### Potential Improvements

1. **Bulk Import/Export** - Import/export multiple adventures in one operation
2. **Adventure Versioning** - Track changes to adventures over time
3. **Partial Updates** - Import only specific locations or characters
4. **Adventure Templates** - Provide starter templates for common adventure types
5. **Visual Schema Editor** - Web-based tool for creating adventures with validation
6. **Adventure Marketplace** - Share adventures with community
7. **Compression** - Compress large adventure JSON files
8. **Streaming** - Stream large adventures for better performance

### Migration Path

If adventure format changes in the future:
1. Version the schema (v1, v2, etc.)
2. Provide migration utilities
3. Support importing older versions
4. Export always uses latest version
