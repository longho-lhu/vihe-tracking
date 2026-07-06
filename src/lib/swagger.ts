import { OpenAPIV3 } from 'openapi-types'

export const swaggerSpec: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: {
    title: 'Vehicle Tracking API',
    version: '1.0.0',
    description: 'REST API for vehicle tracking system. Supports device registration, location tracking via MQTT, and historical data retrieval.',
  },
  servers: [
    {
      url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      description: 'Application Server',
    },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'vehi_session',
        description: 'Session cookie obtained after login',
      },
    },
    schemas: {
      Device: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          mac_address: { type: 'string', example: 'AA:BB:CC:DD:EE:FF' },
          license_plate: { type: 'string', example: '51A-12345' },
          vehicle_type: { type: 'string', example: 'Xe máy' },
          mqtt_topic: { type: 'string', example: 'vehi/aabbccddeeff' },
          status: { type: 'string', enum: ['moving', 'waiting', 'sleeping', 'offline'] },
          last_lat: { type: 'number', example: 10.762 },
          last_lng: { type: 'number', example: 106.660 },
          last_speed: { type: 'number', example: 30.5 },
          last_seen: { type: 'string', format: 'date-time' },
          is_configured: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      RegisterDeviceRequest: {
        type: 'object',
        required: ['mac_address'],
        properties: {
          mac_address: { type: 'string', example: 'AA:BB:CC:DD:EE:FF' },
        },
      },
      RegisterDeviceResponse: {
        type: 'object',
        properties: {
          device_id: { type: 'string', format: 'uuid' },
          mqtt_topic: { type: 'string', example: 'vehi/aabbccddeeff' },
          is_new: { type: 'boolean' },
        },
      },
      UpdateDeviceRequest: {
        type: 'object',
        properties: {
          license_plate: { type: 'string' },
          vehicle_type: { type: 'string' },
          owner_id: { type: 'string', format: 'uuid' },
        },
      },
      LocationHistory: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          device_id: { type: 'string', format: 'uuid' },
          recorded_at: { type: 'string', format: 'date-time' },
          positions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                lat: { type: 'number' },
                lng: { type: 'number' },
                speed: { type: 'number' },
                ts: { type: 'integer', description: 'Unix timestamp ms' },
              },
            },
          },
          duration_seconds: { type: 'integer' },
          start_lat: { type: 'number' },
          start_lng: { type: 'number' },
          end_lat: { type: 'number' },
          end_lng: { type: 'number' },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          type: { type: 'string', enum: ['new_device', 'status_change', 'offline_alert', 'info'] },
          device_id: { type: 'string', format: 'uuid' },
          message: { type: 'string' },
          is_read: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
  },
  paths: {
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login with username and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful, session cookie set' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/api/auth/setup': {
      post: {
        tags: ['Authentication'],
        summary: 'Create initial admin account (only if no accounts exist)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password', 'displayName'],
                properties: {
                  username: { type: 'string' },
                  password: { type: 'string' },
                  displayName: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Admin account created successfully' },
          400: { description: 'Admin account already exists' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current session user info',
        security: [{ cookieAuth: [] }],
        responses: {
          200: { description: 'Current user info' },
          401: { description: 'Not authenticated' },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Logout and clear session',
        security: [{ cookieAuth: [] }],
        responses: {
          200: { description: 'Logged out successfully' },
        },
      },
    },
    '/api/devices/register': {
      post: {
        tags: ['Devices'],
        summary: 'Register a new device (called by hardware on boot)',
        description: 'The device sends its MAC address. Server creates the device record if new, returns MQTT topic.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterDeviceRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Device registered or already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RegisterDeviceResponse' },
              },
            },
          },
          400: { description: 'Missing mac_address' },
        },
      },
    },
    '/api/devices': {
      get: {
        tags: ['Devices'],
        summary: 'List all devices',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['moving', 'waiting', 'sleeping', 'offline'] } },
        ],
        responses: {
          200: {
            description: 'List of devices',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Device' } },
              },
            },
          },
        },
      },
    },
    '/api/devices/{id}': {
      get: {
        tags: ['Devices'],
        summary: 'Get device by ID',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Device details', content: { 'application/json': { schema: { $ref: '#/components/schemas/Device' } } } },
          404: { description: 'Device not found' },
        },
      },
      patch: {
        tags: ['Devices'],
        summary: 'Update device info (license plate, vehicle type, owner)',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateDeviceRequest' } } },
        },
        responses: {
          200: { description: 'Updated device' },
          404: { description: 'Device not found' },
        },
      },
      delete: {
        tags: ['Devices'],
        summary: 'Delete a device',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Device deleted' },
          404: { description: 'Device not found' },
        },
      },
    },
    '/api/devices/{id}/history': {
      get: {
        tags: ['Devices'],
        summary: 'Get location history for a device',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'from', in: 'query', required: true, schema: { type: 'string', format: 'date-time' }, description: 'Start time ISO 8601' },
          { name: 'to', in: 'query', required: true, schema: { type: 'string', format: 'date-time' }, description: 'End time ISO 8601' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 100 } },
        ],
        responses: {
          200: {
            description: 'Location history batches',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/LocationHistory' } } } },
          },
        },
      },
    },
    '/api/mqtt/stream': {
      get: {
        tags: ['MQTT / Real-time'],
        summary: 'Server-Sent Events stream for real-time device location',
        description: 'Opens an SSE connection. Server subscribes to device MQTT topic and forwards messages.',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'device_id', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'SSE stream of location events', content: { 'text/event-stream': { schema: { type: 'string' } } } },
          404: { description: 'Device not found' },
        },
      },
    },
    '/api/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List notifications',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'unread_only', in: 'query', schema: { type: 'boolean' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: { description: 'Notifications list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Notification' } } } } },
        },
      },
    },
    '/api/notifications/{id}/read': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark notification as read',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Marked as read' },
        },
      },
    },
    '/api/notifications/read-all': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark all notifications as read',
        security: [{ cookieAuth: [] }],
        responses: {
          200: { description: 'All marked as read' },
        },
      },
    },
  },
}
