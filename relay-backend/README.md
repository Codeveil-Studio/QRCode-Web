# Relay Backend API

Express.js backend server for the Relay application with TypeScript, authentication middleware, and Supabase integration.

## Features

- **Express.js** with TypeScript
- **Security** with Helmet, CORS, and rate limiting
- **Authentication** via Supabase JWT tokens
- **Validation** with express-validator
- **Database** integration with Supabase
- **Logging** with Morgan
- **Compression** and performance optimizations

## API Endpoints

### Stats

- `GET /api/stats/sidebar` - Get sidebar statistics (authenticated)
- `GET /api/stats/dashboard` - Get dashboard statistics (authenticated)

### Issues

- `POST /api/issues/report` - Report a new issue (public)
- `GET /api/issues` - Get all issues for user (authenticated)
- `GET /api/issues/asset/:assetId` - Get issues for specific asset (authenticated)

### Items

- `GET /api/items` - Get all items for user (authenticated)
- `GET /api/items/types` - Get item types (authenticated)
- `GET /api/items/:id` - Get specific item (authenticated)
- `POST /api/items` - Create new item (authenticated)
- `PUT /api/items/:id` - Update item (authenticated)
- `DELETE /api/items/:id` - Delete item (authenticated)

### Profile

- `GET /api/profile` - Get user profile (authenticated)
- `PUT /api/profile` - Update user profile (authenticated)
- `GET /api/profile/notifications/preferences` - Get notification preferences (authenticated)
- `PUT /api/profile/notifications/preferences` - Update notification preferences (authenticated)
- `POST /api/profile/notifications/send` - Send notification (authenticated)

### Health Check

- `GET /health` - Health check endpoint

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment Configuration**

   ```bash
   cp .env.example .env
   ```

   Update `.env` with your configuration:

   ```env
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. **Build the project**

   ```bash
   npm run build
   ```

4. **Development**

   ```bash
   npm run dev
   ```

5. **Production**
   ```bash
   npm start
   ```

## Authentication

All authenticated routes require a Bearer token in the Authorization header:

```
Authorization: Bearer <supabase_jwt_token>
```

The middleware verifies the token with Supabase and attaches user information to the request.

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "data": {} // Optional additional error details
}
```

## Success Responses

Successful responses follow this format:

```json
{
  "success": true,
  "data": {}, // Response data
  "message": "Optional success message"
}
```

## Security Features

- **Helmet** for security headers
- **CORS** configuration for cross-origin requests
- **Rate limiting** to prevent abuse
- **Input validation** with express-validator
- **JWT authentication** via Supabase
- **Request logging** for monitoring

## Development

- **TypeScript** for type safety
- **Nodemon** for development auto-reload
- **Structured logging** with request details
- **Environment-based configuration**

## Production Considerations

- Set `NODE_ENV=production`
- Configure proper CORS origins
- Set up proper logging infrastructure
- Configure rate limiting based on your needs
- Use HTTPS in production
- Set up proper monitoring and alerting
