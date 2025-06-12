# CHANGELOG.md

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-15

### Added
- 🎉 Initial release of @afidos/nestjs-event-notifications
- ✨ Type-safe event emission with auto-generated TypeScript types
- 📨 Multi-channel notification support (Email, SMS, Push, Webhook, External Services)
- ⚡ Hybrid processing modes (sync/async with result waiting)
- 🔄 Configurable auto-retry with exponential/linear backoff
- 📊 Built-in monitoring and metrics with Prometheus integration
- 🎯 Highly configurable and extensible architecture
- 📦 Plug-and-play installation with minimal setup
- 🏗️ Modular architecture with separate API and Worker modes
- 🔧 Configuration-based event type definitions
- 📡 REST API for management and monitoring
- 🚀 CLI commands for maintenance and testing
- 🧪 Comprehensive test suite with >90% coverage
- 📚 Complete documentation with examples

### Core Features
- **Event Emitter Service**: Type-safe event emission with validation
- **Notification Processor**: Multi-channel notification processing
- **Queue Management**: Bull/BullMQ integration with Redis
- **Database Integration**: TypeORM entities with PostgreSQL support
- **Provider System**: Extensible notification providers
- **Circuit Breaker**: Fault tolerance for external services
- **Rate Limiting**: Redis-based rate limiting per recipient
- **Template System**: Dynamic template rendering with Handlebars
- **Monitoring**: Real-time metrics and health checks
- **Security**: Input validation and secure credential handling

### Supported Providers
- **Email**: SMTP provider with nodemailer
- **SMS**: Twilio integration
- **Push**: Firebase Cloud Messaging
- **Webhook**: HTTP webhook delivery
- **External Service**: Generic external API integration

### Management Features
- **Event Types Management**: CRUD operations for event configurations
- **Recipients Management**: Dynamic recipient configuration
- **Notification Logs**: Detailed logging with correlation IDs
- **Statistics**: Real-time analytics and reporting
- **Health Checks**: Comprehensive system health monitoring
- **Testing**: Built-in provider testing and validation

### CLI Commands
- `sync-event-types`: Synchronize configuration with database
- `generate-event-types`: Auto-generate TypeScript definitions
- `test-notification-config`: Validate provider configurations
- `migrate-notifications`: Database migration utilities

### Documentation
- Complete README with quick start guide
- Migration guide from v0.x
- Deployment guide with Docker/Kubernetes examples
- Troubleshooting guide with common issues
- API documentation with OpenAPI specs
- Examples for basic and advanced usage

## [Unreleased]

### Planned Features
- 🌐 WebSocket real-time notifications
- 📱 Mobile push notification improvements
- 🔐 Enhanced security with encryption at rest
- 📈 Advanced analytics and reporting
- 🎨 Web UI for management dashboard
- 🔌 Plugin system for custom providers
- 📋 Template editor with preview
- 🌍 Multi-tenancy support
- 🔄 Event sourcing capabilities
- 📊 Grafana dashboard templates

---

# CONTRIBUTING.md

# Contributing to @afidos/nestjs-event-notifications

We love your input! We want to make contributing to this project as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

### Development Setup

```bash
# Clone your fork
git clone https://github.com/yourusername/nestjs-event-notifications.git
cd nestjs-event-notifications

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Start development dependencies
docker-compose up -d postgres redis

# Run tests
npm test

# Start development server
npm run start:dev
```

### Project Structure

```
src/
├── config/           # Configuration interfaces
├── decorators/       # Custom decorators
├── dto/             # Data transfer objects
├── entities/        # TypeORM entities
├── controllers/     # REST controllers
├── services/        # Business logic services
├── providers/       # Notification providers
├── processors/      # Queue processors
├── commands/        # CLI commands
├── utils/           # Utility functions
└── module/          # NestJS modules

tests/
├── unit/            # Unit tests
├── integration/     # Integration tests
└── e2e/            # End-to-end tests

examples/
├── basic-usage/     # Basic implementation example
├── advanced-configuration/ # Advanced setup example
└── custom-providers/ # Custom provider examples

docs/
├── installation.md  # Installation guide
├── configuration.md # Configuration reference
├── usage.md        # Usage examples
└── extending.md    # Extension guide
```

## Code Style

We use ESLint and Prettier for code formatting. Please ensure your code follows our style guide:

```bash
# Check linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Coding Standards

- Use TypeScript strict mode
- Follow NestJS conventions and patterns
- Write meaningful variable and function names
- Add JSDoc comments for public APIs
- Use dependency injection properly
- Handle errors gracefully
- Write tests for new features

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to our CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files

Examples:
```
feat(providers): add Slack notification provider
fix(queue): resolve memory leak in job processing
docs(readme): update installation instructions
test(services): add unit tests for event emitter
```

## Testing Guidelines

### Unit Tests

- Test individual functions and methods
- Mock external dependencies
- Focus on business logic
- Aim for >90% code coverage

```typescript
// Example unit test
describe('EventEmitterService', () => {
  let service: EventEmitterService;
  let mockQueue: jest.Mocked<Queue>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EventEmitterService,
        {
          provide: getQueueToken('notifications'),
          useValue: createMockQueue(),
        },
      ],
    }).compile();

    service = module.get<EventEmitterService>(EventEmitterService);
    mockQueue = module.get(getQueueToken('notifications'));
  });

  it('should emit async event successfully', async () => {
    // Test implementation
  });
});
```

### Integration Tests

- Test component interactions
- Use test database
- Test realistic scenarios

```typescript
// Example integration test
describe('Notification Processing Integration', () => {
  let app: INestApplication;
  let eventEmitter: EventEmitterService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    eventEmitter = app.get<EventEmitterService>(EventEmitterService);
  });

  it('should process end-to-end notification flow', async () => {
    // Test implementation
  });
});
```

### E2E Tests

- Test complete user workflows
- Use realistic data
- Test API endpoints

```typescript
// Example E2E test
describe('Notifications API (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/notifications/emit (POST)', () => {
    return request(app.getHttpServer())
      .post('/notifications/emit')
      .send({
        eventType: 'test.event',
        payload: { userId: 1, message: 'test' },
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.eventId).toBeDefined();
      });
  });
});
```

## Adding New Features

### Adding a New Notification Provider

1. **Create Provider Class**
```typescript
// src/providers/slack/slack.provider.ts
@Injectable()
export class SlackProvider implements NotificationProvider {
  readonly name = 'slack';
  readonly channel = 'chat' as NotificationChannel;

  async send(payload: any, recipient: RecipientConfig): Promise<NotificationResult> {
    // Implementation
  }

  validateConfig(config: any): boolean {
    // Validation logic
  }

  async healthCheck(): Promise<boolean> {
    // Health check logic
  }
}
```

2. **Add Configuration Interface**
```typescript
// src/providers/slack/slack-config.interface.ts
export interface SlackConfig {
  webhookUrl: string;
  botToken: string;
  defaultChannel?: string;
}
```

3. **Register Provider**
```typescript
// src/module/event-notifications.module.ts
// Add provider registration logic
```

4. **Write Tests**
```typescript
// src/providers/slack/slack.provider.spec.ts
describe('SlackProvider', () => {
  // Unit tests
});
```

5. **Update Documentation**
```markdown
# Add to README.md
### Slack Provider
Configure Slack notifications:
```

### Adding New CLI Commands

1. **Create Command Class**
```typescript
// src/commands/new-command.command.ts
@Injectable()
@Command({
  name: 'new-command',
  description: 'Description of the new command',
})
export class NewCommand extends CommandRunner {
  async run(passedParams: string[], options: Record<string, any>): Promise<void> {
    // Command implementation
  }
}
```

2. **Register Command**
```typescript
// src/commands/index.ts
export * from './new-command.command';
```

3. **Add Tests**
```typescript
// src/commands/new-command.command.spec.ts
describe('NewCommand', () => {
  // Tests
});
```

## Bug Reports

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/afidos/nestjs-event-notifications/issues/new).

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

### Bug Report Template

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Configure the module with '...'
2. Emit event '....'
3. Check notification logs
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. Ubuntu 20.04]
 - Node.js: [e.g. 18.17.0]
 - NestJS: [e.g. 10.0.0]
 - Package Version: [e.g. 1.0.0]

**Additional context**
Add any other context about the problem here.
```

## Feature Requests

We welcome feature requests! Please:

1. Check if the feature already exists
2. Check if someone has already requested it
3. If not, create a new issue with the `enhancement` label

### Feature Request Template

```markdown
**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is.

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.
```

## Documentation

### Writing Documentation

- Use clear, concise language
- Include code examples
- Test all code examples
- Update relevant sections when making changes

### Documentation Structure

- **README.md**: Overview and quick start
- **docs/**: Detailed documentation
- **examples/**: Working examples
- **API.md**: API reference (auto-generated)

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Run full test suite
4. Build package: `npm run build`
5. Create release PR
6. Merge to main
7. Create GitHub release
8. Publish to npm: `npm publish`

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

Examples of behavior that contributes to creating a positive environment include:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

### Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by contacting the project team at conduct@afidos.com.

## Questions?

Don't hesitate to ask questions! You can:

- Open an issue with the `question` label
- Start a discussion in GitHub Discussions
- Contact the maintainers directly

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

Thank you for contributing to @afidos/nestjs-event-notifications! 🎉