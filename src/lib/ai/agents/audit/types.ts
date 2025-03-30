import { z } from 'zod';

export type ValidationRule = {
  type: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'url' | 'phone';
  min?: number;
  max?: number;
  pattern?: string;
  format?: string;
};

export type FieldRule = {
  field: string;
  type: 'required' | 'optional';
  validation?: ValidationRule;
};

export interface CompletenessConfig {
  enabled: boolean;
  requiredFields: string[];
  optionalFields: string[];
  thresholds: {
    required: number; // 0-1, minimum required field completion rate
    optional: number; // 0-1, minimum optional field completion rate
  };
  rules?: FieldRule[];
}

export interface CompletenessResult {
  status: 'passed' | 'failed' | 'warning';
  score: number;
  metrics: {
    totalFields: number;
    requiredFields: number;
    optionalFields: number;
    completedRequired: number;
    completedOptional: number;
    completionRate: number;
    requiredCompletionRate: number;
    optionalCompletionRate: number;
  };
  issues: Array<{
    field: string;
    type: 'required' | 'optional';
    status: 'missing' | 'invalid' | 'incomplete';
    message: string;
    value?: unknown;
  }>;
  recommendations: string[];
  metadata: {
    timestamp: string;
    processingTime: number;
    dataPoints: number;
  };
}

export const completenessResultSchema = z.object({
  status: z.enum(['passed', 'failed', 'warning']),
  score: z.number().min(0).max(1),
  metrics: z.object({
    totalFields: z.number(),
    requiredFields: z.number(),
    optionalFields: z.number(),
    completedRequired: z.number(),
    completedOptional: z.number(),
    completionRate: z.number().min(0).max(1),
    requiredCompletionRate: z.number().min(0).max(1),
    optionalCompletionRate: z.number().min(0).max(1),
  }),
  issues: z.array(z.object({
    field: z.string(),
    type: z.enum(['required', 'optional']),
    status: z.enum(['missing', 'invalid', 'incomplete']),
    message: z.string(),
    value: z.unknown().optional(),
  })),
  recommendations: z.array(z.string()),
  metadata: z.object({
    timestamp: z.string(),
    processingTime: z.number(),
    dataPoints: z.number(),
  }),
});

export interface AccuracyConfig {
  enabled: boolean;
  rules: {
    field: string;
    type: 'numeric' | 'categorical' | 'text' | 'date' | 'boolean';
    constraints?: {
      min?: number;
      max?: number;
      allowedValues?: string[];
      pattern?: string;
      format?: string;
      customValidation?: (value: unknown) => boolean;
    };
  }[];
  thresholds: {
    numeric: number; // 0-1, default 0.95
    categorical: number; // 0-1, default 0.98
    text: number; // 0-1, default 0.9
    date: number; // 0-1, default 0.95
    boolean: number; // 0-1, default 0.99
  };
}

export interface AccuracyResult {
  status: 'success' | 'warning' | 'error';
  score: number;
  metrics: {
    totalFields: number;
    validFields: number;
    invalidFields: number;
    byType: {
      numeric: {
        total: number;
        valid: number;
        invalid: number;
      };
      categorical: {
        total: number;
        valid: number;
        invalid: number;
      };
      text: {
        total: number;
        valid: number;
        invalid: number;
      };
      date: {
        total: number;
        valid: number;
        invalid: number;
      };
      boolean: {
        total: number;
        valid: number;
        invalid: number;
      };
    };
  };
  issues: {
    field: string;
    type: 'numeric' | 'categorical' | 'text' | 'date' | 'boolean';
    value: unknown;
    expected: string;
    actual: string;
    severity: 'low' | 'medium' | 'high';
  }[];
  recommendations: {
    field: string;
    type: 'numeric' | 'categorical' | 'text' | 'date' | 'boolean';
    message: string;
    priority: 'low' | 'medium' | 'high';
  }[];
  metadata: {
    timestamp: string;
    duration: number;
    version: string;
  };
}

export const accuracyResultSchema = z.object({
  status: z.enum(['success', 'warning', 'error']),
  score: z.number().min(0).max(1),
  metrics: z.object({
    totalFields: z.number(),
    validFields: z.number(),
    invalidFields: z.number(),
    byType: z.object({
      numeric: z.object({
        total: z.number(),
        valid: z.number(),
        invalid: z.number(),
      }),
      categorical: z.object({
        total: z.number(),
        valid: z.number(),
        invalid: z.number(),
      }),
      text: z.object({
        total: z.number(),
        valid: z.number(),
        invalid: z.number(),
      }),
      date: z.object({
        total: z.number(),
        valid: z.number(),
        invalid: z.number(),
      }),
      boolean: z.object({
        total: z.number(),
        valid: z.number(),
        invalid: z.number(),
      }),
    }),
  }),
  issues: z.array(
    z.object({
      field: z.string(),
      type: z.enum(['numeric', 'categorical', 'text', 'date', 'boolean']),
      value: z.unknown(),
      expected: z.string(),
      actual: z.string(),
      severity: z.enum(['low', 'medium', 'high']),
    })
  ),
  recommendations: z.array(
    z.object({
      field: z.string(),
      type: z.enum(['numeric', 'text', 'date', 'boolean']),
      message: z.string(),
      priority: z.enum(['low', 'medium', 'high']),
    })
  ),
  metadata: z.object({
    timestamp: z.string(),
    duration: z.number(),
    version: z.string(),
  }),
});

export interface ConsistencyConfig {
  enabled: boolean;
  rules: {
    field: string;
    type: 'cross-field' | 'business-rule' | 'format' | 'temporal';
    relatedFields?: string[];
    constraints?: {
      relation?: 'equal' | 'greater' | 'less' | 'dependent';
      format?: string;
      pattern?: string;
      timeWindow?: number;
      customValidation?: (value: unknown, relatedValues: Record<string, unknown>) => boolean;
    };
  }[];
  thresholds: {
    crossField: number; // 0-1, default 0.95
    businessRule: number; // 0-1, default 0.98
    format: number; // 0-1, default 0.95
    temporal: number; // 0-1, default 0.9
  };
}

export interface ConsistencyResult {
  status: 'success' | 'warning' | 'error';
  score: number;
  metrics: {
    totalRules: number;
    passedRules: number;
    failedRules: number;
    byType: {
      crossField: {
        total: number;
        passed: number;
        failed: number;
      };
      businessRule: {
        total: number;
        passed: number;
        failed: number;
      };
      format: {
        total: number;
        passed: number;
        failed: number;
      };
      temporal: {
        total: number;
        passed: number;
        failed: number;
      };
    };
  };
  issues: {
    field: string;
    type: 'cross-field' | 'business-rule' | 'format' | 'temporal';
    value: unknown;
    relatedFields?: Record<string, unknown>;
    expected: string;
    actual: string;
    severity: 'low' | 'medium' | 'high';
  }[];
  recommendations: {
    field: string;
    type: 'cross-field' | 'business-rule' | 'format' | 'temporal';
    message: string;
    priority: 'low' | 'medium' | 'high';
  }[];
  metadata: {
    timestamp: string;
    duration: number;
    version: string;
  };
}

export const consistencyResultSchema = z.object({
  status: z.enum(['success', 'warning', 'error']),
  score: z.number().min(0).max(1),
  metrics: z.object({
    totalRules: z.number(),
    passedRules: z.number(),
    failedRules: z.number(),
    byType: z.object({
      crossField: z.object({
        total: z.number(),
        passed: z.number(),
        failed: z.number(),
      }),
      businessRule: z.object({
        total: z.number(),
        passed: z.number(),
        failed: z.number(),
      }),
      format: z.object({
        total: z.number(),
        passed: z.number(),
        failed: z.number(),
      }),
      temporal: z.object({
        total: z.number(),
        passed: z.number(),
        failed: z.number(),
      }),
    }),
  }),
  issues: z.array(
    z.object({
      field: z.string(),
      type: z.enum(['cross-field', 'business-rule', 'format', 'temporal']),
      value: z.unknown(),
      relatedFields: z.record(z.unknown()).optional(),
      expected: z.string(),
      actual: z.string(),
      severity: z.enum(['low', 'medium', 'high']),
    })
  ),
  recommendations: z.array(
    z.object({
      field: z.string(),
      type: z.enum(['cross-field', 'business-rule', 'format', 'temporal']),
      message: z.string(),
      priority: z.enum(['low', 'medium', 'high']),
    })
  ),
  metadata: z.object({
    timestamp: z.string(),
    duration: z.number(),
    version: z.string(),
  }),
});

export interface TimelinessConfig {
  enabled: boolean;
  rules: {
    field: string;
    type: 'update-frequency' | 'data-age' | 'sync-status';
    constraints?: {
      maxAge?: number; // in milliseconds
      minUpdateFrequency?: number; // in milliseconds
      maxUpdateFrequency?: number; // in milliseconds
      syncThreshold?: number; // in milliseconds
      customValidation?: (value: unknown, lastUpdate: Date) => boolean;
    };
  }[];
  thresholds: {
    updateFrequency: number; // 0-1, default 0.95
    dataAge: number; // 0-1, default 0.9
    syncStatus: number; // 0-1, default 0.98
  };
}

export interface TimelinessResult {
  status: 'success' | 'warning' | 'error';
  score: number;
  metrics: {
    totalRules: number;
    passedRules: number;
    failedRules: number;
    byType: {
      updateFrequency: {
        total: number;
        passed: number;
        failed: number;
        averageFrequency: number;
      };
      dataAge: {
        total: number;
        passed: number;
        failed: number;
        averageAge: number;
      };
      syncStatus: {
        total: number;
        passed: number;
        failed: number;
        syncRate: number;
      };
    };
  };
  issues: {
    field: string;
    type: 'update-frequency' | 'data-age' | 'sync-status';
    value: unknown;
    lastUpdate: Date;
    expected: string;
    actual: string;
    severity: 'low' | 'medium' | 'high';
  }[];
  recommendations: {
    field: string;
    type: 'update-frequency' | 'data-age' | 'sync-status';
    message: string;
    priority: 'low' | 'medium' | 'high';
  }[];
  metadata: {
    timestamp: string;
    duration: number;
    version: string;
  };
}

export const timelinessResultSchema = z.object({
  status: z.enum(['success', 'warning', 'error']),
  score: z.number().min(0).max(1),
  metrics: z.object({
    totalRules: z.number(),
    passedRules: z.number(),
    failedRules: z.number(),
    byType: z.object({
      updateFrequency: z.object({
        total: z.number(),
        passed: z.number(),
        failed: z.number(),
        averageFrequency: z.number(),
      }),
      dataAge: z.object({
        total: z.number(),
        passed: z.number(),
        failed: z.number(),
        averageAge: z.number(),
      }),
      syncStatus: z.object({
        total: z.number(),
        passed: z.number(),
        failed: z.number(),
        syncRate: z.number(),
      }),
    }),
  }),
  issues: z.array(
    z.object({
      field: z.string(),
      type: z.enum(['update-frequency', 'data-age', 'sync-status']),
      value: z.unknown(),
      lastUpdate: z.date(),
      expected: z.string(),
      actual: z.string(),
      severity: z.enum(['low', 'medium', 'high']),
    })
  ),
  recommendations: z.array(
    z.object({
      field: z.string(),
      type: z.enum(['update-frequency', 'data-age', 'sync-status']),
      message: z.string(),
      priority: z.enum(['low', 'medium', 'high']),
    })
  ),
  metadata: z.object({
    timestamp: z.string(),
    duration: z.number(),
    version: z.string(),
  }),
});

export interface ContactAuditConfig {
  enabled: boolean;
  completeness: CompletenessConfig;
  accuracy: AccuracyConfig;
  consistency: ConsistencyConfig;
  timeliness: TimelinessConfig;
  rules: {
    field: string;
    type: 'contact-specific';
    constraints?: {
      emailFormat?: boolean;
      phoneFormat?: boolean;
      nameFormat?: boolean;
      addressFormat?: boolean;
      customValidation?: (value: unknown) => boolean;
    };
  }[];
  thresholds: {
    completeness: number; // 0-1, default 0.95
    accuracy: number; // 0-1, default 0.98
    consistency: number; // 0-1, default 0.95
    timeliness: number; // 0-1, default 0.9
    contactSpecific: number; // 0-1, default 0.95
  };
}

export interface ContactAuditResult {
  status: 'success' | 'warning' | 'error';
  score: number;
  metrics: {
    completeness: CompletenessResult['metrics'];
    accuracy: AccuracyResult['metrics'];
    consistency: ConsistencyResult['metrics'];
    timeliness: TimelinessResult['metrics'];
    contactSpecific: {
      totalRules: number;
      passedRules: number;
      failedRules: number;
      byType: {
        emailFormat: { total: number; passed: number; failed: number };
        phoneFormat: { total: number; passed: number; failed: number };
        nameFormat: { total: number; passed: number; failed: number };
        addressFormat: { total: number; passed: number; failed: number };
      };
    };
  };
  issues: Array<
    | CompletenessResult['issues'][0]
    | AccuracyResult['issues'][0]
    | ConsistencyResult['issues'][0]
    | TimelinessResult['issues'][0]
    | {
        field: string;
        type: 'contact-specific';
        value: unknown;
        expected: string;
        actual: string;
        severity: 'low' | 'medium' | 'high';
      }
  >;
  recommendations: Array<
    | CompletenessResult['recommendations'][0]
    | AccuracyResult['recommendations'][0]
    | ConsistencyResult['recommendations'][0]
    | TimelinessResult['recommendations'][0]
    | {
        field: string;
        type: 'contact-specific';
        message: string;
        priority: 'low' | 'medium' | 'high';
      }
  >;
  metadata: {
    timestamp: string;
    duration: number;
    version: string;
  };
}

export const contactAuditResultSchema = z.object({
  status: z.enum(['success', 'warning', 'error']),
  score: z.number().min(0).max(1),
  metrics: z.object({
    completeness: completenessResultSchema.shape.metrics,
    accuracy: accuracyResultSchema.shape.metrics,
    consistency: consistencyResultSchema.shape.metrics,
    timeliness: timelinessResultSchema.shape.metrics,
    contactSpecific: z.object({
      totalRules: z.number(),
      passedRules: z.number(),
      failedRules: z.number(),
      byType: z.object({
        emailFormat: z.object({
          total: z.number(),
          passed: z.number(),
          failed: z.number(),
        }),
        phoneFormat: z.object({
          total: z.number(),
          passed: z.number(),
          failed: z.number(),
        }),
        nameFormat: z.object({
          total: z.number(),
          passed: z.number(),
          failed: z.number(),
        }),
        addressFormat: z.object({
          total: z.number(),
          passed: z.number(),
          failed: z.number(),
        }),
      }),
    }),
  }),
  issues: z.array(
    z.discriminatedUnion('type', [
      z.object({
        field: z.string(),
        type: z.literal('required'),
        status: z.enum(['missing', 'invalid', 'incomplete']),
        message: z.string(),
        value: z.unknown(),
      }),
      z.object({
        field: z.string(),
        type: z.literal('optional'),
        status: z.enum(['missing', 'invalid', 'incomplete']),
        message: z.string(),
        value: z.unknown(),
      }),
      z.object({
        field: z.string(),
        type: z.enum(['numeric', 'categorical', 'text', 'date', 'boolean']),
        value: z.unknown(),
        expected: z.string(),
        actual: z.string(),
        severity: z.enum(['low', 'medium', 'high']),
      }),
      z.object({
        field: z.string(),
        type: z.enum(['cross-field', 'business-rule', 'format', 'temporal']),
        value: z.unknown(),
        relatedFields: z.record(z.unknown()).optional(),
        expected: z.string(),
        actual: z.string(),
        severity: z.enum(['low', 'medium', 'high']),
      }),
      z.object({
        field: z.string(),
        type: z.enum(['update-frequency', 'data-age', 'sync-status']),
        value: z.unknown(),
        lastUpdate: z.date(),
        expected: z.string(),
        actual: z.string(),
        severity: z.enum(['low', 'medium', 'high']),
      }),
      z.object({
        field: z.string(),
        type: z.literal('contact-specific'),
        value: z.unknown(),
        expected: z.string(),
        actual: z.string(),
        severity: z.enum(['low', 'medium', 'high']),
      }),
    ])
  ),
  recommendations: z.array(
    z.discriminatedUnion('type', [
      z.object({
        field: z.string(),
        type: z.literal('required'),
        message: z.string(),
        priority: z.enum(['low', 'medium', 'high']),
      }),
      z.object({
        field: z.string(),
        type: z.literal('optional'),
        message: z.string(),
        priority: z.enum(['low', 'medium', 'high']),
      }),
      z.object({
        field: z.string(),
        type: z.enum(['numeric', 'categorical', 'text', 'date', 'boolean']),
        message: z.string(),
        priority: z.enum(['low', 'medium', 'high']),
      }),
      z.object({
        field: z.string(),
        type: z.enum(['cross-field', 'business-rule', 'format', 'temporal']),
        message: z.string(),
        priority: z.enum(['low', 'medium', 'high']),
      }),
      z.object({
        field: z.string(),
        type: z.enum(['update-frequency', 'data-age', 'sync-status']),
        message: z.string(),
        priority: z.enum(['low', 'medium', 'high']),
      }),
      z.object({
        field: z.string(),
        type: z.literal('contact-specific'),
        message: z.string(),
        priority: z.enum(['low', 'medium', 'high']),
      }),
    ])
  ),
  metadata: z.object({
    timestamp: z.string(),
    duration: z.number(),
    version: z.string(),
  }),
});

export interface CompanyAuditConfig {
  enabled: boolean;
  completeness: CompletenessConfig;
  accuracy: AccuracyConfig;
  consistency: ConsistencyConfig;
  timeliness: TimelinessConfig;
  rules: {
    field: string;
    type: 'company-specific';
    constraints?: {
      companyNameFormat?: boolean;
      industryCodeFormat?: boolean;
      sizeRange?: {
        min?: number;
        max?: number;
      };
      websiteFormat?: boolean;
      customValidation?: (value: unknown) => boolean;
    };
  }[];
  thresholds: {
    completeness: number; // 0-1, default 0.95
    accuracy: number; // 0-1, default 0.98
    consistency: number; // 0-1, default 0.95
    timeliness: number; // 0-1, default 0.9
    companySpecific: number; // 0-1, default 0.95
  };
}

export interface CompanyAuditResult {
  status: 'success' | 'warning' | 'error';
  score: number;
  metrics: {
    completeness: CompletenessResult['metrics'];
    accuracy: AccuracyResult['metrics'];
    consistency: ConsistencyResult['metrics'];
    timeliness: TimelinessResult['metrics'];
    companySpecific: {
      totalRules: number;
      passedRules: number;
      failedRules: number;
      byType: {
        companyNameFormat: { total: number; passed: number; failed: number };
        industryCodeFormat: { total: number; passed: number; failed: number };
        sizeRange: { total: number; passed: number; failed: number };
        websiteFormat: { total: number; passed: number; failed: number };
      };
    };
  };
  issues: Array<
    | CompletenessResult['issues'][0]
    | AccuracyResult['issues'][0]
    | ConsistencyResult['issues'][0]
    | TimelinessResult['issues'][0]
    | {
        field: string;
        type: 'company-specific';
        value: unknown;
        expected: string;
        actual: string;
        severity: 'low' | 'medium' | 'high';
      }
  >;
  recommendations: Array<
    | CompletenessResult['recommendations'][0]
    | AccuracyResult['recommendations'][0]
    | ConsistencyResult['recommendations'][0]
    | TimelinessResult['recommendations'][0]
    | {
        field: string;
        type: 'company-specific';
        message: string;
        priority: 'low' | 'medium' | 'high';
      }
  >;
  metadata: {
    timestamp: string;
    duration: number;
    version: string;
  };
}

export const companyAuditResultSchema = z.object({
  status: z.enum(['success', 'warning', 'error']),
  score: z.number().min(0).max(1),
  metrics: z.object({
    completeness: completenessResultSchema.shape.metrics,
    accuracy: accuracyResultSchema.shape.metrics,
    consistency: consistencyResultSchema.shape.metrics,
    timeliness: timelinessResultSchema.shape.metrics,
    companySpecific: z.object({
      totalRules: z.number(),
      passedRules: z.number(),
      failedRules: z.number(),
      byType: z.object({
        companyNameFormat: z.object({
          total: z.number(),
          passed: z.number(),
          failed: z.number(),
        }),
        industryCodeFormat: z.object({
          total: z.number(),
          passed: z.number(),
          failed: z.number(),
        }),
        sizeRange: z.object({
          total: z.number(),
          passed: z.number(),
          failed: z.number(),
        }),
        websiteFormat: z.object({
          total: z.number(),
          passed: z.number(),
          failed: z.number(),
        }),
      }),
    }),
  }),
  issues: z.array(
    z.discriminatedUnion('type', [
      z.object({
        field: z.string(),
        type: z.literal('required'),
        status: z.enum(['missing', 'invalid', 'incomplete']),
        message: z.string(),
        value: z.unknown(),
      }),
      z.object({
        field: z.string(),
        type: z.literal('optional'),
        status: z.enum(['missing', 'invalid', 'incomplete']),
        message: z.string(),
        value: z.unknown(),
      }),
      z.object({
        field: z.string(),
        type: z.enum(['numeric', 'categorical', 'text', 'date', 'boolean']),
        value: z.unknown(),
        expected: z.string(),
        actual: z.string(),
        severity: z.enum(['low', 'medium', 'high']),
      }),
      z.object({
        field: z.string(),
        type: z.enum(['cross-field', 'business-rule', 'format', 'temporal']),
        value: z.unknown(),
        relatedFields: z.record(z.unknown()).optional(),
        expected: z.string(),
        actual: z.string(),
        severity: z.enum(['low', 'medium', 'high']),
      }),
      z.object({
        field: z.string(),
        type: z.enum(['update-frequency', 'data-age', 'sync-status']),
        value: z.unknown(),
        lastUpdate: z.date(),
        expected: z.string(),
        actual: z.string(),
        severity: z.enum(['low', 'medium', 'high']),
      }),
      z.object({
        field: z.string(),
        type: z.literal('company-specific'),
        value: z.unknown(),
        expected: z.string(),
        actual: z.string(),
        severity: z.enum(['low', 'medium', 'high']),
      }),
    ])
  ),
  recommendations: z.array(
    z.discriminatedUnion('type', [
      z.object({
        field: z.string(),
        type: z.literal('required'),
        message: z.string(),
        priority: z.enum(['low', 'medium', 'high']),
      }),
      z.object({
        field: z.string(),
        type: z.literal('optional'),
        message: z.string(),
        priority: z.enum(['low', 'medium', 'high']),
      }),
      z.object({
        field: z.string(),
        type: z.enum(['numeric', 'categorical', 'text', 'date', 'boolean']),
        message: z.string(),
        priority: z.enum(['low', 'medium', 'high']),
      }),
      z.object({
        field: z.string(),
        type: z.enum(['cross-field', 'business-rule', 'format', 'temporal']),
        message: z.string(),
        priority: z.enum(['low', 'medium', 'high']),
      }),
      z.object({
        field: z.string(),
        type: z.enum(['update-frequency', 'data-age', 'sync-status']),
        message: z.string(),
        priority: z.enum(['low', 'medium', 'high']),
      }),
      z.object({
        field: z.string(),
        type: z.literal('company-specific'),
        message: z.string(),
        priority: z.enum(['low', 'medium', 'high']),
      }),
    ])
  ),
  metadata: z.object({
    timestamp: z.string(),
    duration: z.number(),
    version: z.string(),
  }),
});

export interface DealAuditConfig {
  enabled: boolean;
  completeness: CompletenessConfig;
  accuracy: AccuracyConfig;
  consistency: ConsistencyConfig;
  timeliness: TimelinessConfig;
  rules: {
    field: string;
    type: 'deal-specific';
    constraints?: {
      dealAmount?: {
        min?: number;
        max?: number;
        currency?: string;
      };
      stage?: {
        allowedStages: string[];
        requiredStages?: string[];
      };
      probability?: {
        min?: number;
        max?: number;
        required?: boolean;
      };
      closeDate?: {
        minDate?: Date;
        maxDate?: Date;
        required?: boolean;
      };
      customValidation?: (value: unknown) => boolean;
    };
  }[];
  thresholds: {
    completeness: number; // 0-1, default 0.95
    accuracy: number; // 0-1, default 0.98
    consistency: number; // 0-1, default 0.95
    timeliness: number; // 0-1, default 0.9
    dealSpecific: number; // 0-1, default 0.95
  };
}

export interface DealAuditResult {
  status: 'success' | 'warning' | 'error';
  score: number;
  metrics: {
    completeness: CompletenessResult['metrics'];
    accuracy: AccuracyResult['metrics'];
    consistency: ConsistencyResult['metrics'];
    timeliness: TimelinessResult['metrics'];
    dealSpecific: {
      totalRules: number;
      passedRules: number;
      failedRules: number;
      byType: {
        dealAmount: { total: number; passed: number; failed: number };
        stage: { total: number; passed: number; failed: number };
        probability: { total: number; passed: number; failed: number };
        closeDate: { total: number; passed: number; failed: number };
      };
    };
  };
  issues: Array<
    | CompletenessResult['issues'][0]
    | AccuracyResult['issues'][0]
    | ConsistencyResult['issues'][0]
    | TimelinessResult['issues'][0]
    | {
        field: string;
        type: 'deal-specific';
        value: unknown;
        expected: string;
        actual: string;
        severity: 'low' | 'medium' | 'high';
      }
  >;
  recommendations: Array<
    | CompletenessResult['recommendations'][0]
    | AccuracyResult['recommendations'][0]
    | ConsistencyResult['recommendations'][0]
    | TimelinessResult['recommendations'][0]
    | {
        field: string;
        type: 'deal-specific';
        message: string;
        priority: 'low' | 'medium' | 'high';
      }
  >;
  metadata: {
    timestamp: string;
    duration: number;
    version: string;
  };
}

export const dealAuditResultSchema = z.object({
  status: z.enum(['success', 'warning', 'error']),
  score: z.number().min(0).max(1),
  metrics: z.object({
    completeness: completenessResultSchema.shape.metrics,
    accuracy: accuracyResultSchema.shape.metrics,
    consistency: consistencyResultSchema.shape.metrics,
    timeliness: timelinessResultSchema.shape.metrics,
    dealSpecific: z.object({
      totalRules: z.number(),
      passedRules: z.number(),
      failedRules: z.number(),
      byType: z.object({
        dealAmount: z.object({
          total: z.number(),
          passed: z.number(),
          failed: z.number(),
        }),
        stage: z.object({
          total: z.number(),
          passed: z.number(),
          failed: z.number(),
        }),
        probability: z.object({
          total: z.number(),
          passed: z.number(),
          failed: z.number(),
        }),
        closeDate: z.object({
          total: z.number(),
          passed: z.number(),
          failed: z.number(),
        }),
      }),
    }),
  }),
  issues: z.array(
    z.discriminatedUnion('type', [
      z.object({
        field: z.string(),
        type: z.literal('required'),
        status: z.enum(['missing', 'invalid', 'incomplete']),
        message: z.string(),
        value: z.unknown(),
      }),
      z.object({
        field: z.string(),
        type: z.literal('optional'),
        status: z.enum(['missing', 'invalid', 'incomplete']),
        message: z.string(),
        value: z.unknown(),
      }),
      z.object({
        field: z.string(),
        type: z.enum(['numeric', 'categorical', 'text', 'date', 'boolean']),
        value: z.unknown(),
        expected: z.string(),
        actual: z.string(),
        severity: z.enum(['low', 'medium', 'high']),
      }),
      z.object({
        field: z.string(),
        type: z.enum(['cross-field', 'business-rule', 'format', 'temporal']),
        value: z.unknown(),
        relatedFields: z.record(z.unknown()).optional(),
        expected: z.string(),
        actual: z.string(),
        severity: z.enum(['low', 'medium', 'high']),
      }),
      z.object({
        field: z.string(),
        type: z.enum(['update-frequency', 'data-age', 'sync-status']),
        value: z.unknown(),
        lastUpdate: z.date(),
        expected: z.string(),
        actual: z.string(),
        severity: z.enum(['low', 'medium', 'high']),
      }),
      z.object({
        field: z.string(),
        type: z.literal('deal-specific'),
        value: z.unknown(),
        expected: z.string(),
        actual: z.string(),
        severity: z.enum(['low', 'medium', 'high']),
      }),
    ])
  ),
  recommendations: z.array(
    z.discriminatedUnion('type', [
      z.object({
        field: z.string(),
        type: z.literal('required'),
        message: z.string(),
        priority: z.enum(['low', 'medium', 'high']),
      }),
      z.object({
        field: z.string(),
        type: z.literal('optional'),
        message: z.string(),
        priority: z.enum(['low', 'medium', 'high']),
      }),
      z.object({
        field: z.string(),
        type: z.enum(['numeric', 'categorical', 'text', 'date', 'boolean']),
        message: z.string(),
        priority: z.enum(['low', 'medium', 'high']),
      }),
      z.object({
        field: z.string(),
        type: z.enum(['cross-field', 'business-rule', 'format', 'temporal']),
        message: z.string(),
        priority: z.enum(['low', 'medium', 'high']),
      }),
      z.object({
        field: z.string(),
        type: z.enum(['update-frequency', 'data-age', 'sync-status']),
        message: z.string(),
        priority: z.enum(['low', 'medium', 'high']),
      }),
      z.object({
        field: z.string(),
        type: z.literal('deal-specific'),
        message: z.string(),
        priority: z.enum(['low', 'medium', 'high']),
      }),
    ])
  ),
  metadata: z.object({
    timestamp: z.string(),
    duration: z.number(),
    version: z.string(),
  }),
});

export interface ActivityAuditConfig {
  enabled: boolean;
  completeness: CompletenessConfig;
  accuracy: AccuracyConfig;
  consistency: ConsistencyConfig;
  timeliness: TimelinessConfig;
  rules: {
    field: string;
    type: 'activity-specific';
    constraints?: {
      activityType?: {
        allowedTypes: string[];
        requiredTypes?: string[];
      };
      duration?: {
        min?: number;
        max?: number;
        unit?: 'minutes' | 'hours' | 'days';
      };
      outcome?: {
        allowedOutcomes: string[];
        requiredOutcomes?: string[];
      };
      date?: {
        minDate?: Date;
        maxDate?: Date;
        required?: boolean;
      };
      customValidation?: (value: unknown) => boolean;
    };
  }[];
  thresholds: {
    completeness: number; // 0-1, default 0.95
    accuracy: number; // 0-1, default 0.98
    consistency: number; // 0-1, default 0.95
    timeliness: number; // 0-1, default 0.9
    activitySpecific: number; // 0-1, default 0.95
  };
}

export interface ActivityAuditResult {
  status: 'success' | 'warning' | 'error';
  score: number;
  metrics: {
    completeness: CompletenessResult['metrics'];
    accuracy: AccuracyResult['metrics'];
    consistency: ConsistencyResult['metrics'];
    timeliness: TimelinessResult['metrics'];
    activitySpecific: {
      totalRules: number;
      passedRules: number;
      failedRules: number;
      byType: {
        activityType: { total: number; passed: number; failed: number };
        duration: { total: number; passed: number; failed: number };
        outcome: { total: number; passed: number; failed: number };
        date: { total: number; passed: number; failed: number };
      };
    };
  };
  issues: Array<
    | CompletenessResult['issues'][0]
    | AccuracyResult['issues'][0]
    | ConsistencyResult['issues'][0]
    | TimelinessResult['issues'][0]
    | {
        field: string;
        type: 'activity-specific';
        value: unknown;
        expected: string;
        actual: string;
        severity: 'low' | 'medium' | 'high';
      }
  >;
  recommendations: Array<
    | CompletenessResult['recommendations'][0]
    | AccuracyResult['recommendations'][0]
    | ConsistencyResult['recommendations'][0]
    | TimelinessResult['recommendations'][0]
    | {
        field: string;
        type: 'activity-specific';
        message: string;
        priority: 'low' | 'medium' | 'high';
      }
  >;
  metadata: {
    timestamp: string;
    duration: number;
    version: string;
  };
}

export const activityAuditResultSchema = z.object({
  status: z.enum(['success', 'warning', 'error']),
  score: z.number().min(0).max(1),
  metrics: z.object({
    completeness: completenessResultSchema.shape.metrics,
    accuracy: accuracyResultSchema.shape.metrics,
    consistency: consistencyResultSchema.shape.metrics,
    timeliness: timelinessResultSchema.shape.metrics,
    activitySpecific: z.object({
      totalRules: z.number(),
      passedRules: z.number(),
      failedRules: z.number(),
      byType: z.object({
        activityType: z.object({
          total: z.number(),
          passed: z.number(),
          failed: z.number(),
        }),
        duration: z.object({
          total: z.number(),
          passed: z.number(),
          failed: z.number(),
        }),
        outcome: z.object({
          total: z.number(),
          passed: z.number(),
          failed: z.number(),
        }),
        date: z.object({
          total: z.number(),
          passed: z.number(),
          failed: z.number(),
        }),
      }),
    }),
  }),
  issues: z.array(
    z.discriminatedUnion('type', [
      z.object({
        field: z.string(),
        type: z.literal('required'),
        status: z.enum(['missing', 'invalid', 'incomplete']),
        message: z.string(),
        value: z.unknown(),
      }),
      z.object({
        field: z.string(),
        type: z.literal('optional'),
        status: z.enum(['missing', 'invalid', 'incomplete']),
        message: z.string(),
        value: z.unknown(),
      }),
      z.object({
        field: z.string(),
        type: z.enum(['numeric', 'categorical', 'text', 'date', 'boolean']),
        value: z.unknown(),
        expected: z.string(),
        actual: z.string(),
        severity: z.enum(['low', 'medium', 'high']),
      }),
      z.object({
        field: z.string(),
        type: z.enum(['cross-field', 'business-rule', 'format', 'temporal']),
        value: z.unknown(),
        relatedFields: z.record(z.unknown()).optional(),
        expected: z.string(),
        actual: z.string(),
        severity: z.enum(['low', 'medium', 'high']),
      }),
      z.object({
        field: z.string(),
        type: z.enum(['update-frequency', 'data-age', 'sync-status']),
        value: z.unknown(),
        lastUpdate: z.date(),
        expected: z.string(),
        actual: z.string(),
        severity: z.enum(['low', 'medium', 'high']),
      }),
      z.object({
        field: z.string(),
        type: z.literal('activity-specific'),
        value: z.unknown(),
        expected: z.string(),
        actual: z.string(),
        severity: z.enum(['low', 'medium', 'high']),
      }),
    ])
  ),
  recommendations: z.array(
    z.discriminatedUnion('type', [
      z.object({
        field: z.string(),
        type: z.literal('required'),
        message: z.string(),
        priority: z.enum(['low', 'medium', 'high']),
      }),
      z.object({
        field: z.string(),
        type: z.literal('optional'),
        message: z.string(),
        priority: z.enum(['low', 'medium', 'high']),
      }),
      z.object({
        field: z.string(),
        type: z.enum(['numeric', 'categorical', 'text', 'date', 'boolean']),
        message: z.string(),
        priority: z.enum(['low', 'medium', 'high']),
      }),
      z.object({
        field: z.string(),
        type: z.enum(['cross-field', 'business-rule', 'format', 'temporal']),
        message: z.string(),
        priority: z.enum(['low', 'medium', 'high']),
      }),
      z.object({
        field: z.string(),
        type: z.enum(['update-frequency', 'data-age', 'sync-status']),
        message: z.string(),
        priority: z.enum(['low', 'medium', 'high']),
      }),
      z.object({
        field: z.string(),
        type: z.literal('activity-specific'),
        message: z.string(),
        priority: z.enum(['low', 'medium', 'high']),
      }),
    ])
  ),
  metadata: z.object({
    timestamp: z.string(),
    duration: z.number(),
    version: z.string(),
  }),
}); 