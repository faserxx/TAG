/**
 * FormModal - HTML-based modal form overlay for editing entities
 * Provides a proper form experience with editable fields, validation, and navigation
 */

export interface FormModalField {
  name: string;
  label: string;
  value: string | string[];
  type: 'text' | 'textarea' | 'dialogue';
  helpText?: string;
  required?: boolean;
  maxLength?: number;
  validator?: (value: string | string[]) => string | null;
}

export interface FormModalConfig {
  title: string;
  fields: FormModalField[];
}

export interface FormModalResult {
  cancelled: boolean;
  values: Map<string, string | string[]>;
  changedFields: string[];
}

export class FormModal {
  private modal: HTMLElement | null = null;
  private overlay: HTMLElement | null = null;
  private resolve?: (result: FormModalResult) => void;
  private originalValues: Map<string, string | string[]> = new Map();

  constructor(private config: FormModalConfig) {
    // Store original values
    this.config.fields.forEach(field => {
      this.originalValues.set(field.name, field.value);
    });
  }

  /**
   * Show the modal and return a promise that resolves when user submits or cancels
   */
  async show(): Promise<FormModalResult> {
    return new Promise<FormModalResult>((resolve) => {
      this.resolve = resolve;
      this.createModal();
      this.attachEventListeners();
      this.focusFirstField();
    });
  }

  /**
   * Create the modal HTML structure
   */
  private createModal(): void {
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'form-modal-overlay';
    
    // Create modal container
    this.modal = document.createElement('div');
    this.modal.className = 'form-modal';
    
    // Build modal content
    this.modal.innerHTML = `
      <div class="form-modal-header">
        <h2 class="form-modal-title">${this.escapeHtml(this.config.title)}</h2>
        <button class="form-modal-close" type="button" aria-label="Close">&times;</button>
      </div>
      <form class="form-modal-form" id="entity-form">
        <div class="form-modal-body">
          ${this.renderFields()}
        </div>
        <div class="form-modal-footer">
          <button type="button" class="form-modal-button form-modal-button-cancel">Cancel</button>
          <button type="submit" class="form-modal-button form-modal-button-submit">Save Changes</button>
        </div>
      </form>
    `;
    
    this.overlay.appendChild(this.modal);
    document.body.appendChild(this.overlay);
    
    // Trigger animation
    requestAnimationFrame(() => {
      this.overlay?.classList.add('form-modal-overlay-visible');
      this.modal?.classList.add('form-modal-visible');
    });
  }

  /**
   * Render form fields
   */
  private renderFields(): string {
    return this.config.fields.map((field) => {
      const fieldId = `field-${field.name}`;
      const isRequired = field.required ? '<span class="form-field-required">*</span>' : '';
      const helpText = field.helpText ? `<div class="form-field-help">${this.escapeHtml(field.helpText)}</div>` : '';
      
      let inputHtml = '';
      
      if (field.type === 'textarea' || field.type === 'dialogue') {
        const value = Array.isArray(field.value) ? field.value.join('\n') : field.value;
        const rows = field.type === 'dialogue' ? 8 : 5;
        inputHtml = `
          <textarea 
            id="${fieldId}" 
            name="${field.name}" 
            class="form-field-input form-field-textarea"
            rows="${rows}"
            ${field.required ? 'required' : ''}
            ${field.maxLength ? `maxlength="${field.maxLength}"` : ''}
            placeholder="Enter ${field.label.toLowerCase()}..."
          >${this.escapeHtml(value)}</textarea>
          ${field.maxLength ? `<div class="form-field-counter"><span class="char-count">0</span> / ${field.maxLength}</div>` : ''}
        `;
      } else {
        const value = Array.isArray(field.value) ? field.value[0] : field.value;
        inputHtml = `
          <input 
            type="text" 
            id="${fieldId}" 
            name="${field.name}" 
            class="form-field-input"
            value="${this.escapeHtml(value)}"
            ${field.required ? 'required' : ''}
            ${field.maxLength ? `maxlength="${field.maxLength}"` : ''}
            placeholder="Enter ${field.label.toLowerCase()}..."
          />
          ${field.maxLength ? `<div class="form-field-counter"><span class="char-count">0</span> / ${field.maxLength}</div>` : ''}
        `;
      }
      
      return `
        <div class="form-field" data-field-name="${field.name}">
          <label class="form-field-label" for="${fieldId}">
            ${this.escapeHtml(field.label)}${isRequired}
          </label>
          ${helpText}
          ${inputHtml}
          <div class="form-field-error" style="display: none;"></div>
        </div>
      `;
    }).join('');
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (!this.modal || !this.overlay) return;
    
    // Close button
    const closeBtn = this.modal.querySelector('.form-modal-close');
    closeBtn?.addEventListener('click', () => this.handleCancel());
    
    // Cancel button
    const cancelBtn = this.modal.querySelector('.form-modal-button-cancel');
    cancelBtn?.addEventListener('click', () => this.handleCancel());
    
    // Form submission
    const form = this.modal.querySelector('form');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
    
    // Overlay click (close on click outside)
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.handleCancel();
      }
    });
    
    // Escape key
    document.addEventListener('keydown', this.handleKeyDown);
    
    // Character counters
    this.config.fields.forEach(field => {
      if (field.maxLength) {
        const input = this.modal?.querySelector(`[name="${field.name}"]`) as HTMLInputElement | HTMLTextAreaElement;
        if (input) {
          this.updateCharCounter(input, field.maxLength);
          input.addEventListener('input', () => this.updateCharCounter(input, field.maxLength!));
        }
      }
    });
    
    // Real-time validation
    this.config.fields.forEach(field => {
      const input = this.modal?.querySelector(`[name="${field.name}"]`) as HTMLInputElement | HTMLTextAreaElement;
      if (input && field.validator) {
        input.addEventListener('blur', () => this.validateField(field, input));
      }
    });
  }

  /**
   * Handle keyboard shortcuts
   */
  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      this.handleCancel();
    }
  };

  /**
   * Update character counter
   */
  private updateCharCounter(input: HTMLInputElement | HTMLTextAreaElement, maxLength: number): void {
    const fieldContainer = input.closest('.form-field');
    const counter = fieldContainer?.querySelector('.char-count');
    if (counter) {
      const length = input.value.length;
      counter.textContent = length.toString();
      
      // Add warning class if near limit
      const counterContainer = counter.parentElement;
      if (length > maxLength * 0.9) {
        counterContainer?.classList.add('form-field-counter-warning');
      } else {
        counterContainer?.classList.remove('form-field-counter-warning');
      }
    }
  }

  /**
   * Validate a single field
   */
  private validateField(field: FormModalField, input: HTMLInputElement | HTMLTextAreaElement): boolean {
    const fieldContainer = input.closest('.form-field');
    const errorDiv = fieldContainer?.querySelector('.form-field-error') as HTMLElement;
    
    if (!errorDiv) return true;
    
    let value: string | string[] = input.value;
    
    // Convert to array for dialogue fields
    if (field.type === 'dialogue') {
      value = input.value.split('\n').filter(line => line.trim() !== '');
    }
    
    // Check required
    if (field.required) {
      if (typeof value === 'string' && value.trim() === '') {
        this.showFieldError(fieldContainer as HTMLElement, `${field.label} is required`);
        return false;
      }
      if (Array.isArray(value) && value.length === 0) {
        this.showFieldError(fieldContainer as HTMLElement, `${field.label} is required`);
        return false;
      }
    }
    
    // Custom validator
    if (field.validator) {
      const error = field.validator(value);
      if (error) {
        this.showFieldError(fieldContainer as HTMLElement, error);
        return false;
      }
    }
    
    // Clear error
    this.hideFieldError(fieldContainer as HTMLElement);
    return true;
  }

  /**
   * Show field error
   */
  private showFieldError(fieldContainer: HTMLElement, message: string): void {
    const errorDiv = fieldContainer.querySelector('.form-field-error') as HTMLElement;
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
      fieldContainer.classList.add('form-field-error-visible');
    }
  }

  /**
   * Hide field error
   */
  private hideFieldError(fieldContainer: HTMLElement): void {
    const errorDiv = fieldContainer.querySelector('.form-field-error') as HTMLElement;
    if (errorDiv) {
      errorDiv.style.display = 'none';
      fieldContainer.classList.remove('form-field-error-visible');
    }
  }

  /**
   * Handle form submission
   */
  private handleSubmit(): void {
    if (!this.modal) return;
    
    // Validate all fields
    let isValid = true;
    const values = new Map<string, string | string[]>();
    
    for (const field of this.config.fields) {
      const input = this.modal.querySelector(`[name="${field.name}"]`) as HTMLInputElement | HTMLTextAreaElement;
      if (!input) continue;
      
      if (!this.validateField(field, input)) {
        isValid = false;
        continue;
      }
      
      // Get value
      let value: string | string[] = input.value;
      if (field.type === 'dialogue') {
        value = input.value.split('\n').filter(line => line.trim() !== '');
      }
      
      values.set(field.name, value);
    }
    
    if (!isValid) {
      // Focus first error field
      const firstError = this.modal.querySelector('.form-field-error-visible input, .form-field-error-visible textarea') as HTMLElement;
      firstError?.focus();
      return;
    }
    
    // Determine changed fields
    const changedFields: string[] = [];
    for (const [name, newValue] of values) {
      const oldValue = this.originalValues.get(name);
      if (this.hasValueChanged(oldValue, newValue)) {
        changedFields.push(name);
      }
    }
    
    // Close and resolve
    this.close();
    this.resolve?.({
      cancelled: false,
      values,
      changedFields
    });
  }

  /**
   * Handle cancel
   */
  private handleCancel(): void {
    this.close();
    this.resolve?.({
      cancelled: true,
      values: new Map(),
      changedFields: []
    });
  }

  /**
   * Close the modal
   */
  private close(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    
    // Animate out
    this.overlay?.classList.remove('form-modal-overlay-visible');
    this.modal?.classList.remove('form-modal-visible');
    
    // Remove after animation
    setTimeout(() => {
      this.overlay?.remove();
      this.modal = null;
      this.overlay = null;
    }, 300);
  }

  /**
   * Focus first field
   */
  private focusFirstField(): void {
    setTimeout(() => {
      const firstInput = this.modal?.querySelector('.form-field-input') as HTMLElement;
      firstInput?.focus();
    }, 100);
  }

  /**
   * Check if value changed
   */
  private hasValueChanged(oldValue: string | string[] | undefined, newValue: string | string[]): boolean {
    if (oldValue === undefined) return true;
    
    if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      if (oldValue.length !== newValue.length) return true;
      return !oldValue.every((val, idx) => val === newValue[idx]);
    }
    
    if (Array.isArray(oldValue) || Array.isArray(newValue)) {
      return true;
    }
    
    return oldValue !== newValue;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
