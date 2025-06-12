import { Injectable, Logger } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import { Inject } from '@nestjs/common';
import { TypeGenerator } from '../utils/type-generators';
import { EventNotificationsConfig } from '../config/notification-config.interface';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
@Command({
    name: 'generate-event-types',
    description: 'Generate TypeScript type definitions from event configuration',
})
export class GenerateEventTypesCommand extends CommandRunner {
    private readonly logger = new Logger(GenerateEventTypesCommand.name);

    constructor(
        @Inject('EVENT_NOTIFICATIONS_CONFIG')
        private config: EventNotificationsConfig,
    ) {
        super();
    }

    async run(passedParams: string[], options: Record<string, any>): Promise<void> {
        const outputPath = options.output || './types/events.ts';
        const format = options.format || 'typescript';
        const includeExamples = options.examples || false;
        const includeValidation = options.validation || false;

        this.logger.log('🔧 Generating TypeScript event types...');
        this.logger.log(`📁 Output: ${outputPath}`);
        this.logger.log(`📄 Format: ${format}`);

        try {
            // Ensure output directory exists
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
                this.logger.log(`📂 Created directory: ${outputDir}`);
            }

            // Check if file exists and ask for confirmation
            if (fs.existsSync(outputPath) && !options.force) {
                this.logger.warn(`⚠️  File ${outputPath} already exists. Use --force to overwrite.`);
                return;
            }

            // Generate types based on format
            switch (format) {
                case 'typescript':
                    await this.generateTypeScriptTypes(outputPath, includeExamples, includeValidation);
                    break;
                case 'json-schema':
                    await this.generateJsonSchema(outputPath);
                    break;
                case 'openapi':
                    TypeGenerator.generateOpenApiSchema(this.config.eventTypes,outputPath)
                    await this.generateOpenApiSchema(outputPath);
                    break;
                default:
                    throw new Error(`Unsupported format: ${format}`);
            }

            this.logger.log('✅ Event types generated successfully!');
            this.logger.log(`📄 Generated file: ${outputPath}`);

            // Show statistics
            const eventCount = Object.keys(this.config.eventTypes).length;
            const channelCount = new Set(
                Object.values(this.config.eventTypes).flatMap(e => e.channels)
            ).size;

            this.logger.log(`📊 Statistics:`);
            this.logger.log(`   📨 Event types: ${eventCount}`);
            this.logger.log(`   📡 Channels: ${channelCount}`);

        } catch (error: any) {
            this.logger.error('❌ Failed to generate event types:', error.message);
            if (options.verbose) {
                this.logger.error(error.stack);
            }
            process.exit(1);
        }
    }

    private async generateTypeScriptTypes(
        outputPath: string,
        includeExamples: boolean,
        includeValidation: boolean
    ): Promise<void> {
        this.logger.log('🔨 Generating TypeScript definitions...');

        const content = this.createTypeScriptContent(includeExamples, includeValidation);

        fs.writeFileSync(outputPath, content, 'utf8');

        // Also generate a barrel export file
        const indexPath = path.join(path.dirname(outputPath), 'index.ts');
        const indexContent = `// Auto-generated event types barrel export
export * from './${path.basename(outputPath, '.ts')}';
`;
        fs.writeFileSync(indexPath, indexContent, 'utf8');
        this.logger.log(`📄 Generated barrel export: ${indexPath}`);
    }

    private createTypeScriptContent(includeExamples: boolean, includeValidation: boolean): string {
        const { eventTypes } = this.config;
        const timestamp = new Date().toISOString();

        let content = `// Auto-generated event types
// Generated on: ${timestamp}
// Do not modify this file manually - regenerate using: npm run generate-event-types

`;

        // Add imports
        content += `import { EmitOptions, EventEmissionResult, NotificationResult } from '@afidos/nestjs-event-notifications';
`;

        if (includeValidation) {
            content += `import { IsString, IsNumber, IsBoolean, IsDate, IsObject, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
`;
        }

        content += '\n';

        // Generate individual event payload interfaces
        const eventTypeNames: string[] = [];

        for (const [eventName, eventConfig] of Object.entries(eventTypes)) {
            const interfaceName = this.eventNameToInterfaceName(eventName);
            eventTypeNames.push(eventName);

            content += `/**
 * ${eventConfig.description}
 * Channels: ${eventConfig.channels.join(', ')}
 * Processing: ${eventConfig.defaultProcessing}
 * Priority: ${eventConfig.priority || 'normal'}
 */
export interface ${interfaceName}Payload {
`;

            // Generate properties
            for (const [fieldName, fieldSchema] of Object.entries(eventConfig.schema)) {
                const optional = fieldSchema.required ? '' : '?';
                const tsType = this.mapSchemaTypeToTsType(fieldSchema.type);
                const comment = fieldSchema.validation ? ` // ${JSON.stringify(fieldSchema.validation)}` : '';

                content += `  ${fieldName}${optional}: ${tsType};${comment}\n`;
            }

            content += '}\n\n';

            // Generate validation class if requested
            if (includeValidation) {
                content += this.generateValidationClass(interfaceName, eventConfig.schema);
                content += '\n';
            }

            // Generate example if requested
            if (includeExamples) {
                content += this.generateExample(interfaceName, eventConfig.schema);
                content += '\n';
            }
        }

        // Generate union type for all event names
        const eventNamesUnion = eventTypeNames.map(name => `'${name}'`).join(' | ');
        content += `/**
 * Union type of all available event type names
 */
export type EventTypeNames = ${eventNamesUnion};

`;

        // Generate payload mapping interface
        content += `/**
 * Mapping of event type names to their payload interfaces
 */
export interface EventPayloadMapping {
`;

        for (const eventName of eventTypeNames) {
            const interfaceName = this.eventNameToInterfaceName(eventName);
            content += `  '${eventName}': ${interfaceName}Payload;\n`;
        }

        content += '}\n\n';

        // Generate type-safe event emitter interface
        content += `/**
 * Type-safe event emitter interface
 * Use this type to get full TypeScript support for event emission
 */
export interface TypeSafeEventEmitter {
  /**
   * Emit an event with type-safe payload validation
   */
  emit<T extends EventTypeNames>(
    eventType: T,
    payload: EventPayloadMapping[T],
    options?: EmitOptions
  ): Promise<EventEmissionResult>;

  /**
   * Emit an event synchronously and wait for results
   */
  emitSync<T extends EventTypeNames>(
    eventType: T,
    payload: EventPayloadMapping[T]
  ): Promise<EventEmissionResult>;

  /**
   * Emit an event asynchronously (fire and forget)
   */
  emitAsync<T extends EventTypeNames>(
    eventType: T,
    payload: EventPayloadMapping[T],
    delay?: number
  ): Promise<EventEmissionResult>;
}

`;

        // Generate utility types
        content += `/**
 * Utility type to extract payload type for a specific event
 */
export type PayloadFor<T extends EventTypeNames> = EventPayloadMapping[T];

/**
 * Utility type to check if an event type exists
 */
export type IsValidEventType<T extends string> = T extends EventTypeNames ? true : false;

/**
 * Configuration object for event types (read-only)
 */
export const EVENT_TYPE_CONFIG = ${JSON.stringify(eventTypes, null, 2)} as const;

/**
 * Array of all available event type names
 */
export const ALL_EVENT_TYPES: EventTypeNames[] = [
${eventTypeNames.map(name => `  '${name}'`).join(',\n')}
];

/**
 * Get channels for a specific event type
 */
export function getEventChannels<T extends EventTypeNames>(eventType: T): string[] {
  return EVENT_TYPE_CONFIG[eventType].channels;
}

/**
 * Get schema for a specific event type
 */
export function getEventSchema<T extends EventTypeNames>(eventType: T) {
  return EVENT_TYPE_CONFIG[eventType].schema;
}

/**
 * Check if an event type supports a specific channel
 */
export function supportsChannel<T extends EventTypeNames>(
  eventType: T, 
  channel: string
): boolean {
  return EVENT_TYPE_CONFIG[eventType].channels.includes(channel as any);
}
`;

        return content;
    }

    private generateValidationClass(interfaceName: string, schema: Record<string, any>): string {
        let content = `/**
 * Validation class for ${interfaceName}Payload
 */
export class ${interfaceName}ValidationDto {
`;

        for (const [fieldName, fieldSchema] of Object.entries(schema)) {
            const decorators = this.generateValidationDecorators(fieldSchema);
            content += decorators.map(d => `  ${d}\n`).join('');

            const optional = fieldSchema.required ? '' : '?';
            const tsType = this.mapSchemaTypeToTsType(fieldSchema.type);
            content += `  ${fieldName}${optional}: ${tsType};\n\n`;
        }

        content += '}\n';
        return content;
    }

    private generateValidationDecorators(fieldSchema: any): string[] {
        const decorators: string[] = [];

        switch (fieldSchema.type) {
            case 'string':
                decorators.push('@IsString()');
                break;
            case 'number':
                decorators.push('@IsNumber()');
                break;
            case 'boolean':
                decorators.push('@IsBoolean()');
                break;
            case 'date':
                decorators.push('@IsDate()');
                decorators.push('@Type(() => Date)');
                break;
            case 'object':
                decorators.push('@IsObject()');
                break;
            case 'array':
                decorators.push('@IsArray()');
                break;
        }

        if (!fieldSchema.required) {
            decorators.unshift('@IsOptional()');
        }

        return decorators;
    }

    private generateExample(interfaceName: string, schema: Record<string, any>): string {
        const exampleData: Record<string, any> = {};

        for (const [fieldName, fieldSchema] of Object.entries(schema)) {
            exampleData[fieldName] = this.generateExampleValue(fieldSchema);
        }

        return `/**
 * Example payload for ${interfaceName}
 */
export const ${interfaceName}Example: ${interfaceName}Payload = ${JSON.stringify(exampleData, null, 2)};
`;
    }

    private generateExampleValue(fieldSchema: any): any {
        switch (fieldSchema.type) {
            case 'string':
                return fieldSchema.default || 'example-string';
            case 'number':
                return fieldSchema.default || 123;
            case 'boolean':
                return fieldSchema.default || true;
            case 'date':
                return new Date().toISOString();
            case 'object':
                return fieldSchema.default || { key: 'value' };
            case 'array':
                return fieldSchema.default || ['item1', 'item2'];
            default:
                return null;
        }
    }

    private async generateJsonSchema(outputPath: string): Promise<void> {
        this.logger.log('🔨 Generating JSON Schema...');

        const schema = {
            $schema: 'http://json-schema.org/draft-07/schema#',
            title: 'Event Types Schema',
            type: 'object',
            properties: {},
            definitions: {} as Record<string, any>
        };

        for (const [eventName, eventConfig] of Object.entries(this.config.eventTypes)) {
            schema.definitions[eventName] = {
                type: 'object',
                description: eventConfig.description,
                properties: this.convertSchemaToJsonSchema(eventConfig.schema),
                required: Object.entries(eventConfig.schema)
                    .filter(([, field]) => field.required)
                    .map(([name]) => name),
                additionalProperties: false
            };
        }

        fs.writeFileSync(outputPath, JSON.stringify(schema, null, 2), 'utf8');
    }

    private async generateOpenApiSchema(outputPath: string): Promise<void> {
        this.logger.log('🔨 Generating OpenAPI Schema...');

        const openApiSchema = {
            openapi: '3.0.0',
            info: {
                title: 'Event Notifications API',
                version: '1.0.0',
                description: 'Auto-generated OpenAPI schema for event types'
            },
            components: {
                schemas: {} as Record<string, any>
            }
        };

        for (const [eventName, eventConfig] of Object.entries(this.config.eventTypes)) {
            const schemaName = this.eventNameToInterfaceName(eventName) + 'Payload';

            openApiSchema.components.schemas[schemaName] = {
                type: 'object',
                description: eventConfig.description,
                properties: this.convertSchemaToOpenApi(eventConfig.schema),
                required: Object.entries(eventConfig.schema)
                    .filter(([, field]) => field.required)
                    .map(([name]) => name)
            };
        }

        fs.writeFileSync(outputPath, JSON.stringify(openApiSchema, null, 2), 'utf8');
    }

    private convertSchemaToJsonSchema(schema: Record<string, any>): Record<string, any> {
        const properties: Record<string, any> = {};

        for (const [fieldName, fieldSchema] of Object.entries(schema)) {
            properties[fieldName] = {
                type: this.mapSchemaTypeToJsonSchema(fieldSchema.type),
                description: fieldSchema.description || `${fieldName} field`
            };

            if (fieldSchema.default !== undefined) {
                properties[fieldName].default = fieldSchema.default;
            }
        }

        return properties;
    }

    private convertSchemaToOpenApi(schema: Record<string, any>): Record<string, any> {
        const properties: Record<string, any> = {};

        for (const [fieldName, fieldSchema] of Object.entries(schema)) {
            properties[fieldName] = {
                type: this.mapSchemaTypeToJsonSchema(fieldSchema.type),
                description: fieldSchema.description || `${fieldName} field`
            };

            if (fieldSchema.type === 'date') {
                properties[fieldName].format = 'date-time';
            }
        }

        return properties;
    }

    private eventNameToInterfaceName(eventName: string): string {
        return eventName
            .split('.')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join('');
    }

    private mapSchemaTypeToTsType(schemaType: string): string {
        switch (schemaType) {
            case 'string': return 'string';
            case 'number': return 'number';
            case 'boolean': return 'boolean';
            case 'date': return 'Date';
            case 'object': return 'Record<string, any>';
            case 'array': return 'any[]';
            default: return 'any';
        }
    }

    private mapSchemaTypeToJsonSchema(schemaType: string): string {
        switch (schemaType) {
            case 'string': return 'string';
            case 'number': return 'number';
            case 'boolean': return 'boolean';
            case 'date': return 'string';
            case 'object': return 'object';
            case 'array': return 'array';
            default: return 'string';
        }
    }

    @Option({
        flags: '-o, --output <path>',
        description: 'Output file path for generated types (default: ./types/events.ts)',
    })
    parseOutput(val: string): string {
        return val;
    }

    @Option({
        flags: '-f, --format <format>',
        description: 'Output format: typescript, json-schema, openapi (default: typescript)',
    })
    parseFormat(val: string): string {
        return val;
    }

    @Option({
        flags: '--examples',
        description: 'Include example data in generated types',
    })
    parseExamples(): boolean {
        return true;
    }

    @Option({
        flags: '--validation',
        description: 'Generate validation classes with decorators',
    })
    parseValidation(): boolean {
        return true;
    }

    @Option({
        flags: '--force',
        description: 'Overwrite existing files without confirmation',
    })
    parseForce(): boolean {
        return true;
    }

    @Option({
        flags: '-v, --verbose',
        description: 'Show detailed error information',
    })
    parseVerbose(): boolean {
        return true;
    }
}
