# Whisper API - Backend

Complete backend server for the Whisper Transcription API built with Node.js, Express, Prisma, and PostgreSQL.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Setup database
npm run prisma:migrate
npm run prisma:seed

# Start development server
npm run dev
```

Server will start at `http://localhost:3000`

## 📁 Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── seed.ts                 # Test data seeder
│   ├── migrations/             # Database migrations
│   └── README.md               # Prisma documentation
├── src/
│   ├── db/
│   │   ├── index.ts            # Prisma client
│   │   ├── helpers.ts          # Database helper functions
│   │   └── __tests__/          # Database tests
│   ├── types/
│   │   └── index.ts            # Shared TypeScript types
│   └── __tests__/
│       └── setup.ts            # Jest test setup
├── package.json
├── tsconfig.json
├── jest.config.js
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── .gitignore
├── README.md                   # This file
└── INTEGRATION.md              # Integration guide
```

## 📚 Documentation

- **[Prisma Setup](./prisma/README.md)** - Database schema and Prisma usage
- **[Integration Guide](./INTEGRATION.md)** - How modules integrate with the database

## 🛠️ Available Scripts

```bash
# Development
npm run dev                    # Start dev server with hot reload

# Production
npm run start                  # Start production server
npm run build                  # Build TypeScript to JavaScript

# Database
npm run prisma:generate        # Generate Prisma Client
npm run prisma:migrate         # Run migrations (dev)
npm run prisma:migrate:prod    # Run migrations (production)
npm run prisma:seed            # Seed test data
npm run prisma:studio          # Open Prisma Studio GUI
npm run db:reset               # Reset database & reseed

# Testing
npm test                       # Run all tests with coverage
npm run test:watch             # Run tests in watch mode
npm run test:db                # Run database tests only

# Code Quality
npm run lint                   # Lint code
npm run format                 # Format code with Prettier
```

## 🗄️ Database

### Schema

- **users** - User accounts and plans
- **api_keys** - API authentication (hashed)
- **transcriptions** - Job records and results
- **usage_logs** - Usage tracking

See [prisma/README.md](./prisma/README.md) for complete schema documentation.

### Migrations

```bash
# Create migration
npm run prisma:migrate

# Apply migrations in production
npm run prisma:migrate:prod

# View migration status
npx prisma migrate status
```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/whisperapi"

# Server
PORT=3000
NODE_ENV="development"

# See .env.example for complete list
```

### TypeScript

Configured in `tsconfig.json` with strict mode enabled.

### ESLint & Prettier

Code quality tools configured in `.eslintrc.json` and `.prettierrc`.

## 🧪 Testing

Tests use Jest with ts-jest for TypeScript support.

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm test -- --coverage
```

### Test Data

After seeding, use these credentials:

**API Keys:**
- FREE: `wtr_live_test_key_12345678901234567890`
- PRO: `wtr_live_pro_key_abcdefghijklmnopqrstu`

**Users:**
- `test-free@example.com` (FREE plan)
- `test-pro@example.com` (PRO plan)
- `test-payg@example.com` (PAYG plan)

## 📦 Dependencies

### Core
- **express** - Web framework
- **@prisma/client** - Database ORM
- **bullmq** - Job queue
- **ioredis** - Redis client
- **stripe** - Payment processing

### AWS
- **@aws-sdk/client-s3** - S3 storage
- **@aws-sdk/s3-request-presigner** - Presigned URLs

### Security
- **bcrypt** - Password hashing
- **helmet** - Security headers
- **cors** - CORS middleware
- **express-rate-limit** - Rate limiting

### Utilities
- **zod** - Schema validation
- **dotenv** - Environment variables
- **morgan** - HTTP logging
- **multer** - File uploads

## 🔐 Security

1. **API Keys** - SHA-256 hashed, never stored in plain text
2. **Input Validation** - Zod schemas for all inputs
3. **Rate Limiting** - Per-tier limits enforced
4. **CORS** - Configured for specific origins
5. **Helmet** - Security headers enabled
6. **SQL Injection** - Prevented by Prisma parameterization

## 🌐 API Exports

### Database Client

```typescript
import { prisma } from './src/db';
```

### Helper Functions

```typescript
import {
  findUserByEmail,
  getUserMonthlyUsage,
  createTranscription,
  // ... more functions
} from './src/db/helpers';
```

### Types

```typescript
import {
  User,
  Transcription,
  ApiResponse,
  ERROR_CODES,
} from './src/types';
```

See [INTEGRATION.md](./INTEGRATION.md) for complete API reference.

## 🔄 Integration with Other Tasks

This module (Task 1) provides the database layer for:

- **Task 3** - Authentication middleware
- **Task 4** - Rate limiting
- **Task 5** - Job queue
- **Task 8** - API routes
- **Task 9** - Stripe payments

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql $DATABASE_URL
```

### Prisma Schema Out of Sync

```bash
npm run prisma:generate
```

### Migration Conflicts

```bash
npx prisma migrate status
npx prisma migrate resolve --applied <migration_name>
```

See [prisma/README.md](./prisma/README.md) for more troubleshooting.

## 📝 Code Standards

- **TypeScript** - Strict mode enabled
- **ESLint** - Enforces code quality
- **Prettier** - Consistent formatting
- **Jest** - 80% coverage minimum
- **Comments** - JSDoc for all exports

## 🚢 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use `npm run prisma:migrate:prod` (not dev)
- [ ] Configure connection pooling
- [ ] Set up cron job for monthly usage reset
- [ ] Enable error logging (Sentry, etc.)
- [ ] Configure CORS for production domains
- [ ] Use secure Redis connection
- [ ] Set strong database passwords

### Database Connection Pooling

Add to DATABASE_URL:
```
?connection_limit=10&pool_timeout=60
```

### Monthly Usage Reset Cron

```bash
0 0 1 * * cd /app/backend && node -e "require('./src/db/helpers').resetMonthlyUsage()"
```

## 📞 Support

- **Database Issues**: See [prisma/README.md](./prisma/README.md)
- **Integration**: See [INTEGRATION.md](./INTEGRATION.md)
- **Prisma Docs**: https://www.prisma.io/docs

## 📄 License

MIT

---

**Version:** 1.0.0  
**Last Updated:** 2024-01-15  
**Node Version:** 20.x  
**PostgreSQL Version:** 14.x
