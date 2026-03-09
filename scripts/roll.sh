#!/bin/bash
# Coin flip or die roll
# Usage: roll.sh [coin|dN]  (default: coin)
# Examples: roll.sh coin, roll.sh d6, roll.sh d20

set -eo pipefail

MODE=${1:-coin}

if [[ "$MODE" == "coin" ]]; then
  RESULT=$((RANDOM % 2))
  if [[ $RESULT -eq 0 ]]; then
    echo "Coin flip: HEADS"
  else
    echo "Coin flip: TAILS"
  fi
elif [[ "$MODE" =~ ^d([0-9]+)$ ]]; then
  SIDES=${BASH_REMATCH[1]}
  RESULT=$(( (RANDOM % SIDES) + 1 ))
  echo "d$SIDES roll: $RESULT"
else
  echo "Usage: roll.sh [coin|dN]" >&2
  echo "Examples: roll.sh coin, roll.sh d6, roll.sh d20" >&2
  exit 1
fi
