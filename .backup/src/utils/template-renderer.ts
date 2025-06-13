import * as Handlebars from 'handlebars';

export class TemplateRenderer {
  private static templates = new Map<string, HandlebarsTemplateDelegate>();

  static compile(templateId: string, templateContent: string): void {
    const compiled = Handlebars.compile(templateContent);
    this.templates.set(templateId, compiled);
  }

  static render(templateId: string, variables: Record<string, any>): string {
    const template = this.templates.get(templateId);

    if (!template) {
      throw new Error(`Template "${templateId}" not found`);
    }

    return template(variables);
  }

  static registerHelper(name: string, helper: Handlebars.HelperDelegate): void {
    Handlebars.registerHelper(name, helper);
  }

  static registerDefaultHelpers(): void {
    // Date formatting helper
    Handlebars.registerHelper('formatDate', (date: Date, format: string) => {
      if (!date) return '';

      // Simple date formatting (in real implementation, use a library like date-fns)
      const d = new Date(date);
      switch (format) {
        case 'short':
          return d.toLocaleDateString();
        case 'long':
          return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        case 'time':
          return d.toLocaleTimeString();
        default:
          return d.toISOString();
      }
    });

    // Currency formatting helper
    Handlebars.registerHelper('formatCurrency', (amount: number, currency = 'USD') => {
      if (typeof amount !== 'number') return amount;

      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(amount);
    });

    // Conditional helper
    Handlebars.registerHelper('ifEquals', function(this:any,arg1, arg2, options) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });

    // Array join helper
    Handlebars.registerHelper('join', (array: any[], separator = ', ') => {
      if (!Array.isArray(array)) return '';
      return array.join(separator);
    });
  }
}
