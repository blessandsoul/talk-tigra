# Quo (OpenPhone) API Integration

This document explains how to use the Quo API authentication and client in the Talk-Tigra server.

## Overview

The Quo API integration provides a centralized, authenticated HTTP client for making requests to the Quo (formerly OpenPhone) API. All requests automatically include the API key in the `Authorization` header.

## Setup

### 1. Environment Configuration

The `QUO_API` key is already configured in your `.env` file:

```env
QUO_API=q0g1dpoFPvQIdCK9RtmWckjfWyH7c0X7
```

This key is validated at server startup through the environment schema in `src/config/env.ts`.

### 2. API Client

The Quo API client is located at `src/libs/quo-api.ts` and provides:

- **Automatic Authentication**: Every request includes `Authorization: YOUR_API_KEY` header
- **Request/Response Logging**: All API calls are logged for debugging
- **Error Handling**: Comprehensive error handling with detailed logging
- **Type Safety**: Full TypeScript support

## Usage

### Basic Usage

```typescript
import { quoApiClient } from '@/libs/quo-api.js';

// GET request
const response = await quoApiClient.get('/phone-numbers');

// POST request
const response = await quoApiClient.post('/messages', {
  to: '+1234567890',
  body: 'Hello from Talk-Tigra!'
});

// PUT request
const response = await quoApiClient.put('/phone-numbers/123', {
  name: 'Updated Name'
});

// DELETE request
const response = await quoApiClient.delete('/messages/456');
```

### Using in Services

Create domain-specific services that use the Quo API client. Example: `src/services/quo-messages.service.ts`

```typescript
import { quoApiClient } from '../libs/quo-api.js';
import logger from '../libs/logger.js';

class QuoMessagesService {
  async listMessages(phoneNumberId: string) {
    try {
      const response = await quoApiClient.get(
        `/phone-numbers/${phoneNumberId}/messages`
      );
      return response.data.data;
    } catch (error) {
      logger.error({ error }, 'Failed to fetch messages');
      throw error;
    }
  }
}

export const quoMessagesService = new QuoMessagesService();
```

### Using in Controllers

```typescript
import { quoMessagesService } from '@/services/quo-messages.service.js';

export class QuoController {
  async getMessages(request, reply) {
    const { phoneNumberId } = request.params;
    
    const messages = await quoMessagesService.listMessages(phoneNumberId);
    
    return reply.send({
      success: true,
      data: messages
    });
  }
}
```

## API Client Features

### Request Interceptor

Automatically logs all outgoing requests:

```typescript
logger.debug({
  method: 'GET',
  url: '/phone-numbers',
  params: { limit: 50 }
}, 'Quo API request');
```

### Response Interceptor

Logs successful responses and handles errors:

```typescript
// Success
logger.debug({
  status: 200,
  url: '/phone-numbers'
}, 'Quo API response');

// Error
logger.error({
  status: 404,
  url: '/messages/123',
  data: { error: 'Not found' }
}, 'Quo API error response');
```

### Error Handling

The client handles three types of errors:

1. **Server Error Response** (4xx, 5xx)
   - Logs status code, URL, and error data
   
2. **No Response** (Network issues)
   - Logs request details and error message
   
3. **Request Setup Error**
   - Logs configuration issues

## Configuration

### Base URL

Update the base URL in `src/libs/quo-api.ts`:

```typescript
const QUO_API_BASE_URL = 'https://api.quo.com'; // Update with actual URL
const QUO_API_VERSION = 'v1';
```

### Timeout

Default timeout is 30 seconds. Adjust in the client constructor:

```typescript
this.client = axios.create({
  baseURL: `${QUO_API_BASE_URL}/${QUO_API_VERSION}`,
  timeout: 30000, // 30 seconds
  // ...
});
```

## Example Service: Quo Messages

An example service is provided at `src/services/quo-messages.service.ts` with the following methods:

### List Messages

```typescript
const messages = await quoMessagesService.listMessages('pn_123456', {
  limit: 50,
  direction: 'inbound',
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});
```

### Get Single Message

```typescript
const message = await quoMessagesService.getMessage('msg_123456');
```

### Send Message

```typescript
const sentMessage = await quoMessagesService.sendMessage({
  phoneNumberId: 'pn_123456',
  to: '+1234567890',
  body: 'Hello from Talk-Tigra!'
});
```

### List Phone Numbers

```typescript
const phoneNumbers = await quoMessagesService.listPhoneNumbers();
```

## Next Steps

1. **Update API Endpoints**: Replace example endpoints in `quo-messages.service.ts` with actual Quo API endpoints from their documentation
2. **Update Types**: Define proper TypeScript interfaces based on actual Quo API response structures
3. **Create Routes**: Create Fastify routes that use the Quo services
4. **Add More Services**: Create additional services for other Quo API resources (calls, contacts, etc.)

## Important Notes

- ✅ **Authentication is automatic** - No need to manually add Authorization headers
- ✅ **All requests are logged** - Check logs for debugging
- ✅ **Type-safe** - Full TypeScript support
- ⚠️ **Update placeholders** - Replace example endpoints and types with actual Quo API documentation
- ⚠️ **API Key Security** - Never commit `.env` file to version control

## Troubleshooting

### Authentication Errors

If you get 401 Unauthorized:
1. Verify `QUO_API` key in `.env` is correct
2. Check if the API key has proper permissions
3. Ensure the key hasn't expired

### Network Errors

If requests timeout:
1. Check your internet connection
2. Verify the base URL is correct
3. Increase timeout if needed

### Type Errors

If TypeScript complains:
1. Update type definitions in `quo-messages.service.ts`
2. Ensure response structure matches actual API responses
3. Use `any` temporarily for rapid prototyping, then add proper types

## Resources

- [Quo API Documentation](https://docs.quo.com/api) (Update with actual link)
- [Axios Documentation](https://axios-http.com/docs/intro)
- [Talk-Tigra Server Architecture](./README.md)
