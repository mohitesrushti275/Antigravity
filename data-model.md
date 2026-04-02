# Data Model

### Component
- `id`: String (UUID)
- `title`: String
- `description`: String
- `code_snippet`: String
- `category`: String (e.g., "Buttons", "Forms", "Layout")
- `author`: String
- `likes`: Integer

### AgentTemplate
- `template_id`: String
- `name`: String
- `description`: String
- `framework`: String (Next.js, Python, Go)
- `capabilities`: Array of Strings
- `github_url`: String

### ChatSession
- `id`: String (UUID)
- `user_id`: String
- `messages`: Array of `ChatMessage` (role, content, timestamp)
- `spend_limit`: Float
- `current_spend`: Float
