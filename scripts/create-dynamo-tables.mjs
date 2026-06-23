/**
 * Creates the DynamoDB tables for Hoot-Hoot and enables TTL on sessions.
 * Run: node --env-file=.env.development.local scripts/create-dynamo-tables.mjs
 */
import {
  DynamoDBClient,
  CreateTableCommand,
  UpdateTimeToLiveCommand,
  DescribeTableCommand,
  waitUntilTableExists,
} from "@aws-sdk/client-dynamodb";
import { fromWebToken } from "@aws-sdk/credential-providers";

const region = process.env.AWS_REGION;
const client = new DynamoDBClient({
  region,
  credentials: fromWebToken({
    roleArn: process.env.AWS_ROLE_ARN,
    webIdentityToken: process.env.VERCEL_OIDC_TOKEN,
    clientConfig: { region },
  }),
});

const tables = [
  {
    TableName: "hoothoot_users",
    AttributeDefinitions: [{ AttributeName: "email", AttributeType: "S" }],
    KeySchema: [{ AttributeName: "email", KeyType: "HASH" }],
    BillingMode: "PAY_PER_REQUEST",
  },
  {
    TableName: "hoothoot_sessions",
    AttributeDefinitions: [{ AttributeName: "token", AttributeType: "S" }],
    KeySchema: [{ AttributeName: "token", KeyType: "HASH" }],
    BillingMode: "PAY_PER_REQUEST",
  },
  {
    // PK = gameId, SK = userId  → best score per user per game.
    TableName: "hoothoot_scores",
    AttributeDefinitions: [
      { AttributeName: "gameId", AttributeType: "S" },
      { AttributeName: "userId", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "gameId", KeyType: "HASH" },
      { AttributeName: "userId", KeyType: "RANGE" },
    ],
    BillingMode: "PAY_PER_REQUEST",
  },
  {
    // PK = userId, SK = createdAt (ISO) → a user's attempt history, newest last.
    TableName: "hoothoot_practice_attempts",
    AttributeDefinitions: [
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "userId", KeyType: "HASH" },
      { AttributeName: "createdAt", KeyType: "RANGE" },
    ],
    BillingMode: "PAY_PER_REQUEST",
  },
];

async function ensureTable(def) {
  try {
    await client.send(new DescribeTableCommand({ TableName: def.TableName }));
    console.log(`✓ ${def.TableName} already exists`);
  } catch (err) {
    if (err.name !== "ResourceNotFoundException") throw err;
    await client.send(new CreateTableCommand(def));
    await waitUntilTableExists({ client, maxWaitTime: 120 }, { TableName: def.TableName });
    console.log(`✓ created ${def.TableName}`);
  }
}

async function main() {
  for (const def of tables) {
    await ensureTable(def);
  }
  // Enable TTL on sessions so expired sessions auto-delete.
  try {
    await client.send(
      new UpdateTimeToLiveCommand({
        TableName: "hoothoot_sessions",
        TimeToLiveSpecification: { Enabled: true, AttributeName: "expiresAt" },
      })
    );
    console.log("✓ TTL enabled on hoothoot_sessions.expiresAt");
  } catch (err) {
    if (err.name === "ValidationException") {
      console.log("• TTL already enabled on hoothoot_sessions");
    } else {
      throw err;
    }
  }
  console.log("\nAll DynamoDB tables ready.");
}

main().catch((e) => {
  console.error("FAILED:", e.name, e.message);
  process.exit(1);
});
