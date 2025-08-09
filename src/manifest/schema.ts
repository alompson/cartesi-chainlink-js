import { z } from 'zod';

// Network configuration schema
export const NetworkSchema = z.object({
  mode: z.enum(['local', 'chainlink']),
  chainId: z.number().int().positive()
});

// Deployment configuration schema
export const DeploymentSchema = z.object({
  template: z.string().optional(),
  artifact: z.string().optional(),
  constructorArgs: z.array(z.any()).optional().default([])
}).refine(
  (data) => {
    // Exactly one of template or artifact should be provided
    const hasTemplate = data.template !== undefined;
    const hasArtifact = data.artifact !== undefined;
    return hasTemplate !== hasArtifact; // XOR: exactly one should be true
  },
  {
    message: "Exactly one of 'template' or 'artifact' must be provided",
    path: ['deployment']
  }
);

// Registration configuration schema
export const RegistrationSchema = z.object({
  name: z.string().min(1, "Name cannot be empty"),
  upkeepContract: z.union([
    z.literal('auto'),
    z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid Ethereum address or 'auto'")
  ]),
  gasLimit: z.number().int().min(21000, "Gas limit must be at least 21000"),
  triggerType: z.enum(['custom', 'log']),
  initialFunds: z.string().optional(),
  // Log-specific fields
  logEmitterAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  logEventSignature: z.string().optional(),
  logTopicFilters: z.array(z.string().nullable()).length(3).optional()
}).superRefine((data, ctx) => {
  // When triggerType is 'log', require log-specific fields
  if (data.triggerType === 'log') {
    if (!data.logEmitterAddress) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "logEmitterAddress is required when triggerType is 'log'",
        path: ['logEmitterAddress']
      });
    }
    if (!data.logEventSignature) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "logEventSignature is required when triggerType is 'log'",
        path: ['logEventSignature']
      });
    }
  }
});

// Main manifest schema
export const ManifestSchema = z.object({
  version: z.string().default('1'),
  network: NetworkSchema,
  deployment: DeploymentSchema.optional(),
  registration: RegistrationSchema
}).superRefine((data, ctx) => {
  // If upkeepContract is 'auto', deployment must be provided
  if (data.registration.upkeepContract === 'auto' && !data.deployment) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "deployment is required when upkeepContract is 'auto'",
      path: ['deployment']
    });
  }
  
  // If mode is 'chainlink', initialFunds is required
  if (data.network.mode === 'chainlink' && !data.registration.initialFunds) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "initialFunds is required when network mode is 'chainlink'",
      path: ['registration', 'initialFunds']
    });
  }
});

// Export TypeScript types
export type Network = z.infer<typeof NetworkSchema>;
export type Deployment = z.infer<typeof DeploymentSchema>;
export type Registration = z.infer<typeof RegistrationSchema>;
export type Manifest = z.infer<typeof ManifestSchema>;

// State file schema for tracking deployments
export const StateSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  upkeepId: z.string(),
  network: NetworkSchema,
  name: z.string(),
  timestamp: z.string()
});

export type State = z.infer<typeof StateSchema>; 