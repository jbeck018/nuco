#!/bin/bash
# Script to run Salesforce snapshots

# Default values
ORG_ID=""
BATCH_SIZE=500
INCLUDE_DELETED=false
FROM_DATE=""
ENTITY_TYPE="all"

# Display help
function show_help {
  echo "Usage: ./run-salesforce-snapshot.sh [options]"
  echo ""
  echo "Options:"
  echo "  -o, --org ORG_ID        Organization ID (required)"
  echo "  -b, --batch SIZE        Batch size (default: 500)"
  echo "  -d, --deleted           Include deleted records"
  echo "  -f, --from-date DATE    Only include records modified after DATE (YYYY-MM-DD)"
  echo "  -e, --entity TYPE       Entity type to snapshot (opportunity, contact, account, or all)"
  echo "  -h, --help              Show this help message"
  echo ""
  echo "Example:"
  echo "  ./run-salesforce-snapshot.sh --org=abc123 --entity=opportunity --batch=1000"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -o=*|--org=*)
      ORG_ID="${1#*=}"
      shift
      ;;
    -b=*|--batch=*)
      BATCH_SIZE="${1#*=}"
      shift
      ;;
    -d|--deleted)
      INCLUDE_DELETED=true
      shift
      ;;
    -f=*|--from-date=*)
      FROM_DATE="${1#*=}"
      shift
      ;;
    -e=*|--entity=*)
      ENTITY_TYPE="${1#*=}"
      shift
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      show_help
      exit 1
      ;;
  esac
done

# Check for required arguments
if [ -z "$ORG_ID" ]; then
  echo "Error: Organization ID is required"
  show_help
  exit 1
fi

# Build command arguments
ARGS="--org=$ORG_ID --batch=$BATCH_SIZE --entity=$ENTITY_TYPE"

if [ "$INCLUDE_DELETED" = true ]; then
  ARGS="$ARGS --include-deleted"
fi

if [ ! -z "$FROM_DATE" ]; then
  ARGS="$ARGS --from-date=$FROM_DATE"
fi

# Run the snapshot script
echo "Running Salesforce snapshot with arguments: $ARGS"
npx ts-node ./scripts/salesforce-snapshot-example.ts $ARGS
