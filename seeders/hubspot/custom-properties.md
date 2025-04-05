# HubSpot Custom Properties for Neuco

This document outlines the custom properties used for Neuco's HubSpot integration, particularly focused on time-based data tracking for our time-travel functionality.

## Overview

Neuco's time-travel functionality requires storing time-based information for each object in HubSpot. To support this, we've created a set of custom properties that track effective dates, stage transitions, and probabilities.

## Property Group

All custom properties are organized under the `neuco_testing` property group, which is automatically created by our setup scripts.

## Common Properties (All Object Types)

| Property Name | Display Name | Type | Description |
|--------------|--------------|------|------------|
| `neuco_effective_date` | Neuco Effective Date | DateTime | The simulated effective date for this record, used for time-travel testing |

## Deal-Specific Properties

| Property Name | Display Name | Type | Description |
|--------------|--------------|------|------------|
| `neuco_stage_probability` | Neuco Stage Probability | Number | The probability percentage associated with this deal stage |
| `neuco_stage_entered_date` | Neuco Stage Entered Date | DateTime | The date when the deal entered its current stage |
| `neuco_stage_exited_date` | Neuco Stage Exited Date | DateTime | The date when the deal exited its previous stage |

## Setup Process

The custom properties are automatically created by the `setup-properties.ts` script, which:

1. Checks if the property group exists, and creates it if it doesn't
2. Checks if each property exists, and creates it if it doesn't

This ensures that all necessary properties are available before attempting to upload data to HubSpot.

## Using the Properties

When working with the Neuco time-travel feature:

1. The `neuco_effective_date` is the primary property used for filtering records by point-in-time
2. For deals, the stage transition dates and probabilities provide additional context for how deals progressed

## Adding New Custom Properties

To add new custom properties:

1. Update the `PROPERTY_DEFINITIONS` object in `setup-properties.ts`
2. Add the new property name to the appropriate section of `setupProperties()` function
3. Run the setup script to create the new properties in HubSpot

## Date Format Handling

When working with these custom date properties, be aware of the format differences:

- HubSpot API expects timestamps as milliseconds since epoch (as strings)
- Our internal format uses ISO 8601 strings (`YYYY-MM-DDTHH:mm:ss.sssZ`)

The data generators and uploaders handle this conversion automatically.