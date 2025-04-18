# Web Tagger API Documentation

Web Tagger provides a RESTful API that allows you to programmatically access our image tagging and metadata management features. This documentation describes the available endpoints and how to use them.

## Authentication

All API requests must include your API key in the `X-API-Key` header:

```bash
curl -H "X-API-Key: your_api_key" https://api.webtagger.com/v1/tags
```

## Rate Limits

The API has different rate limits based on your plan:

- Pro: 100 requests/day
- Business: 400 requests/day
- Enterprise: 1000 requests/day

When you exceed your rate limit, the API will return a 429 status code with information about your usage.

## Endpoints

### GET /v1/tags

Retrieve tags for an image URL.

**Parameters:**

- `url` (required): The URL of the image to analyze

**Example Request:**
```bash
curl -H "X-API-Key: your_api_key" \
     "https://api.webtagger.com/v1/tags?url=https://example.com/image.jpg"
```

**Example Response:**
```json
{
  "tags": [
    {
      "name": "sunset",
      "confidence": 0.95
    },
    {
      "name": "beach",
      "confidence": 0.87
    }
  ]
}
```

### POST /v1/metadata

Update image metadata.

**Parameters:**

- `url` (required): The URL of the image
- `metadata` (required): Object containing metadata to update

**Example Request:**
```bash
curl -X POST \
     -H "X-API-Key: your_api_key" \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://example.com/image.jpg",
       "metadata": {
         "title": "Sunset at Beach",
         "description": "Beautiful sunset view at the beach",
         "keywords": ["sunset", "beach", "nature"]
       }
     }' \
     "https://api.webtagger.com/v1/metadata"
```

**Example Response:**
```json
{
  "success": true,
  "message": "Metadata updated successfully"
}
```

## Error Codes

- `401`: Invalid or missing API key
- `429`: Rate limit exceeded
- `400`: Invalid request parameters
- `500`: Internal server error

## Support

If you need help with the API, please contact our support team at support@webtagger.com.

## Rate Limit Headers

The API includes the following headers in each response:

- `X-RateLimit-Limit`: Your total request limit
- `X-RateLimit-Remaining`: Number of requests remaining
- `X-RateLimit-Reset`: Time when the rate limit will reset (Unix timestamp)

## Best Practices

1. Cache API responses when possible to avoid unnecessary requests
2. Handle rate limit errors gracefully in your application
3. Use appropriate error handling for all API calls
4. Monitor your API usage through the dashboard

## Changelog

### v1.0.0 (2024-03-20)
- Initial API release
- Basic tag and metadata endpoints
- Rate limiting implementation
- Authentication system 