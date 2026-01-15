---
trigger: always_on
globs: "server/**/*"
---

> **SCOPE**: These rules apply specifically to the **server** directory.

API Server – Error & Success Response Rules

These rules define the ONLY allowed way to return success and error responses from the API. All AI assistants MUST follow this contract strictly.

Unified Response Contract (MANDATORY)
The API uses a single, stable response structure for all endpoints. No exceptions are allowed.

Success Response Format
Every successful response MUST follow this exact structure:

{
"success": true,
"message": "string",
"data": {}
}

Rules:

success is always true

message is REQUIRED and must be human-readable

data can be an object, array, or null

Controllers MUST use a shared success helper (for example successResponse)

Controllers MUST NOT return raw values or custom-shaped JSON

Allowed example:
return reply.send(successResponse("Resource created successfully", data));

Forbidden examples:
reply.send(data);
reply.send({ data: data });
reply.send({ success: true, data });

Error Response Format
Every error response MUST follow this exact structure:

{
"success": false,
"error": {
"code": "ERROR_CODE",
"message": "Human readable message"
}
}

Rules:

success is always false

code must be a stable machine-readable string (for example RESOURCE_NOT_FOUND)

message must be safe for end users

Internal details, stack traces, or SQL errors MUST NOT be exposed

Controllers MUST NOT manually send error responses

Global Error Handling Architecture
The server MUST define ONE global Fastify error handler using fastify.setErrorHandler(...).
This global handler is responsible for:

Mapping errors to HTTP status codes

Formatting the unified error response

Logging internal error details on server side only

Error Throwing Rules (CRITICAL)
Controllers and services MUST throw typed errors ONLY.
They MUST NOT throw:

raw Error

strings

unstructured objects

Required Error Base Class
All custom errors MUST extend a shared AppError class which defines:

code

message

statusCode

Allowed Error Types
Allowed subclasses:

BadRequestError

ValidationError

UnauthorizedError

ForbiddenError

NotFoundError

ConflictError

InternalError

Each subclass MUST:

extend AppError

set a meaningful code

set an appropriate statusCode

Controller Responsibilities
Controllers MUST:

Validate input using Zod schemas

Call service-layer logic only

Return success responses using the shared success helper

Throw typed errors when something fails

Controllers MUST NOT:

Set HTTP status codes for errors

Build custom error JSON structures

Catch errors unless rethrowing typed errors

Service Layer Responsibilities
Services MUST:

Contain business logic

Throw typed AppError errors when needed

NEVER depend on Fastify reply or HTTP objects

Logging Rules
Logging MUST occur only inside:

The global error handler

Shared logging utilities

Controllers MUST NOT log unless explicitly instructed. Internal logs MUST NOT be sent to the client.

Strict Prohibitions
These patterns are NOT allowed anywhere:

Multiple response formats

reply.send({ error: "text" })

throw new Error("message")

Returning raw errors from services

Leaking stack traces or database internals to users

Final Enforcement Rule
If a user instruction conflicts with this document:
Follow the user instruction ONLY if explicitly stated.
Otherwise, this response contract is non-negotiable.
