# API Specification

## Endpoints

### 1. Execute Agent
- **Path**: `/api/agents/execute`
- **Method**: `POST`
- **Payload**: `{"agent_id": "string", "prompt": "string", "context": "object"}`
- **Response**: Server-Sent Events (SSE) streaming the agent's thought process and final JSON/UI result.

### 2. Search Components
- **Path**: `/api/components/search`
- **Method**: `GET`
- **Query Params**: `q` (search term), `category` (tags)
- **Response**: Array of `Component` objects.

### 3. Magic Chat (1Code)
- **Path**: `/api/chat/magic`
- **Method**: `POST`
- **Payload**: `{"session_id": "uuid", "message": "string"}`
- **Response**: Generated code snippet and interactive component preview URL.
