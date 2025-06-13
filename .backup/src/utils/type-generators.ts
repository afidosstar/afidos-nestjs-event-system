import { EventTypesConfig, FieldSchema } from '../config/event-config.interface';
import * as fs from 'fs';
import * as path from 'path';

export class TypeGenerator {
  /**
   * Generate TypeScript type definitions from event configuration
   */
  static generateEventTypes(
      config: EventTypesConfig,
      outputPath: string,
      options: GenerateOptions = {}
  ): void {
    const content = this.createTypeScriptContent(config, options);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, content, 'utf8');

    // Generate barrel export
    if (options.generateBarrel !== false) {
      const indexPath = path.join(outputDir, 'index.ts');
      const indexContent = `// Auto-generated event types barrel export
export * from './${path.basename(outputPath, '.ts')}';
`;
      fs.writeFileSync(indexPath, indexContent, 'utf8');
    }
  }

  /**
   * Generate JSON Schema from event configuration
   */
  static generateJsonSchema(config: EventTypesConfig, outputPath: string): void {
    const schema = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: 'Event Types Schema',
      type: 'object',
      definitions: {} as Record<string, any>
    };

    for (const [eventName, eventConfig] of Object.entries(config)) {
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

  /**
   * Generate OpenAPI Schema from event configuration
   */
  static generateOpenApiSchema(config: EventTypesConfig, outputPath: string): void {
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

    for (const [eventName, eventConfig] of Object.entries(config)) {
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

  private static createTypeScriptContent(
      config: EventTypesConfig,
      options: GenerateOptions
  ): string {
    const timestamp = new Date().toISOString();

    let content = `// Auto-generated event types
// Generated on: ${timestamp}
// Do not modify this file manually

`;

    // Add imports
    content += `import type { EmitOptions, EventEmissionResult, NotificationResult } from '@afidos/nestjs-event-notifications';
`;

    if (options.includeValidation) {
      content += `import { IsString, IsNumber, IsBoolean, IsDate, IsObject, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
`;
    }

    content += '\n';

    // Generate individual event payload interfaces
    const eventTypeNames: string[] = [];

    for (const [eventName, eventConfig] of Object.entries(config)) {
      const interfaceName = this.eventNameToInterfaceName(eventName);
      eventTypeNames.push(eventName);

      content += `/**
 * ${eventConfig.description}
 * @channels ${eventConfig.channels.join(', ')}
 * @processing ${eventConfig.defaultProcessing}
 * @priority ${eventConfig.priority || 'normal'}
 */
export interface ${interfaceName}Payload {
`;

      // Generate properties with JSDoc comments
      for (const [fieldName, fieldSchema] of Object.entries(eventConfig.schema)) {
        const optional = fieldSchema.required ? '' : '?';
        const tsType = this.mapSchemaTypeToTsType(fieldSchema.type);

        if (fieldSchema.description) {
          content += `  /** ${fieldSchema.description} */\n`;
        }

        content += `  ${fieldName}${optional}: ${tsType};\n`;
      }

      content += '}\n\n';

      // Generate validation class if requested
      if (options.includeValidation) {
        content += this.generateValidationClass(interfaceName, eventConfig.schema);
        content += '\n';
      }

      // Generate example if requested
      if (options.includeExamples) {
        content += this.generateExample(interfaceName, eventConfig.schema);
        content += '\n';
      }
    }

    // Generate core types
    content += this.generateCoreTypes(eventTypeNames);

    // Generate utility functions
    content += this.generateUtilityFunctions(config, eventTypeNames);

    return content;
  }

  private static generateCoreTypes(eventTypeNames: string[]): string {
    const eventNamesUnion = eventTypeNames.map(name => `'${name}'`).join(' | ');

    return `/**
 * Union type of all available event type names
 */
export type EventTypeNames = ${eventNamesUnion};

/**
 * Mapping of event type names to their payload interfaces
 */
export interface EventPayloadMapping {
${eventTypeNames.map(name => {
      const interfaceName = this.eventNameToInterfaceName(name);
      return `  '${name}': ${interfaceName}Payload;`;
    }).join('\n')}
}

/**
 * Type-safe event emitter interface
 */
export interface TypeSafeEventEmitter {
  emit<T extends EventTypeNames>(
    eventType: T,
    payload: EventPayloadMapping[T],
    options?: EmitOptions
  ): Promise<EventEmissionResult>;

  emitSync<T extends EventTypeNames>(
    eventType: T,
    payload: EventPayloadMapping[T]
  ): Promise<EventEmissionResult>;

  emitAsync<T extends EventTypeNames>(
    eventType: T,
    payload: EventPayloadMapping[T],
    delay?: number
  ): Promise<EventEmissionResult>;
}

/**
 * Utility type to extract payload type for a specific event
 */
export type PayloadFor<T extends EventTypeNames> = EventPayloadMapping[T];

/**
 * Utility type to check if an event type exists
 */
export type IsValidEventType<T extends string> = T extends EventTypeNames ? true : false;

`;
  }

  private static generateUtilityFunctions(
      config: EventTypesConfig,
      eventTypeNames: string[]
  ): string {
    return `/**
 * Configuration object for event types (read-only)
 */
export const EVENT_TYPE_CONFIG = ${JSON.stringify(config, null, 2)} as const;

/**
 * Array of all available event type names
 */
export const ALL_EVENT_TYPES: readonly EventTypeNames[] = [
${eventTypeNames.map(name => `  '${name}'`).join(',\n')}
] as const;

/**
 * Get channels for a specific event type
 */
export function getEventChannels<T extends EventTypeNames>(eventType: T): readonly string[] {
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

/**
 * Get all event types that support a specific channel
 */
export function getEventTypesForChannel(channel: string): EventTypeNames[] {
  return ALL_EVENT_TYPES.filter(eventType => 
    supportsChannel(eventType, channel)
  );
}

/**
 * Validate if a payload matches the expected schema structure
 */
export function validatePayloadStructure<T extends EventTypeNames>(
  eventType: T,
  payload: any
): payload is EventPayloadMapping[T] {
  const schema = getEventSchema(eventType);
  
  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    if (fieldSchema.required && !(fieldName in payload)) {
      return false;
    }
    
    if (fieldName in payload) {
      const value = payload[fieldName];
      if (!this.validateFieldType(value, fieldSchema.type)) {
        return false;
      }
    }
  }
  
  return true;
}

private static validateFieldType(value: any, expectedType: string): boolean {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'date':
      return value instanceof Date || !isNaN(Date.parse(value));
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'array':
      return Array.isArray(value);
    default:
      return true;
  }
}
`;
  }

  private static generateValidationClass(interfaceName: string, schema: Record<string, FieldSchema>): string {
    let content = `/**
 * Validation class for ${interfaceName}Payload
 */
export class ${interfaceName}ValidationDto {
`;

    for (const [fieldName, fieldSchema] of Object.entries(schema)) {
      const decorators = this.generateValidationDecorators(fieldSchema);
      content += decorators.map(d => `  ${d}\n`).join('');

      if (fieldSchema.description) {
        content += `  /** ${fieldSchema.description} */\n`;
      }

      const optional = fieldSchema.required ? '' : '?';
      const tsType = this.mapSchemaTypeToTsType(fieldSchema.type);
      content += `  ${fieldName}${optional}: ${tsType};\n\n`;
    }

    content += '}\n';
    return content;
  }

  private static generateValidationDecorators(fieldSchema: FieldSchema): string[] {
    const decorators: string[] = [];

    if (!fieldSchema.required) {
      decorators.push('@IsOptional()');
    }

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

    return decorators;
  }

  private static generateExample(interfaceName: string, schema: Record<string, FieldSchema>): string {
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

  private static generateExampleValue(fieldSchema: FieldSchema): any {
    if (fieldSchema.default !== undefined) {
      return fieldSchema.default;
    }

    switch (fieldSchema.type) {
      case 'string':
        return 'example-string';
      case 'number':
        return 123;
      case 'boolean':
        return true;
      case 'date':
        return new Date().toISOString();
      case 'object':
        return { key: 'value' };
      case 'array':
        return ['item1', 'item2'];
      default:
        return null;
    }
  }

  private static eventNameToInterfaceName(eventName: string): string {
    return eventName
        .split('.')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
  }

  private static mapSchemaTypeToTsType(schemaType: string): string {
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

  private static convertSchemaToJsonSchema(schema: Record<string, FieldSchema>): Record<string, any> {
    const properties: Record<string, any> = {};

    for (const [fieldName, fieldSchema] of Object.entries(schema)) {
      properties[fieldName] = {
        type: this.mapSchemaTypeToJsonSchema(fieldSchema.type),
        description: fieldSchema.description || `${fieldName} field`
      };

      if (fieldSchema.default !== undefined) {
        properties[fieldName].default = fieldSchema.default;
      }

      // Add validation constraints
      if (fieldSchema.validation) {
        Object.assign(properties[fieldName], fieldSchema.validation);
      }
    }

    return properties;
  }

  private static convertSchemaToOpenApi(schema: Record<string, FieldSchema>): Record<string, any> {
    const properties: Record<string, any> = {};

    for (const [fieldName, fieldSchema] of Object.entries(schema)) {
      properties[fieldName] = {
        type: this.mapSchemaTypeToJsonSchema(fieldSchema.type),
        description: fieldSchema.description || `${fieldName} field`
      };

      if (fieldSchema.type === 'date') {
        properties[fieldName].format = 'date-time';
      }

      if (fieldSchema.default !== undefined) {
        properties[fieldName].default = fieldSchema.default;
      }

      // Add OpenAPI-specific validation
      if (fieldSchema.validation) {
        if (fieldSchema.validation.minLength) properties[fieldName].minLength = fieldSchema.validation.minLength;
        if (fieldSchema.validation.maxLength) properties[fieldName].maxLength = fieldSchema.validation.maxLength;
        if (fieldSchema.validation.minimum) properties[fieldName].minimum = fieldSchema.validation.minimum;
        if (fieldSchema.validation.maximum) properties[fieldName].maximum = fieldSchema.validation.maximum;
        if (fieldSchema.validation.pattern) properties[fieldName].pattern = fieldSchema.validation.pattern;
        if (fieldSchema.validation.enum) properties[fieldName].enum = fieldSchema.validation.enum;
      }
    }

    return properties;
  }

  private static mapSchemaTypeToJsonSchema(schemaType: string): string {
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

  /**
   * Generate TypeScript declaration file (.d.ts)
   */
  static generateDeclarationFile(config: EventTypesConfig, outputPath: string): void {
    const content = this.createDeclarationContent(config);
    fs.writeFileSync(outputPath, content, 'utf8');
  }

  private static createDeclarationContent(config: EventTypesConfig): string {
    const eventNames = Object.keys(config);
    const interfaceNames = eventNames.map(name => this.eventNameToInterfaceName(name));

    return `// Auto-generated TypeScript declarations
declare module '@afidos/nestjs-event-notifications' {
  // Event type names
  export type EventTypeNames = ${eventNames.map(name => `'${name}'`).join(' | ')};
  
  // Payload interfaces
${interfaceNames.map((interfaceName, index) => {
      const eventName = eventNames[index];
      const eventConfig = config[eventName];
      const properties = Object.entries(eventConfig.schema).map(([fieldName, fieldSchema]) => {
        const optional = fieldSchema.required ? '' : '?';
        const tsType = this.mapSchemaTypeToTsType(fieldSchema.type);
        return `    ${fieldName}${optional}: ${tsType};`;
      }).join('\n');

      return `  export interface ${interfaceName}Payload {
${properties}
  }`;
    }).join('\n\n')}

  // Payload mapping
  export interface EventPayloadMapping {
${eventNames.map((eventName, index) => {
      const interfaceName = interfaceNames[index];
      return `    '${eventName}': ${interfaceName}Payload;`;
    }).join('\n')}
  }

  // Type-safe event emitter
  export interface TypeSafeEventEmitter {
    emit<T extends EventTypeNames>(
      eventType: T,
      payload: EventPayloadMapping[T],
      options?: import('@afidos/nestjs-event-notifications').EmitOptions
    ): Promise<import('@afidos/nestjs-event-notifications').EventEmissionResult>;
  }
}
`;
  }

  /**
   * Generate documentation markdown file
   */
  static generateDocumentation(config: EventTypesConfig, outputPath: string): void {
    const content = this.createDocumentationContent(config);
    fs.writeFileSync(outputPath, content, 'utf8');
  }

  private static createDocumentationContent(config: EventTypesConfig): string {
    const timestamp = new Date().toLocaleString();

    let content = `# Event Types Documentation

*Auto-generated on ${timestamp}*

## Overview

This document describes all available event types in the notification system.

## Event Types

`;

    for (const [eventName, eventConfig] of Object.entries(config)) {
      const interfaceName = this.eventNameToInterfaceName(eventName);

      content += `### ${eventName}

**Description:** ${eventConfig.description}

**Configuration:**
- **Processing Mode:** ${eventConfig.defaultProcessing}
- **Wait for Result:** ${eventConfig.waitForResult ? 'Yes' : 'No'}
- **Priority:** ${eventConfig.priority || 'normal'}
- **Channels:** ${eventConfig.channels.join(', ')}

**Payload Schema:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
`;

      for (const [fieldName, fieldSchema] of Object.entries(eventConfig.schema)) {
        const required = fieldSchema.required ? '✅' : '❌';
        const description = fieldSchema.description || '-';
        content += `| \`${fieldName}\` | \`${fieldSchema.type}\` | ${required} | ${description} |\n`;
      }

      content += `
**TypeScript Interface:**
\`\`\`typescript
interface ${interfaceName}Payload {
`;

      for (const [fieldName, fieldSchema] of Object.entries(eventConfig.schema)) {
        const optional = fieldSchema.required ? '' : '?';
        const tsType = this.mapSchemaTypeToTsType(fieldSchema.type);
        content += `  ${fieldName}${optional}: ${tsType};\n`;
      }

      content += `}
\`\`\`

**Usage Example:**
\`\`\`typescript
await eventEmitter.emit('${eventName}', {
`;

      for (const [fieldName, fieldSchema] of Object.entries(eventConfig.schema)) {
        const exampleValue = this.generateExampleValue(fieldSchema);
        const valueStr = typeof exampleValue === 'string' ? `'${exampleValue}'` : JSON.stringify(exampleValue);
        content += `  ${fieldName}: ${valueStr},\n`;
      }

      content += `});
\`\`\`

---

`;
    }

    // Add summary statistics
    const totalEvents = Object.keys(config).length;
    const channels = new Set(Object.values(config).flatMap(e => e.channels));
    const asyncEvents = Object.values(config).filter(e => e.defaultProcessing === 'async').length;
    const syncEvents = Object.values(config).filter(e => e.defaultProcessing === 'sync').length;

    content += `## Summary

- **Total Event Types:** ${totalEvents}
- **Available Channels:** ${Array.from(channels).join(', ')}
- **Async Events:** ${asyncEvents}
- **Sync Events:** ${syncEvents}

## Type Safety

All event types are fully type-safe when using TypeScript. Import the generated types:

\`\`\`typescript
import type { EventTypeNames, EventPayloadMapping, TypeSafeEventEmitter } from './types/events';

// Type-safe event emission
const eventEmitter: TypeSafeEventEmitter = // ... get from DI

await eventEmitter.emit('user.created', {
  // TypeScript will validate this payload structure
});
\`\`\`
`;

    return content;
  }
}

/**
 * Options for type generation
 */
export interface GenerateOptions {
  includeExamples?: boolean;
  includeValidation?: boolean;
  includeDocumentation?: boolean;
  generateBarrel?: boolean;
  outputFormat?: 'typescript' | 'json-schema' | 'openapi';
}

/**
 * Result of type generation
 */
export interface GenerateResult {
  outputPath: string;
  eventCount: number;
  interfaceCount: number;
  generatedFiles: string[];
}

/**
 * Generate all type-related files
 */
export function generateAllTypes(
    config: EventTypesConfig,
    baseOutputPath: string,
    options: GenerateOptions = {}
): GenerateResult {
  const generatedFiles: string[] = [];
  const eventCount = Object.keys(config).length;

  // Generate main TypeScript types
  const tsPath = baseOutputPath.endsWith('.ts') ? baseOutputPath : `${baseOutputPath}/events.ts`;
  TypeGenerator.generateEventTypes(config, tsPath, options);
  generatedFiles.push(tsPath);

  // Generate declaration file
  if (options.outputFormat !== 'json-schema' && options.outputFormat !== 'openapi') {
    const dtsPath = tsPath.replace('.ts', '.d.ts');
    TypeGenerator.generateDeclarationFile(config, dtsPath);
    generatedFiles.push(dtsPath);
  }

  // Generate JSON Schema if requested
  if (options.outputFormat === 'json-schema') {
    const jsonPath = tsPath.replace('.ts', '.schema.json');
    TypeGenerator.generateJsonSchema(config, jsonPath);
    generatedFiles.push(jsonPath);
  }

  // Generate OpenAPI Schema if requested
  if (options.outputFormat === 'openapi') {
    const openApiPath = tsPath.replace('.ts', '.openapi.json');
    TypeGenerator.generateOpenApiSchema(config, openApiPath);
    generatedFiles.push(openApiPath);
  }

  // Generate documentation if requested
  if (options.includeDocumentation) {
    const docsPath = tsPath.replace('.ts', '.md');
    TypeGenerator.generateDocumentation(config, docsPath);
    generatedFiles.push(docsPath);
  }

  return {
    outputPath: tsPath,
    eventCount,
    interfaceCount: eventCount,
    generatedFiles
  };
}
