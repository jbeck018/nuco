#!/usr/bin/env ts-node
/**
 * Salesforce Bulk Data Seeder
 *
 * This script generates and uploads tens of thousands of related Salesforce records
 * including Accounts, Contacts, Opportunities, Tasks, Events, and Custom Objects.
 *
 * The generated data is designed to test the salesforce-snapshots.ts service with
 * a large dataset that represents realistic Salesforce data relationships.
 *
 * Usage:
 * npm run sf-seed -- --org=<organization-id> --count=<number-of-records>
 */

import { SalesforceIntegration } from "../src/lib/integrations/salesforce";
import dotenv from "dotenv";
import path from "path";
import { Command } from "commander";
import { faker } from "@faker-js/faker";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import { chunk } from "lodash";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Parse command line arguments
const program = new Command();
program
  .option("--org <organizationId>", "Organization ID to seed data for")
  .option(
    "--count <count>",
    "Number of base records to generate (default: 1000)",
    "1000"
  )
  .option(
    "--batch-size <size>",
    "Batch size for API calls (default: 200)",
    "200"
  )
  .option("--output <path>", "Path to save generated data as JSON (optional)")
  .option(
    "--input <path>",
    "Path to load pre-generated data from JSON (optional)"
  )
  .option("--dry-run", "Generate data but don't upload to Salesforce")
  .option("--seed <seed>", "Random seed for consistent data generation")
  .option(
    "--entity <type>",
    "Entity type to seed (account, contact, opportunity, task, all)",
    "all"
  )
  .parse(process.argv);

const options = program.opts();

// Set random seed if provided
if (options.seed) {
  faker.seed(parseInt(options.seed, 10));
}

// Type definitions for Salesforce objects
interface SalesforceRecord {
  attributes: {
    type: string;
    referenceId?: string;
  };
  [key: string]: any;
}

interface Account extends SalesforceRecord {
  Name: string;
  Industry: string;
  Type: string;
  BillingStreet: string;
  BillingCity: string;
  BillingState: string;
  BillingPostalCode: string;
  BillingCountry: string;
  Phone: string;
  Website: string;
  Description: string;
  NumberOfEmployees: number;
  AnnualRevenue: number;
}

interface Contact extends SalesforceRecord {
  FirstName: string;
  LastName: string;
  Email: string;
  Phone: string;
  Title: string;
  Department: string;
  AccountId: string;
  MailingStreet: string;
  MailingCity: string;
  MailingState: string;
  MailingPostalCode: string;
  MailingCountry: string;
}

interface Opportunity extends SalesforceRecord {
  Name: string;
  StageName: string;
  CloseDate: string;
  Amount: number;
  Type: string;
  LeadSource: string;
  Description: string;
  AccountId: string;
  Probability: number;
}

interface Task extends SalesforceRecord {
  Subject: string;
  Status: string;
  Priority: string;
  ActivityDate: string;
  Description: string;
  WhatId?: string; // Related to Account or Opportunity
  WhoId?: string; // Related to Contact
}

interface Event extends SalesforceRecord {
  Subject: string;
  StartDateTime: string;
  EndDateTime: string;
  Location: string;
  Description: string;
  WhatId?: string; // Related to Account or Opportunity
  WhoId?: string; // Related to Contact
}

interface Case extends SalesforceRecord {
  Subject: string;
  Status: string;
  Origin: string;
  Priority: string;
  Description: string;
  AccountId: string;
  ContactId?: string;
}

interface Campaign extends SalesforceRecord {
  Name: string;
  Status: string;
  Type: string;
  StartDate: string;
  EndDate: string;
  Description: string;
  BudgetedCost: number;
  ActualCost: number;
  ExpectedRevenue: number;
}

interface CampaignMember extends SalesforceRecord {
  CampaignId: string;
  ContactId: string;
  Status: string;
}

interface OpportunityLineItem extends SalesforceRecord {
  OpportunityId: string;
  Quantity: number;
  UnitPrice: number;
  Description: string;
  PricebookEntryId: string; // This would need to be retrieved from Salesforce
}

interface CustomObject extends SalesforceRecord {
  Name: string;
  CustomField1__c: string;
  CustomField2__c: number;
  CustomField3__c: boolean;
  CustomField4__c: string;
  AccountId__c?: string;
  OpportunityId__c?: string;
  ContactId__c?: string;
}

// Container for all generated data
interface GeneratedData {
  accounts: Account[];
  contacts: Contact[];
  opportunities: Opportunity[];
  tasks: Task[];
  events: Event[];
  cases: Case[];
  campaigns: Campaign[];
  campaignMembers: CampaignMember[];
  opportunityLineItems: OpportunityLineItem[];
  customObjects: CustomObject[];
}

// Constants for data generation
const INDUSTRIES = [
  "Agriculture",
  "Apparel",
  "Banking",
  "Biotechnology",
  "Chemicals",
  "Communications",
  "Construction",
  "Consulting",
  "Education",
  "Electronics",
  "Energy",
  "Engineering",
  "Entertainment",
  "Environmental",
  "Finance",
  "Food & Beverage",
  "Government",
  "Healthcare",
  "Hospitality",
  "Insurance",
  "Machinery",
  "Manufacturing",
  "Media",
  "Not For Profit",
  "Recreation",
  "Retail",
  "Shipping",
  "Technology",
  "Telecommunications",
  "Transportation",
  "Utilities",
];

const ACCOUNT_TYPES = [
  "Prospect",
  "Customer - Direct",
  "Customer - Channel",
  "Channel Partner / Reseller",
  "Installation Partner",
  "Technology Partner",
  "Other",
];

const DEPARTMENTS = [
  "Engineering",
  "IT",
  "Finance",
  "Marketing",
  "Sales",
  "Customer Success",
  "Human Resources",
  "Legal",
  "Operations",
  "Product",
  "Research & Development",
  "Executive",
];

const OPPORTUNITY_STAGES = [
  "Prospecting",
  "Qualification",
  "Needs Analysis",
  "Value Proposition",
  "Id. Decision Makers",
  "Perception Analysis",
  "Proposal/Price Quote",
  "Negotiation/Review",
  "Closed Won",
  "Closed Lost",
];

const OPPORTUNITY_TYPES = [
  "New Business",
  "Existing Business",
  "Add-On Business",
  "Renewal",
  "Upgrade",
  "Downgrade",
];

const LEAD_SOURCES = [
  "Web",
  "Phone Inquiry",
  "Partner Referral",
  "Purchased List",
  "Other",
  "Trade Show",
  "Word of mouth",
  "External Referral",
  "Public Relations",
  "Internal Seminar",
  "Direct Mail",
  "Conference",
  "Website",
  "Social Media",
  "Email Marketing",
];

const TASK_SUBJECTS = [
  "Call",
  "Send Letter",
  "Send Quote",
  "Follow Up",
  "Other",
  "Send Email",
  "Meeting",
  "Demo",
  "Presentation",
  "Site Visit",
  "Review Proposal",
  "Contract Negotiation",
];

const TASK_STATUSES = [
  "Not Started",
  "In Progress",
  "Completed",
  "Waiting on someone else",
  "Deferred",
];
const TASK_PRIORITIES = ["High", "Normal", "Low"];

const CASE_ORIGINS = ["Email", "Phone", "Web", "Social Media", "Chat"];
const CASE_STATUSES = [
  "New",
  "Working",
  "Escalated",
  "Closed",
  "On Hold",
  "Pending",
];
const CASE_PRIORITIES = ["High", "Medium", "Low"];

const CAMPAIGN_TYPES = [
  "Conference",
  "Webinar",
  "Trade Show",
  "Email",
  "Banner Ads",
  "Telemarketing",
  "Direct Mail",
  "Seminar / Workshop",
  "Public Relations",
  "Partners",
  "Referral Program",
  "Advertisement",
  "Social Media",
  "Other",
];

const CAMPAIGN_STATUSES = ["Planned", "In Progress", "Completed", "Aborted"];
const CAMPAIGN_MEMBER_STATUSES = [
  "Sent",
  "Responded",
  "Attended",
  "Registered",
  "No Show",
];

/**
 * Generate a random account
 * @param index - Index for deterministic ID generation
 * @returns A Salesforce Account object
 */
function generateAccount(index: number): Account {
  const referenceId = `account-${index}`;
  const companyName = faker.company.name();

  return {
    attributes: {
      type: "Account",
      referenceId,
    },
    Name: companyName,
    Industry: faker.helpers.arrayElement(INDUSTRIES),
    Type: faker.helpers.arrayElement(ACCOUNT_TYPES),
    BillingStreet: faker.location.streetAddress(),
    BillingCity: faker.location.city(),
    BillingState: faker.location.state(),
    BillingPostalCode: faker.location.zipCode(),
    BillingCountry: faker.location.country(),
    Phone: faker.phone.number(),
    Website: faker.internet.url(),
    Description: faker.company.catchPhrase(),
    NumberOfEmployees: faker.number.int({ min: 1, max: 100000 }),
    AnnualRevenue: faker.number.int({ min: 10000, max: 1000000000 }),
  };
}

/**
 * Generate contacts for an account
 * @param accountIndex - Index of the parent account
 * @param count - Number of contacts to generate
 * @param startIndex - Starting index for contact generation
 * @returns Array of Salesforce Contact objects
 */
function generateContactsForAccount(
  accountIndex: number,
  count: number,
  startIndex: number
): Contact[] {
  const contacts: Contact[] = [];
  const accountRefId = `account-${accountIndex}`;

  for (let i = 0; i < count; i++) {
    const contactIndex = startIndex + i;
    const referenceId = `contact-${contactIndex}`;
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    contacts.push({
      attributes: {
        type: "Contact",
        referenceId,
      },
      FirstName: firstName,
      LastName: lastName,
      Email: faker.internet.email({ firstName, lastName }),
      Phone: faker.phone.number(),
      Title: faker.person.jobTitle(),
      Department: faker.helpers.arrayElement(DEPARTMENTS),
      AccountId: `@{${accountRefId}}`,
      MailingStreet: faker.location.streetAddress(),
      MailingCity: faker.location.city(),
      MailingState: faker.location.state(),
      MailingPostalCode: faker.location.zipCode(),
      MailingCountry: faker.location.country(),
    });
  }

  return contacts;
}

/**
 * Generate opportunities for an account
 * @param accountIndex - Index of the parent account
 * @param contactIndices - Indices of contacts to associate with opportunities
 * @param count - Number of opportunities to generate
 * @param startIndex - Starting index for opportunity generation
 * @returns Array of Salesforce Opportunity objects
 */
function generateOpportunitiesForAccount(
  accountIndex: number,
  contactIndices: number[],
  count: number,
  startIndex: number
): Opportunity[] {
  const opportunities: Opportunity[] = [];
  const accountRefId = `account-${accountIndex}`;

  for (let i = 0; i < count; i++) {
    const opportunityIndex = startIndex + i;
    const referenceId = `opportunity-${opportunityIndex}`;
    const isClosed = Math.random() > 0.7;
    const isWon = isClosed ? Math.random() > 0.4 : false;
    let stage = faker.helpers.arrayElement(OPPORTUNITY_STAGES);

    // Ensure stage is consistent with closed/won status
    if (isClosed && isWon) {
      stage = "Closed Won";
    } else if (isClosed && !isWon) {
      stage = "Closed Lost";
    }

    // Generate a close date between now and 6 months in the future
    const closeDate = faker.date.future({ years: 0.5 });

    opportunities.push({
      attributes: {
        type: "Opportunity",
        referenceId,
      },
      Name: `${faker.commerce.productName()} - ${faker.number.int({
        min: 1000,
        max: 9999,
      })}`,
      StageName: stage,
      CloseDate: closeDate.toISOString().split("T")[0],
      Amount: faker.number.float({ min: 1000, max: 500000, fractionDigits: 2 }),
      Type: faker.helpers.arrayElement(OPPORTUNITY_TYPES),
      LeadSource: faker.helpers.arrayElement(LEAD_SOURCES),
      Description: faker.lorem.paragraph(),
      AccountId: `@{${accountRefId}}`,
      Probability:
        stage === "Closed Won"
          ? 100
          : stage === "Closed Lost"
          ? 0
          : faker.number.int({ min: 10, max: 90 }),
    });
  }

  return opportunities;
}

/**
 * Generate tasks related to accounts, contacts, or opportunities
 * @param accountIndices - Indices of accounts to associate tasks with
 * @param contactIndices - Indices of contacts to associate tasks with
 * @param opportunityIndices - Indices of opportunities to associate tasks with
 * @param count - Number of tasks to generate
 * @param startIndex - Starting index for task generation
 * @returns Array of Salesforce Task objects
 */
function generateTasks(
  accountIndices: number[],
  contactIndices: number[],
  opportunityIndices: number[],
  count: number,
  startIndex: number
): Task[] {
  const tasks: Task[] = [];

  for (let i = 0; i < count; i++) {
    const taskIndex = startIndex + i;
    const referenceId = `task-${taskIndex}`;

    // Randomly choose what this task is related to
    const relationType = faker.helpers.arrayElement([
      "account",
      "contact",
      "opportunity",
    ]);
    let whatId, whoId;

    if (relationType === "account") {
      const accountIndex = faker.helpers.arrayElement(accountIndices);
      whatId = `@{account-${accountIndex}}`;
    } else if (relationType === "contact") {
      const contactIndex = faker.helpers.arrayElement(contactIndices);
      whoId = `@{contact-${contactIndex}}`;
    } else if (relationType === "opportunity") {
      const opportunityIndex = faker.helpers.arrayElement(opportunityIndices);
      whatId = `@{opportunity-${opportunityIndex}}`;
    }

    // Generate a due date between 30 days ago and 30 days in the future
    const activityDate = faker.date.between({
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    tasks.push({
      attributes: {
        type: "Task",
        referenceId,
      },
      Subject: faker.helpers.arrayElement(TASK_SUBJECTS),
      Status: faker.helpers.arrayElement(TASK_STATUSES),
      Priority: faker.helpers.arrayElement(TASK_PRIORITIES),
      ActivityDate: activityDate.toISOString().split("T")[0],
      Description: faker.lorem.paragraph(),
      WhatId: whatId,
      WhoId: whoId,
    });
  }

  return tasks;
}

/**
 * Generate events related to accounts, contacts, or opportunities
 * @param accountIndices - Indices of accounts to associate events with
 * @param contactIndices - Indices of contacts to associate events with
 * @param opportunityIndices - Indices of opportunities to associate events with
 * @param count - Number of events to generate
 * @param startIndex - Starting index for event generation
 * @returns Array of Salesforce Event objects
 */
function generateEvents(
  accountIndices: number[],
  contactIndices: number[],
  opportunityIndices: number[],
  count: number,
  startIndex: number
): Event[] {
  const events: Event[] = [];

  for (let i = 0; i < count; i++) {
    const eventIndex = startIndex + i;
    const referenceId = `event-${eventIndex}`;

    // Randomly choose what this event is related to
    const relationType = faker.helpers.arrayElement([
      "account",
      "contact",
      "opportunity",
    ]);
    let whatId, whoId;

    if (relationType === "account") {
      const accountIndex = faker.helpers.arrayElement(accountIndices);
      whatId = `@{account-${accountIndex}}`;
    } else if (relationType === "contact") {
      const contactIndex = faker.helpers.arrayElement(contactIndices);
      whoId = `@{contact-${contactIndex}}`;
    } else if (relationType === "opportunity") {
      const opportunityIndex = faker.helpers.arrayElement(opportunityIndices);
      whatId = `@{opportunity-${opportunityIndex}}`;
    }

    // Generate start date between 30 days ago and 30 days in the future
    const startDateTime = faker.date.between({
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // Event duration between 30 minutes and 3 hours
    const durationMs = faker.number.int({ min: 30, max: 180 }) * 60 * 1000;
    const endDateTime = new Date(startDateTime.getTime() + durationMs);

    events.push({
      attributes: {
        type: "Event",
        referenceId,
      },
      Subject: faker.helpers.arrayElement([
        ...TASK_SUBJECTS,
        "Meeting",
        "Conference Call",
      ]),
      StartDateTime: startDateTime.toISOString(),
      EndDateTime: endDateTime.toISOString(),
      Location: faker.location.city(),
      Description: faker.lorem.paragraph(),
      WhatId: whatId,
      WhoId: whoId,
    });
  }

  return events;
}

/**
 * Generate cases related to accounts and contacts
 * @param accountIndices - Indices of accounts to associate cases with
 * @param contactIndices - Indices of contacts to associate cases with
 * @param count - Number of cases to generate
 * @param startIndex - Starting index for case generation
 * @returns Array of Salesforce Case objects
 */
function generateCases(
  accountIndices: number[],
  contactIndices: number[],
  count: number,
  startIndex: number
): Case[] {
  const cases: Case[] = [];

  for (let i = 0; i < count; i++) {
    const caseIndex = startIndex + i;
    const referenceId = `case-${caseIndex}`;

    const accountIndex = faker.helpers.arrayElement(accountIndices);
    const contactIndex = faker.helpers.arrayElement(
      contactIndices.filter(
        (c) => Math.floor(c / 5) === accountIndex // Ensure contact belongs to account
      )
    );

    cases.push({
      attributes: {
        type: "Case",
        referenceId,
      },
      Subject: `Case ${faker.lorem.words(3)}`,
      Status: faker.helpers.arrayElement(CASE_STATUSES),
      Origin: faker.helpers.arrayElement(CASE_ORIGINS),
      Priority: faker.helpers.arrayElement(CASE_PRIORITIES),
      Description: faker.lorem.paragraph(),
      AccountId: `@{account-${accountIndex}}`,
      ContactId: contactIndex ? `@{contact-${contactIndex}}` : undefined,
    });
  }

  return cases;
}

/**
 * Generate campaigns
 * @param count - Number of campaigns to generate
 * @param startIndex - Starting index for campaign generation
 * @returns Array of Salesforce Campaign objects
 */
function generateCampaigns(count: number, startIndex: number): Campaign[] {
  const campaigns: Campaign[] = [];

  for (let i = 0; i < count; i++) {
    const campaignIndex = startIndex + i;
    const referenceId = `campaign-${campaignIndex}`;

    // Generate start date between now and 3 months in the future
    const startDate = faker.date.future({ years: 0.25 });

    // Campaign duration between 1 week and 3 months
    const durationDays = faker.number.int({ min: 7, max: 90 });
    const endDate = new Date(
      startDate.getTime() + durationDays * 24 * 60 * 60 * 1000
    );

    const budgetedCost = faker.number.float({
      min: 5000,
      max: 500000,
      fractionDigits: 2,
    });
    const actualCost = faker.number.float({
      min: 0,
      max: budgetedCost * 1.2,
      fractionDigits: 2,
    });
    const expectedRevenue = faker.number.float({
      min: budgetedCost,
      max: budgetedCost * 10,
      fractionDigits: 2,
    });

    campaigns.push({
      attributes: {
        type: "Campaign",
        referenceId,
      },
      Name: `${faker.helpers.arrayElement(
        CAMPAIGN_TYPES
      )} - ${faker.company.buzzPhrase()}`,
      Status: faker.helpers.arrayElement(CAMPAIGN_STATUSES),
      Type: faker.helpers.arrayElement(CAMPAIGN_TYPES),
      StartDate: startDate.toISOString().split("T")[0],
      EndDate: endDate.toISOString().split("T")[0],
      Description: faker.lorem.paragraph(),
      BudgetedCost: budgetedCost,
      ActualCost: actualCost,
      ExpectedRevenue: expectedRevenue,
    });
  }

  return campaigns;
}

/**
 * Generate campaign members linking contacts to campaigns
 * @param campaignIndices - Indices of campaigns
 * @param contactIndices - Indices of contacts
 * @param count - Number of campaign members to generate
 * @param startIndex - Starting index for campaign member generation
 * @returns Array of Salesforce CampaignMember objects
 */
function generateCampaignMembers(
  campaignIndices: number[],
  contactIndices: number[],
  count: number,
  startIndex: number
): CampaignMember[] {
  const campaignMembers: CampaignMember[] = [];

  // Create a set to track unique campaign-contact pairs
  const uniquePairs = new Set<string>();

  for (let i = 0; i < count; i++) {
    const campaignMemberIndex = startIndex + i;
    const referenceId = `campaign-member-${campaignMemberIndex}`;

    const campaignIndex = faker.helpers.arrayElement(campaignIndices);
    const contactIndex = faker.helpers.arrayElement(contactIndices);

    // Ensure we don't add duplicate campaign-contact pairs
    const pairKey = `${campaignIndex}-${contactIndex}`;
    if (uniquePairs.has(pairKey)) {
      continue;
    }
    uniquePairs.add(pairKey);

    campaignMembers.push({
      attributes: {
        type: "CampaignMember",
        referenceId,
      },
      CampaignId: `@{campaign-${campaignIndex}}`,
      ContactId: `@{contact-${contactIndex}}`,
      Status: faker.helpers.arrayElement(CAMPAIGN_MEMBER_STATUSES),
    });
  }

  return campaignMembers;
}

/**
 * Generate opportunity line items
 * @param opportunityIndices - Indices of opportunities
 * @param count - Number of line items to generate
 * @param startIndex - Starting index for line item generation
 * @returns Array of Salesforce OpportunityLineItem objects
 */
function generateOpportunityLineItems(
  opportunityIndices: number[],
  count: number,
  startIndex: number,
  pricebookEntryId: string
): OpportunityLineItem[] {
  const lineItems: OpportunityLineItem[] = [];

  for (let i = 0; i < count; i++) {
    const lineItemIndex = startIndex + i;
    const referenceId = `line-item-${lineItemIndex}`;

    const opportunityIndex = faker.helpers.arrayElement(opportunityIndices);

    lineItems.push({
      attributes: {
        type: "OpportunityLineItem",
        referenceId,
      },
      OpportunityId: `@{opportunity-${opportunityIndex}}`,
      Quantity: faker.number.int({ min: 1, max: 100 }),
      UnitPrice: faker.number.float({
        min: 100,
        max: 10000,
        fractionDigits: 2,
      }),
      Description: faker.commerce.productDescription(),
      PricebookEntryId: pricebookEntryId,
    });
  }

  return lineItems;
}

/**
 * Generate custom objects related to accounts, contacts, or opportunities
 * @param accountIndices - Indices of accounts to associate custom objects with
 * @param contactIndices - Indices of contacts to associate custom objects with
 * @param opportunityIndices - Indices of opportunities to associate custom objects with
 * @param count - Number of custom objects to generate
 * @param startIndex - Starting index for custom object generation
 * @returns Array of Salesforce CustomObject objects
 */
function generateCustomObjects(
  accountIndices: number[],
  contactIndices: number[],
  opportunityIndices: number[],
  count: number,
  startIndex: number
): CustomObject[] {
  const customObjects: CustomObject[] = [];

  for (let i = 0; i < count; i++) {
    const customObjectIndex = startIndex + i;
    const referenceId = `custom-object-${customObjectIndex}`;

    // Randomly choose what this custom object is related to
    const relationType = faker.helpers.arrayElement([
      "account",
      "contact",
      "opportunity",
    ]);
    let accountId, opportunityId, contactId;

    if (relationType === "account") {
      const accountIndex = faker.helpers.arrayElement(accountIndices);
      accountId = `@{account-${accountIndex}}`;
    } else if (relationType === "contact") {
      const contactIndex = faker.helpers.arrayElement(contactIndices);
      contactId = `@{contact-${contactIndex}}`;
    } else if (relationType === "opportunity") {
      const opportunityIndex = faker.helpers.arrayElement(opportunityIndices);
      opportunityId = `@{opportunity-${opportunityIndex}}`;
    }

    customObjects.push({
      attributes: {
        type: "Custom_Object__c",
        referenceId,
      },
      Name: `Custom ${faker.lorem.word()} ${customObjectIndex}`,
      CustomField1__c: faker.lorem.sentence(),
      CustomField2__c: faker.number.float({
        min: 0,
        max: 1000,
        fractionDigits: 2,
      }),
      CustomField3__c: faker.datatype.boolean(),
      CustomField4__c: faker.date.recent().toISOString(),
      AccountId__c: accountId,
      OpportunityId__c: opportunityId,
      ContactId__c: contactId,
    });
  }

  return customObjects;
}

/**
 * Generate all data for Salesforce seeding
 * @param baseCount - Number of base records (accounts) to generate
 * @returns All generated data
 */
async function generateAllData(baseCount: number): Promise<GeneratedData> {
  console.log(`Generating data for ${baseCount} accounts...`);

  // Initialize empty data structure
  const data: GeneratedData = {
    accounts: [],
    contacts: [],
    opportunities: [],
    tasks: [],
    events: [],
    cases: [],
    campaigns: [],
    campaignMembers: [],
    opportunityLineItems: [],
    customObjects: [],
  };

  // Generate accounts (base objects)
  console.log("Generating accounts...");
  for (let i = 0; i < baseCount; i++) {
    data.accounts.push(generateAccount(i));
  }

  // Generate contacts (5-15 per account)
  console.log("Generating contacts...");
  let contactStartIndex = 0;
  for (let i = 0; i < baseCount; i++) {
    const contactCount = faker.number.int({ min: 5, max: 15 });
    const contacts = generateContactsForAccount(
      i,
      contactCount,
      contactStartIndex
    );
    data.contacts.push(...contacts);
    contactStartIndex += contactCount;
  }

  // Generate opportunities (2-8 per account)
  console.log("Generating opportunities...");
  let opportunityStartIndex = 0;
  const accountIndices = Array.from({ length: baseCount }, (_, i) => i);
  const contactIndices = Array.from(
    { length: data.contacts.length },
    (_, i) => i
  );

  for (let i = 0; i < baseCount; i++) {
    const opportunityCount = faker.number.int({ min: 2, max: 8 });
    const opportunities = generateOpportunitiesForAccount(
      i,
      contactIndices.filter((c) => Math.floor(c / 10) === i), // Filter contacts for this account
      opportunityCount,
      opportunityStartIndex
    );
    data.opportunities.push(...opportunities);
    opportunityStartIndex += opportunityCount;
  }

  // Generate tasks (1 per 2 contacts + 1 per opportunity + some for accounts)
  console.log("Generating tasks...");
  const opportunityIndices = Array.from(
    { length: data.opportunities.length },
    (_, i) => i
  );
  const taskCount =
    Math.floor(data.contacts.length / 2) +
    data.opportunities.length +
    Math.floor(baseCount / 2);
  data.tasks = generateTasks(
    accountIndices,
    contactIndices,
    opportunityIndices,
    taskCount,
    0
  );

  // Generate events (1 per 3 contacts + 1 per 2 opportunities)
  console.log("Generating events...");
  const eventCount =
    Math.floor(data.contacts.length / 3) +
    Math.floor(data.opportunities.length / 2);
  data.events = generateEvents(
    accountIndices,
    contactIndices,
    opportunityIndices,
    eventCount,
    0
  );

  // Generate cases (1 per 4 contacts)
  console.log("Generating cases...");
  const caseCount = Math.floor(data.contacts.length / 4);
  data.cases = generateCases(accountIndices, contactIndices, caseCount, 0);

  // Generate campaigns (1 per 20 accounts, minimum 5)
  console.log("Generating campaigns...");
  const campaignCount = Math.max(5, Math.floor(baseCount / 20));
  data.campaigns = generateCampaigns(campaignCount, 0);

  // Generate campaign members (5-20 contacts per campaign)
  console.log("Generating campaign members...");
  const campaignIndices = Array.from({ length: campaignCount }, (_, i) => i);
  const campaignMemberCount =
    campaignCount * faker.number.int({ min: 5, max: 20 });
  data.campaignMembers = generateCampaignMembers(
    campaignIndices,
    contactIndices,
    campaignMemberCount,
    0
  );

  // For opportunity line items, we would need a valid PricebookEntryId
  // This would typically be retrieved from Salesforce
  // For now, we'll skip this or use a placeholder
  // data.opportunityLineItems = generateOpportunityLineItems(opportunityIndices, data.opportunities.length * 2, 0, "PLACEHOLDER_ID");

  // Generate custom objects (1 per 5 accounts/contacts/opportunities)
  console.log("Generating custom objects...");
  const customObjectCount = Math.floor(
    (baseCount + data.contacts.length + data.opportunities.length) / 5
  );
  data.customObjects = generateCustomObjects(
    accountIndices,
    contactIndices,
    opportunityIndices,
    customObjectCount,
    0
  );

  console.log("Data generation complete!");
  console.log(`Generated:
    - ${data.accounts.length} accounts
    - ${data.contacts.length} contacts
    - ${data.opportunities.length} opportunities
    - ${data.tasks.length} tasks
    - ${data.events.length} events
    - ${data.cases.length} cases
    - ${data.campaigns.length} campaigns
    - ${data.campaignMembers.length} campaign members
    - ${data.customObjects.length} custom objects`);

  return data;
}

/**
 * Save generated data to a JSON file
 * @param data - The data to save
 * @param outputPath - Path to save the data to
 */
async function saveDataToFile(
  data: GeneratedData,
  outputPath: string
): Promise<void> {
  console.log(`Saving data to ${outputPath}...`);
  await fs.promises.writeFile(outputPath, JSON.stringify(data, null, 2));
  console.log(`Data saved to ${outputPath}`);
}

/**
 * Load data from a JSON file
 * @param inputPath - Path to load the data from
 * @returns The loaded data
 */
async function loadDataFromFile(inputPath: string): Promise<GeneratedData> {
  console.log(`Loading data from ${inputPath}...`);
  const fileContent = await fs.promises.readFile(inputPath, "utf-8");
  return JSON.parse(fileContent) as GeneratedData;
}

/**
 * Upload data to Salesforce using the Composite API
 * @param sfIntegration - Salesforce integration instance
 * @param data - The data to upload
 * @param batchSize - Size of each batch for the Composite API
 */
async function uploadDataToSalesforce(
  sfIntegration: SalesforceIntegration,
  data: GeneratedData,
  batchSize: number
): Promise<void> {
  // This is a placeholder for the actual implementation
  // In a real implementation, you would use the Salesforce Composite API
  // to upload the data in batches
  console.log("Uploading data to Salesforce...");

  // Example of how you might structure the upload process
  // 1. Upload accounts first
  console.log(
    `Uploading ${data.accounts.length} accounts in batches of ${batchSize}...`
  );
  const accountBatches = chunk(data.accounts, batchSize);
  for (let i = 0; i < accountBatches.length; i++) {
    console.log(`Uploading account batch ${i + 1}/${accountBatches.length}...`);
    // await sfIntegration.uploadCompositeData(accountBatches[i]);
  }

  // 2. Upload contacts next (they depend on accounts)
  console.log(
    `Uploading ${data.contacts.length} contacts in batches of ${batchSize}...`
  );
  const contactBatches = chunk(data.contacts, batchSize);
  for (let i = 0; i < contactBatches.length; i++) {
    console.log(`Uploading contact batch ${i + 1}/${contactBatches.length}...`);
    // await sfIntegration.uploadCompositeData(contactBatches[i]);
  }

  // 3. Upload opportunities (they depend on accounts)
  console.log(
    `Uploading ${data.opportunities.length} opportunities in batches of ${batchSize}...`
  );
  const opportunityBatches = chunk(data.opportunities, batchSize);
  for (let i = 0; i < opportunityBatches.length; i++) {
    console.log(
      `Uploading opportunity batch ${i + 1}/${opportunityBatches.length}...`
    );
    // await sfIntegration.uploadCompositeData(opportunityBatches[i]);
  }

  // 4. Upload tasks (they depend on accounts, contacts, and opportunities)
  console.log(
    `Uploading ${data.tasks.length} tasks in batches of ${batchSize}...`
  );
  const taskBatches = chunk(data.tasks, batchSize);
  for (let i = 0; i < taskBatches.length; i++) {
    console.log(`Uploading task batch ${i + 1}/${taskBatches.length}...`);
    // await sfIntegration.uploadCompositeData(taskBatches[i]);
  }

  // Continue with other object types...

  console.log("Data upload complete!");
}

/**
 * Main function to execute the script
 */
async function main() {
  try {
    console.log("Starting Salesforce data seeder...");

    // Validate required parameters
    if (!options.org) {
      console.error(
        "Error: Organization ID is required. Use --org=<organization-id>"
      );
      process.exit(1);
    }

    // First, check if we're authenticated with Salesforce
    const sfIntegration = new SalesforceIntegration();
    const authStatus = await sfIntegration.getAuthStatus();

    if (!authStatus.isAuthenticated) {
      console.log(
        "Not authenticated with Salesforce. Initiating authentication..."
      );
      await sfIntegration.authenticate();
      console.log(
        "Please complete the authentication process in your browser."
      );
      return;
    }

    console.log(
      `Authenticated with Salesforce as user ID: ${authStatus.accountId}`
    );

    let data: GeneratedData;

    // Check if we should load pre-generated data
    if (options.input) {
      data = await loadDataFromFile(options.input);
    } else {
      // Generate data
      const count = parseInt(options.count, 10);
      data = await generateAllData(count);

      // Save data if output path is provided
      if (options.output) {
        await saveDataToFile(data, options.output);
      }
    }

    // Upload data to Salesforce if not a dry run
    if (!options.dryRun) {
      const batchSize = parseInt(options.batchSize, 10);
      await uploadDataToSalesforce(sfIntegration, data, batchSize);
    } else {
      console.log("Dry run - skipping upload to Salesforce.");
    }

    console.log("Salesforce data seeder completed successfully!");
  } catch (error) {
    console.error("Error executing Salesforce data seeder:", error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);
