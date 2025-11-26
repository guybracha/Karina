import { useState, useCallback } from 'react';

/**
 * Form validation hook with real-time validation
 * @param {object} initialValues - Initial form values
 * @param {object} rules - Validation rules for each field
 * @returns {object} Form validation state and helpers
 */
export function useFormValidation(initialValues = {}, rules = {}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validate = useCallback((fieldName, value) => {
    const rule = rules[fieldName];
    if (!rule) return null;

    // Required validation
    if (rule.required) {
      if (!value || (typeof value === 'string' && !value.trim())) {
        return rule.requiredMessage || 'שדה חובה';
      }
    }

    // Min length validation
    if (rule.minLength && value) {
      if (value.length < rule.minLength) {
        return rule.minLengthMessage || `נדרשים לפחות ${rule.minLength} תווים`;
      }
    }

    // Max length validation
    if (rule.maxLength && value) {
      if (value.length > rule.maxLength) {
        return rule.maxLengthMessage || `מקסימום ${rule.maxLength} תווים`;
      }
    }

    // Pattern validation (regex)
    if (rule.pattern && value) {
      if (!rule.pattern.test(value)) {
        return rule.patternMessage || 'פורמט לא תקין';
      }
    }

    // Custom validation function
    if (rule.validate && typeof rule.validate === 'function') {
      const customError = rule.validate(value, values);
      if (customError) return customError;
    }

    return null;
  }, [rules, values]);

  const handleChange = useCallback((fieldName, value) => {
    setValues(prev => ({ ...prev, [fieldName]: value }));

    // Validate on change if field was touched
    if (touched[fieldName]) {
      const error = validate(fieldName, value);
      setErrors(prev => ({ ...prev, [fieldName]: error }));
    }
  }, [touched, validate]);

  const handleBlur = useCallback((fieldName) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    const error = validate(fieldName, values[fieldName]);
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  }, [validate, values]);

  const validateAll = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    Object.keys(rules).forEach(fieldName => {
      const error = validate(fieldName, values[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    setTouched(Object.keys(rules).reduce((acc, key) => ({ ...acc, [key]: true }), {}));

    return isValid;
  }, [rules, validate, values]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const setFieldValue = useCallback((fieldName, value) => {
    setValues(prev => ({ ...prev, [fieldName]: value }));
  }, []);

  const setFieldError = useCallback((fieldName, error) => {
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  }, []);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    reset,
    setFieldValue,
    setFieldError,
    isValid: Object.keys(errors).every(key => !errors[key])
  };
}

// Validation rule builders
export const Rules = {
  required: (message = 'שדה חובה') => ({
    required: true,
    requiredMessage: message
  }),

  email: (message = 'כתובת אימייל לא תקינה') => ({
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    patternMessage: message
  }),

  phone: (message = 'מספר טלפון לא תקין') => ({
    pattern: /^0\d{1,2}-?\d{7}$/,
    patternMessage: message
  }),

  minLength: (length, message) => ({
    minLength: length,
    minLengthMessage: message || `נדרשים לפחות ${length} תווים`
  }),

  maxLength: (length, message) => ({
    maxLength: length,
    maxLengthMessage: message || `מקסימום ${length} תווים`
  }),

  custom: (validateFn, message) => ({
    validate: validateFn,
    customMessage: message
  })
};
