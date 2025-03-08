# Cloudflare Hyperdrive Integration

This project uses Cloudflare Hyperdrive to accelerate database connections and improve performance.

## What is Hyperdrive?

Hyperdrive is a Cloudflare service that provides:

- **Connection pooling**: Maintains a pool of database connections to reduce connection overhead
- **Query caching**: Caches read queries to reduce database load and improve response times
- **Global distribution**: Brings database connections closer to your users worldwide
- **Prepared statements**: Optimizes query execution with prepared statements

## Configuration

The Hyperdrive configuration is managed through a setup script and Cloudflare Wrangler.

### Wrangler Configuration

The `wrangler.toml` file contains the binding configuration for Cloudflare Workers:

```toml
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "nuco-hyperdrive"
```

- `binding`: The name of the binding in your Workers code
- `id`: The ID of your Hyperdrive instance

## Implementation

The database connection is implemented in `src/lib/db/index.ts`. When deployed to Cloudflare:

1. Hyperdrive automatically intercepts and optimizes database connections
2. No code changes are required - it works transparently with your existing database code
3. Connection pooling and query caching are handled automatically

This approach is simpler and more reliable than trying to manually implement a custom adapter for Hyperdrive.

## Usage

The implementation is transparent to the rest of the application. All database queries will automatically use Hyperdrive when deployed to Cloudflare.

## Deployment

To deploy with Hyperdrive:

```bash
# Deploy the application with Hyperdrive
bun run deploy
```

This will:
1. Build your Next.js application
2. Set up or update your Hyperdrive instance
3. Deploy to Cloudflare Pages

## Setup Script

The `scripts/setup-hyperdrive.js` script handles:

1. Creating a Hyperdrive instance if it doesn't exist
2. Updating the Hyperdrive configuration with the correct parameters
3. Ensuring the wrangler.toml file has the correct binding

You can run this script manually with:

```bash
bun run hyperdrive:setup
```

## Monitoring

You can monitor your Hyperdrive instance in the Cloudflare dashboard:

1. Go to the Cloudflare dashboard
2. Navigate to Workers & Pages > Hyperdrive
3. Select your Hyperdrive instance to view metrics

## Local Development

For local development, the application will automatically use direct database connections. No additional configuration is needed.

## Troubleshooting

If you encounter issues with Hyperdrive:

1. Check that your Hyperdrive instance is created and running with `bun run hyperdrive:list`
2. Verify that your DATABASE_URL environment variable is correct
3. Check the Cloudflare logs for any errors
4. If you need to configure additional options like caching settings, you'll need to do this through the Cloudflare dashboard

For more information, see the [Cloudflare Hyperdrive documentation](https://developers.cloudflare.com/hyperdrive/). 